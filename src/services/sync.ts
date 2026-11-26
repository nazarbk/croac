/**
 * Sincronización entre dispositivos y publicación del perfil.
 *
 * - El estado completo se guarda en la tabla user_state (una fila por usuario).
 * - Nunca se pisa a ciegas: si la nube cambió desde la última vez, se FUSIONA con lo de este
 *   dispositivo (services/merge.ts) y se sube el resultado. La subida es condicional (solo si la
 *   nube sigue en la versión que conocemos), así dos dispositivos no se borran cosas entre sí.
 * - El cierre del día (penalizaciones) espera a la primera sincronización (`ready`), para no
 *   penalizar con datos viejos de un dispositivo que llevaba días sin abrirse.
 * - Antes de cambiar los datos de este dispositivo por los de la nube se guarda una copia local
 *   (services/backups.ts), y el servidor guarda versiones anteriores (user_state_versions).
 * - La primera vez que entras en un dispositivo con datos en ambos lados, se pregunta.
 */
import { useEffect } from 'react';
import { migrate } from '../store/persistence';
import { appStore } from '../store/appStore';
import { createStore, useStore } from '../store/createStore';
import type { AppState } from '../domain/types';
import { accountStore, statsFrom, withSession } from './account';
import { backend } from './backend';
import { saveLocalBackup } from './backups';
import { mergeStates, removedIds, revivedIds, sameData, withTombstones } from './merge';
import { ApiError, type RemoteState } from './types';

const META_KEY = 'croac:sync';
const PUSH_DELAY = 2500;
const PROFILE_DELAY = 4000;
const POLL_EVERY = 60_000;
/** Si la nube no responde en este tiempo (sin conexión), el día se cierra igualmente. */
const READY_TIMEOUT = 6000;

interface SyncMeta {
  /** updated_at de la última versión que tenemos igual que el servidor. */
  lastSyncedAt: string | null;
  /** Hay cambios locales sin subir. */
  dirty: boolean;
  /** Usuario al que pertenece lastSyncedAt (si cambia de cuenta, se reinicia). */
  userId: string | null;
}

export type SyncStatus = 'off' | 'idle' | 'syncing' | 'error' | 'conflict';

interface SyncState {
  status: SyncStatus;
  lastSyncedAt: string | null;
  /** Datos de la nube pendientes de decidir (primera vez en este dispositivo). */
  conflict: RemoteState | null;
  /** Ya se ha intentado la primera sincronización (o no hace falta): se puede cerrar el día. */
  ready: boolean;
}

export const syncStore = createStore<SyncState>({ status: 'off', lastSyncedAt: null, conflict: null, ready: !backend.enabled });
export const useSync = () => useStore(syncStore, (s) => s);
export const useSyncReady = () => useStore(syncStore, (s) => s.ready);
const markReady = () => { if (!syncStore.get().ready) syncStore.set((s) => ({ ...s, ready: true })); };

function loadMeta(): SyncMeta {
  try {
    return { lastSyncedAt: null, dirty: false, userId: null, ...JSON.parse(localStorage.getItem(META_KEY) ?? '{}') };
  } catch {
    return { lastSyncedAt: null, dirty: false, userId: null };
  }
}

let meta = loadMeta();
function saveMeta(p: Partial<SyncMeta>) {
  meta = { ...meta, ...p };
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    /* ignorar */
  }
  syncStore.set((s) => ({ ...s, lastSyncedAt: meta.lastSyncedAt }));
}

const setStatus = (status: SyncStatus) => syncStore.set((s) => (s.status === status ? s : { ...s, status }));

let applyingRemote = false;
/** Sube con cada cambio local: para no marcar «sin cambios» si algo cambió durante una subida. */
let changeSeq = 0;
let pushTimer: ReturnType<typeof setTimeout> | undefined;
let profileTimer: ReturnType<typeof setTimeout> | undefined;
let lastProfileJson = '';
/** Evita dos sincronizaciones a la vez (el sondeo, volver a la pestaña, un cambio…). */
let running: Promise<void> | null = null;
const exclusive = (fn: () => Promise<void>) => {
  const next = (running ?? Promise.resolve()).then(fn, fn);
  running = next.finally(() => { if (running === next) running = null; });
  return next;
};

const loggedIn = () => !!accountStore.get().session;
const hasLocalData = () => {
  const s = appStore.get();
  return s.tasks.length > 0 || s.history.length > 0;
};
const isTime = (a: string | null, b: string | null) => !!a && !!b && Date.parse(a) === Date.parse(b);

function setLocal(next: AppState, reason: string) {
  const current = appStore.get();
  if (sameData(current, next)) return;
  saveLocalBackup(current, reason);
  applyingRemote = true;
  appStore.set(next);
  applyingRemote = false;
}

/** Combina la nube con lo de este dispositivo y lo deja aplicado aquí. Devuelve si hay que subirlo. */
function absorb(remote: RemoteState): boolean {
  const theirs = migrate(remote.state);
  if (!theirs) return false;
  const merged = mergeStates(appStore.get(), theirs, { localDirty: meta.dirty });
  setLocal(merged, 'Antes de combinar con la nube');
  const needsPush = !sameData(merged, theirs);
  saveMeta({ lastSyncedAt: remote.updatedAt, dirty: needsPush });
  return needsPush;
}

async function pushInner(): Promise<void> {
  if (!loggedIn()) return;
  clearTimeout(pushTimer);
  setStatus('syncing');
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      const seq = changeSeq;
      const at = new Date().toISOString();
      try {
        await withSession((s) => backend.pushState(s, appStore.get(), at, meta.lastSyncedAt));
        saveMeta({ lastSyncedAt: at, dirty: changeSeq !== seq });
        setStatus('idle');
        return;
      } catch (e) {
        if (!(e instanceof ApiError && e.code === 'sync_conflict')) throw e;
        // Otro dispositivo subió algo: se trae, se combina y se vuelve a intentar.
        const remote = await withSession((s) => backend.pullState(s));
        if (!remote) { saveMeta({ lastSyncedAt: null }); continue; }
        if (!absorb(remote)) { setStatus('idle'); return; }
      }
    }
    setStatus('error');
  } catch {
    setStatus('error');
  }
}

export const pushNow = () => exclusive(pushInner);

/** Trae la versión de la nube y, si cambió, la combina con la de este dispositivo. */
export function pullNow() {
  return exclusive(async () => {
    if (!loggedIn() || syncStore.get().conflict) return;
    const userId = accountStore.get().session!.userId;
    if (meta.userId !== userId) saveMeta({ userId, lastSyncedAt: null });
    setStatus('syncing');
    try {
      const remote = await withSession((s) => backend.pullState(s));
      if (!remote) {
        markReady();
        await pushInner(); // primera vez: subimos lo de este dispositivo
        return;
      }
      if (!meta.lastSyncedAt) {
        // Primera vez en este dispositivo.
        if (hasLocalData()) {
          syncStore.set((s) => ({ ...s, conflict: remote, status: 'conflict' }));
          return;
        }
        const theirs = migrate(remote.state);
        if (theirs) setLocal(theirs, 'Antes de usar los datos de la cuenta');
        saveMeta({ lastSyncedAt: remote.updatedAt, dirty: false });
      } else if (!isTime(remote.updatedAt, meta.lastSyncedAt)) {
        if (absorb(remote)) await pushInner();
      } else if (meta.dirty) {
        await pushInner();
      }
      setStatus('idle');
    } catch {
      setStatus('error');
    } finally {
      if (!syncStore.get().conflict) markReady();
    }
  });
}

/** Resolver la primera sincronización: combinar (recomendado), conservar la nube o este dispositivo. */
export async function resolveConflict(keep: 'merge' | 'cloud' | 'device') {
  const remote = syncStore.get().conflict;
  syncStore.set((s) => ({ ...s, conflict: null }));
  if (remote && keep === 'cloud') {
    const theirs = migrate(remote.state);
    if (theirs) setLocal(theirs, 'Antes de usar los datos de la cuenta');
    saveMeta({ lastSyncedAt: remote.updatedAt, dirty: false });
    setStatus('idle');
  } else if (remote && keep === 'merge') {
    saveMeta({ dirty: true });
    if (absorb(remote)) await pushNow();
    setStatus('idle');
  } else {
    // Este dispositivo manda: se sube por encima de la versión que había en la nube.
    if (remote) saveMeta({ lastSyncedAt: remote.updatedAt });
    await pushNow();
  }
  markReady();
}

function schedulePush() {
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => void pushNow(), PUSH_DELAY);
}

async function publishProfile() {
  const { session, profile } = accountStore.get();
  if (!session || !profile) return;
  const stats = statsFrom(appStore.get());
  const json = JSON.stringify(stats);
  if (json === lastProfileJson) return;
  try {
    await withSession((s) => backend.updateProfile(s, stats));
    lastProfileJson = json;
    accountStore.set((a) => (a.profile ? { ...a, profile: { ...a.profile, ...stats } } : a));
  } catch {
    /* se reintentará en el siguiente cambio */
  }
}

/** Arranca la sincronización (una vez, en App). */
export function useCloudSync() {
  useEffect(() => {
    if (!backend.enabled) return;

    // Recuerda lo que se borra para que otro dispositivo no lo resucite al combinar.
    let prev = appStore.get();
    let marking = false;
    const unsubState = appStore.subscribe(() => {
      const next = appStore.get();
      const before = prev;
      prev = next;
      if (applyingRemote || marking) return;
      const gone = removedIds(before, next);
      const back = revivedIds(next);
      if (gone.length || back.length) {
        marking = true;
        appStore.set(withTombstones(next, gone, back, Date.now()));
        prev = appStore.get();
        marking = false;
      }
      changeSeq++;
      if (!meta.dirty) saveMeta({ dirty: true });
      if (!loggedIn() || syncStore.get().conflict) return;
      schedulePush();
      clearTimeout(profileTimer);
      profileTimer = setTimeout(() => void publishProfile(), PROFILE_DELAY);
    });

    let wasLogged = loggedIn();
    const unsubAccount = accountStore.subscribe(() => {
      const now = loggedIn();
      if (now && !wasLogged) void pullNow().then(publishProfile);
      if (!now && wasLogged) {
        saveMeta({ lastSyncedAt: null, userId: null, dirty: false });
        setStatus('off');
      }
      if (now && accountStore.get().profile && !lastProfileJson) void publishProfile();
      wasLogged = now;
    });

    if (loggedIn()) void pullNow().then(publishProfile);
    else setStatus('off');
    // Sin sesión no hay nada que esperar; con sesión, como mucho READY_TIMEOUT (sin conexión).
    if (!loggedIn()) markReady();
    const readyTimer = setTimeout(markReady, READY_TIMEOUT);

    const onVisible = () => document.visibilityState === 'visible' && void pullNow();
    document.addEventListener('visibilitychange', onVisible);
    const poll = setInterval(() => document.visibilityState === 'visible' && void pullNow(), POLL_EVERY);
    const onHide = () => { if (meta.dirty && loggedIn()) void pushNow(); };
    window.addEventListener('pagehide', onHide);

    return () => {
      unsubState();
      unsubAccount();
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pagehide', onHide);
      clearInterval(poll);
      clearTimeout(readyTimer);
    };
  }, []);
}

/* ---------- Copias de seguridad ---------- */

export interface RestoreResult {
  completed: number;
  xp: number;
  coins: number;
  items: number;
}

/** Recupera una copia COMBINÁNDOLA con lo actual: vuelve lo que falta y no se borra nada. */
export async function restoreBackup(raw: unknown): Promise<RestoreResult | null> {
  const backup = migrate(raw);
  if (!backup) return null;
  const current = appStore.get();
  // Las marcas de borrado de la copia no cuentan: lo que hay ahora se queda.
  const clean = { ...backup, meta: { ...backup.meta, removed: {} } };
  const merged = mergeStates(clean, current, { localDirty: false });
  const done = (s: AppState) => s.history.filter((h) => h.type === 'complete').length;
  const result = {
    completed: done(merged) - done(current),
    xp: merged.frog.xp - current.frog.xp,
    coins: merged.frog.coins - current.frog.coins,
    items: merged.frog.owned.length - current.frog.owned.length,
  };
  if (!sameData(merged, current)) {
    saveLocalBackup(current, 'Antes de recuperar una copia');
    applyingRemote = true;
    appStore.set(merged);
    applyingRemote = false;
    changeSeq++;
    saveMeta({ dirty: true });
    if (loggedIn()) await pushNow();
  }
  return result;
}

export const cloudBackups = {
  list: () => withSession((s) => backend.listStateVersions(s)),
  get: (id: number) => withSession((s) => backend.getStateVersion(s, id)),
};
