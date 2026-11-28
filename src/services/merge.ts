/**
 * Fusión de dos copias del estado (este dispositivo y la nube) sin perder nada.
 *
 * Antes la sincronización era «gana la última escritura»: un dispositivo que llevaba días sin
 * abrirse podía subir su copia vieja y borrar lo hecho en otro (tareas, compras, experiencia).
 * Ahora se combinan:
 *
 * - Historial: unión por id. La experiencia y las monedas se recalculan con lo que solo tenía
 *   una de las dos copias (cada entrada guarda lo que sumó o restó).
 * - Tareas y listas: unión por id; si están en las dos, gana la modificada más tarde.
 * - Lo borrado (tareas, listas, entradas deshechas) se recuerda en `meta.removed` para que la
 *   otra copia no lo resucite.
 * - Complementos comprados: unión. Días perfectos: unión. Nivel máximo: el mayor.
 * - Penalizaciones y premios únicos por día (o por referencia) no se duplican si los dos
 *   dispositivos cerraron el mismo día.
 * - Ajustes, nombre y complementos puestos: los del dispositivo que tiene cambios sin subir.
 */
import { levelInfo } from '../domain/progression';
import type { AppNotification, AppState, HistoryEntry, StampKey, Task, TaskList } from '../domain/types';

const MAX_NOTIFICATIONS = 60;
/** Lo borrado se recuerda este tiempo; de sobra para que se sincronicen todos los dispositivos. */
const TOMBSTONE_TTL = 120 * 24 * 3600 * 1000;

export type Tombstones = Record<string, number>;

/** Ids de lo que había en `prev` y ya no está en `next` (tareas, listas e historial). */
export function removedIds(prev: AppState, next: AppState): string[] {
  const out: string[] = [];
  const diff = <T extends { id: string }>(a: T[], b: T[]) => {
    if (a === b) return;
    const ids = new Set(b.map((x) => x.id));
    for (const x of a) if (!ids.has(x.id)) out.push(x.id);
  };
  diff(prev.tasks, next.tasks);
  diff(prev.lists, next.lists);
  diff(prev.history, next.history);
  return out;
}

/** Ids que vuelven a estar (p. ej. «Deshacer» al borrar una tarea): dejan de estar borrados. */
export function revivedIds(next: AppState): string[] {
  const t = next.meta.removed;
  if (!t) return [];
  const out: string[] = [];
  for (const x of [...next.tasks, ...next.lists, ...next.history]) if (x.id in t) out.push(x.id);
  return out;
}

/** Qué preferencias cambiaron entre `prev` y `next` (complementos puestos, nombre, ajustes). */
export function changedStamps(prev: AppState, next: AppState): StampKey[] {
  const out: StampKey[] = [];
  if (prev.frog.equipped !== next.frog.equipped && JSON.stringify(prev.frog.equipped) !== JSON.stringify(next.frog.equipped)) out.push('equipped');
  if (prev.frog.name !== next.frog.name) out.push('name');
  if (prev.settings !== next.settings && JSON.stringify(prev.settings) !== JSON.stringify(next.settings)) out.push('settings');
  return out;
}

/** Apunta la hora de los cambios de preferencias. */
export function withStamps(state: AppState, keys: StampKey[], now: number): AppState {
  if (!keys.length) return state;
  const stamps = { ...(state.meta.stamps ?? {}) };
  for (const k of keys) stamps[k] = now;
  return { ...state, meta: { ...state.meta, stamps } };
}

/** Añade/quita marcas de borrado y olvida las muy antiguas. */
export function withTombstones(state: AppState, add: string[], remove: string[], now: number): AppState {
  const t: Tombstones = { ...(state.meta.removed ?? {}) };
  for (const id of add) t[id] = now;
  for (const id of remove) delete t[id];
  for (const [id, at] of Object.entries(t)) if (now - at > TOMBSTONE_TTL) delete t[id];
  return { ...state, meta: { ...state.meta, removed: t } };
}

/** Entradas que solo pueden existir una vez (aunque cada dispositivo cree la suya). */
function uniqueKey(h: HistoryEntry): string | null {
  if (h.type === 'penalty') return `penalty:${h.date}`;
  if (h.type === 'bonus' && !h.ref) return `bonus:${h.date}`; // día perfecto
  if (h.ref && h.ref !== 'patio-canvas') return `ref:${h.ref}`;
  return null;
}

const byId = <T extends { id: string }>(xs: T[]) => new Map(xs.map((x) => [x.id, x]));

/**
 * Combina `local` (este dispositivo) con `remote` (la nube). El resultado conserva el orden de
 * `remote` y añade al final lo que solo tenía `local`, así que si no hay nada nuevo es igual a
 * `remote`. `localDirty`: este dispositivo tiene cambios sin subir (gana en ajustes y similares).
 */
export function mergeStates(local: AppState, remote: AppState, opts: { localDirty: boolean; now?: number }): AppState {
  const now = opts.now ?? Date.now();
  const tomb: Tombstones = { ...(remote.meta.removed ?? {}) };
  for (const [id, at] of Object.entries(local.meta.removed ?? {})) tomb[id] = Math.max(tomb[id] ?? 0, at);
  const pref = opts.localDirty ? local : remote;
  // Para cada preferencia, gana el dispositivo que la cambió más tarde (si no se sabe, el que tiene cambios).
  const latest = (k: StampKey) => {
    const l = local.meta.stamps?.[k] ?? 0;
    const r = remote.meta.stamps?.[k] ?? 0;
    return l > r ? local : r > l ? remote : pref;
  };
  const stamps: Partial<Record<StampKey, number>> = { ...(remote.meta.stamps ?? {}) };
  for (const [k, v] of Object.entries(local.meta.stamps ?? {}) as [StampKey, number][]) stamps[k] = Math.max(stamps[k] ?? 0, v);

  /* ---------- Historial y saldo ---------- */
  const remoteIds = byId(remote.history);
  const remoteKeys = new Set(remote.history.map(uniqueKey).filter(Boolean) as string[]);
  let xp = remote.frog.xp;
  let coins = remote.frog.coins;
  const history: HistoryEntry[] = [];
  for (const h of remote.history) {
    // Deshecha en este dispositivo después de la última subida: se quita y se descuenta.
    if (tomb[h.id] !== undefined && (local.meta.removed ?? {})[h.id] !== undefined) {
      xp -= h.xp;
      coins -= h.coins;
      continue;
    }
    history.push(h);
  }
  const seenKeys = new Set(remoteKeys);
  for (const h of local.history) {
    if (remoteIds.has(h.id) || tomb[h.id] !== undefined) continue;
    const key = uniqueKey(h);
    if (key && seenKeys.has(key)) continue;
    if (key) seenKeys.add(key);
    history.push(h);
    xp += h.xp;
    coins += h.coins;
  }
  history.sort((a, b) => a.at - b.at);
  xp = Math.max(0, xp);
  coins = Math.max(0, coins);

  /* ---------- Tareas ---------- */
  const dead = (id: string, at: number) => tomb[id] !== undefined && tomb[id] >= at;
  const localTasks = byId(local.tasks);
  const tasks: Task[] = [];
  const seenTasks = new Set<string>();
  for (const r of remote.tasks) {
    const l = localTasks.get(r.id);
    const t = l && l.updatedAt > r.updatedAt ? l : r;
    seenTasks.add(r.id);
    if (!dead(t.id, t.updatedAt)) tasks.push(t);
  }
  for (const l of local.tasks) if (!seenTasks.has(l.id) && !dead(l.id, l.updatedAt)) tasks.push(l);

  /* ---------- Listas ---------- */
  const prefLists = byId(pref.lists);
  const lists: TaskList[] = [];
  const seenLists = new Set<string>();
  for (const r of remote.lists) {
    seenLists.add(r.id);
    if (!r.system && tomb[r.id] !== undefined) continue;
    lists.push(prefLists.get(r.id) ?? r);
  }
  for (const l of local.lists) if (!seenLists.has(l.id) && (l.system || tomb[l.id] === undefined)) lists.push(l);
  const listIds = new Set(lists.map((l) => l.id));
  const inbox = lists.find((l) => l.system)?.id;
  const fixedTasks = inbox ? tasks.map((t) => (listIds.has(t.listId) ? t : { ...t, listId: inbox })) : tasks;

  /* ---------- Avisos ---------- */
  const notifMap = new Map<string, AppNotification>();
  for (const n of [...remote.notifications, ...local.notifications]) {
    const prev = notifMap.get(n.id);
    notifMap.set(n.id, prev ? { ...prev, read: prev.read || n.read } : n);
  }
  const notifications = [...notifMap.values()].sort((a, b) => b.at - a.at).slice(0, MAX_NOTIFICATIONS);

  /* ---------- Rana ---------- */
  const owned = [...new Set([...remote.frog.owned, ...local.frog.owned])];
  const equipped = Object.fromEntries(Object.entries(latest('equipped').frog.equipped).filter(([, id]) => id && owned.includes(id)));

  const removed: Tombstones = {};
  for (const [id, at] of Object.entries(tomb)) if (now - at <= TOMBSTONE_TTL) removed[id] = at;

  const maxDate = (a: string | null, b: string | null) => (!a ? b : !b ? a : a > b ? a : b);
  return {
    ...remote,
    version: Math.max(local.version, remote.version),
    tasks: fixedTasks,
    lists,
    history,
    notifications,
    settings: latest('settings').settings,
    frog: {
      ...pref.frog,
      name: latest('name').frog.name,
      xp,
      coins,
      owned,
      equipped,
      bestLevel: Math.max(local.frog.bestLevel, remote.frog.bestLevel, levelInfo(xp).level),
    },
    meta: {
      ...remote.meta,
      lastRolloverDate: maxDate(local.meta.lastRolloverDate, remote.meta.lastRolloverDate),
      perfectDays: [...new Set([...remote.meta.perfectDays, ...local.meta.perfectDays])].sort(),
      onboarded: local.meta.onboarded || remote.meta.onboarded,
      createdAt: Math.min(local.meta.createdAt, remote.meta.createdAt),
      plan: local.meta.plan === 'pro' || remote.meta.plan === 'pro' ? 'pro' : remote.meta.plan,
      welcome: remote.meta.welcome ?? local.meta.welcome,
      patioCanvases: Math.max(local.meta.patioCanvases ?? 0, remote.meta.patioCanvases ?? 0) || undefined,
      removed: Object.keys(removed).length || remote.meta.removed ? removed : undefined,
      stamps: Object.keys(stamps).length ? stamps : undefined,
    },
  };
}

/** ¿Tiene `a` algo que `b` no tiene? (para saber si hay que subir el resultado de una fusión). */
export function sameData(a: AppState, b: AppState): boolean {
  return canonical(a) === canonical(b);
}

/** JSON con las claves ordenadas y sin campos vacíos (el orden de las claves no importa). */
function canonical(v: unknown): string {
  return JSON.stringify(v, (_k, x) =>
    x && typeof x === 'object' && !Array.isArray(x)
      ? Object.fromEntries(Object.entries(x as Record<string, unknown>).filter(([, y]) => y !== undefined).sort(([p], [q]) => (p < q ? -1 : 1)))
      : x,
  );
}

/** Resumen corto de una copia, para elegir cuál recuperar. */
export function summarize(state: AppState) {
  return {
    level: levelInfo(state.frog.xp).level,
    xp: state.frog.xp,
    coins: state.frog.coins,
    completed: state.history.filter((h) => h.type === 'complete').length,
    owned: state.frog.owned.length,
    lastActivity: state.history.reduce((m, h) => Math.max(m, h.at), 0),
  };
}
