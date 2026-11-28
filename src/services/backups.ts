/**
 * Copias de seguridad para recuperar datos si algo sale mal al sincronizar.
 *
 * - En este dispositivo: antes de cambiar sus datos por los de la nube (o de combinarlos) se
 *   guarda una copia local. Se conservan las 3 últimas.
 * - En la nube: el servidor guarda la versión anterior cada vez que se sobrescribe
 *   (tabla user_state_versions: una al día y otra antes de cualquier cambio que quite datos; 10 como mucho).
 *
 * Recuperar una copia nunca borra nada: se COMBINA con lo actual (vuelve lo que faltaba).
 */
import type { AppState } from '../domain/types';
import { migrate } from '../store/persistence';

const KEY = 'croac:backups';
const MAX = 3;
const MIN_GAP = 10 * 60 * 1000;

export interface LocalBackup {
  at: number;
  reason: string;
  state: AppState;
}

export function listLocalBackups(): LocalBackup[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]') as LocalBackup[];
    return raw
      .map((b) => ({ ...b, state: migrate(b.state) as AppState }))
      .filter((b) => b.state)
      .sort((a, b) => b.at - a.at);
  } catch {
    return [];
  }
}

export function saveLocalBackup(state: AppState, reason: string, now = Date.now()) {
  if (!state.history.length && !state.tasks.length) return;
  try {
    let list = listLocalBackups();
    // Varias en pocos minutos: basta con la más antigua (la de antes de empezar a cambiar).
    if (list[0] && now - list[0].at < MIN_GAP) return;
    list = [{ at: now, reason, state }, ...list].slice(0, MAX);
    // Si no cabe, se queda solo la más reciente.
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch {
      localStorage.setItem(KEY, JSON.stringify(list.slice(0, 1)));
    }
  } catch {
    /* sin espacio: no es grave, la nube también guarda versiones */
  }
}
