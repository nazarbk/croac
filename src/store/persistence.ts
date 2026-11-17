import { createInitialState, DEFAULT_LISTS, DEFAULT_SETTINGS, STATE_VERSION } from '../domain/defaults';
import type { AppState } from '../domain/types';

/**
 * Adaptador de almacenamiento. Hoy: localStorage. Mañana: una API
 * (Supabase, Firebase, backend propio) implementando la misma interfaz.
 */
export interface StorageAdapter {
  load(): unknown | null;
  /** Devuelve false si no se pudo guardar (almacenamiento lleno o bloqueado). */
  save(state: AppState): boolean;
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
        return true;
      } catch {
        return false; // almacenamiento lleno o bloqueado: la app sigue en memoria
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
  const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object';
  // Descarta registros corruptos en lugar de romper la app al leerlos.
  const tasks = st.tasks
    .filter((t) => obj(t) && typeof t.id === 'string' && typeof t.title === 'string')
    .map((t) => ({
      ...t,
      tags: Array.isArray(t.tags) ? t.tags : [],
      subtasks: Array.isArray(t.subtasks) ? t.subtasks : [],
      recurrence: obj(t.recurrence) ? t.recurrence : { type: 'none' as const },
      priority: [1, 2, 3, 4].includes(t.priority) ? t.priority : 4,
      status: ['todo', 'in_progress', 'done'].includes(t.status) ? t.status : 'todo',
      order: typeof t.order === 'number' ? t.order : 0,
    }));
  const history = st.history.filter((h) => obj(h) && typeof h.id === 'string' && typeof h.date === 'string' && typeof h.xp === 'number');
  const frog = { ...base.frog, ...(obj(st.frog) ? st.frog : {}) };
  return {
    ...base,
    ...st,
    version: STATE_VERSION,
    tasks,
    history,
    lists: Array.isArray(st.lists) && st.lists.length ? st.lists.filter((l) => obj(l) && typeof l.id === 'string') : DEFAULT_LISTS,
    frog: {
      ...frog,
      xp: Math.max(0, Number(frog.xp) || 0),
      coins: Math.max(0, Number(frog.coins) || 0),
      owned: Array.isArray(frog.owned) ? frog.owned : base.frog.owned,
      equipped: obj(frog.equipped) ? frog.equipped : base.frog.equipped,
    },
    settings: { ...DEFAULT_SETTINGS, ...(obj(st.settings) ? st.settings : {}) },
    meta: { ...base.meta, ...(obj(st.meta) ? st.meta : {}), perfectDays: Array.isArray(st.meta?.perfectDays) ? st.meta.perfectDays : [] },
    notifications: Array.isArray(st.notifications) ? st.notifications : [],
  };
}
