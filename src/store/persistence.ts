import { createInitialState, DEFAULT_LISTS, DEFAULT_SETTINGS, STATE_VERSION } from '../domain/defaults';
import type { AppState } from '../domain/types';

/**
 * Adaptador de almacenamiento. Hoy: localStorage. Mañana: una API
 * (Supabase, Firebase, backend propio) implementando la misma interfaz.
 */
export interface StorageAdapter {
  load(): unknown | null;
  save(state: AppState): void;
  clear(): void;
}

export function localStorageAdapter(key: string): StorageAdapter {
  return {
    load() {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    },
    save(state) {
      try {
        localStorage.setItem(key, JSON.stringify(state));
      } catch {
        /* almacenamiento lleno o bloqueado: la app sigue funcionando en memoria */
      }
    },
    clear() {
      try {
        localStorage.removeItem(key);
      } catch {
        /* nada que hacer */
      }
    },
  };
}

type Migration = (s: Record<string, unknown>) => Record<string, unknown>;

/** migrations[n] convierte un estado de versión n a n + 1. */
const migrations: Record<number, Migration> = {
  // 1: (s) => ({ ...s, nuevoCampo: valorPorDefecto }),
};

/** Valida y actualiza datos guardados (o importados) al formato actual. */
export function migrate(raw: unknown): AppState | null {
  if (!raw || typeof raw !== 'object') return null;
  let s = raw as Record<string, unknown>;
  let version = typeof s.version === 'number' ? s.version : 1;
  if (version > STATE_VERSION) return null;
  while (version < STATE_VERSION) {
    const step = migrations[version];
    if (step) s = step(s);
    version++;
  }
  if (!Array.isArray(s.tasks) || !Array.isArray(s.history)) return null;
  const base = createInitialState();
  const st = s as unknown as AppState;
  return {
    ...base,
    ...st,
    version: STATE_VERSION,
    lists: Array.isArray(st.lists) && st.lists.length ? st.lists : DEFAULT_LISTS,
    frog: { ...base.frog, ...st.frog },
    settings: { ...DEFAULT_SETTINGS, ...st.settings },
    meta: { ...base.meta, ...st.meta },
    notifications: Array.isArray(st.notifications) ? st.notifications : [],
  };
}
