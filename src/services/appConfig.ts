import type { FitConfig } from '../components/frog/fit-schema';
import { normalizeFit, validateFit } from '../components/frog/fit-schema.js';
import { fitStore } from '../components/frog/fitStore';
import { PROJECT_FIT } from '../components/frog/layout';
import { withSession } from './account';
import { backend } from './backend';
import type { RemoteConfig } from './types';

/**
 * Ajustes de complementos publicados por un administrador desde el probador
 * (Supabase, tabla app_config, clave «accessory-fit»). Si existen y son válidos, mandan
 * sobre los del proyecto (src/components/frog/accessory-fit.json) sin tener que desplegar.
 * Se guardan en este dispositivo para verse igual sin conexión.
 */
export const FIT_KEY = 'accessory-fit';
const CACHE = 'croac:fit-remote';

function apply(r: RemoteConfig | null): boolean {
  if (!r) return false;
  const v = validateFit(r.value);
  if (!v.ok) {
    console.warn('[croac] Ajustes publicados no válidos, se usan los del proyecto:', v.errors);
    return false;
  }
  fitStore.set({ fit: v.value, source: 'remote', updatedAt: r.updatedAt });
  return true;
}

function cache(r: RemoteConfig | null) {
  try {
    if (r) localStorage.setItem(CACHE, JSON.stringify(r));
    else localStorage.removeItem(CACHE);
  } catch { /* sin almacenamiento */ }
}

function resetToProject() {
  fitStore.set({ fit: PROJECT_FIT, source: 'project' });
}

/** Al arrancar: primero lo guardado en el dispositivo y luego lo del servidor. */
export async function loadRemoteFit() {
  try {
    apply(JSON.parse(localStorage.getItem(CACHE) ?? 'null'));
  } catch { /* nada */ }
  if (!backend.enabled) return;
  try {
    const r = await backend.getConfig(FIT_KEY);
    if (r && apply(r)) cache(r);
    else {
      cache(null);
      resetToProject();
    }
  } catch {
    // Sin conexión o sin la tabla todavía: se queda lo que hubiera.
  }
}

/** Solo administradores (lo comprueba la base de datos). */
export async function publishFit(fit: FitConfig): Promise<RemoteConfig> {
  const r = await withSession((s) => backend.setConfig(s, FIT_KEY, normalizeFit(fit)));
  if (apply(r)) cache(r);
  return r;
}

export async function unpublishFit() {
  await withSession((s) => backend.deleteConfig(s, FIT_KEY));
  cache(null);
  resetToProject();
}
