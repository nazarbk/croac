/**
 * Sincronización entre dispositivos y publicación del perfil.
 *
 * - El estado completo se guarda en la tabla user_state (una fila por usuario).
 * - Gana la última escritura (last-write-wins). Suficiente para una persona con
 *   móvil + ordenador; para edición simultánea real habría que sincronizar por
 *   eventos (el historial ya está modelado así).
 * - La primera vez que entras en un dispositivo con datos en ambos lados, se
 *   pregunta qué conservar.
 */
import { useEffect } from 'react';
import { migrate } from '../store/persistence';
import { appStore } from '../store/appStore';
import { createStore, useStore } from '../store/createStore';
import { accountStore, statsFrom, withSession } from './account';
import { backend } from './backend';
import type { RemoteState } from './types';

const META_KEY = 'croac:sync';
const PUSH_DELAY = 2500;
const PROFILE_DELAY = 4000;
const POLL_EVERY = 60_000;

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
}

export const syncStore = createStore<SyncState>({ status: 'off', lastSyncedAt: null, conflict: null });
export const useSync = () => useStore(syncStore, (s) => s);

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
let pushTimer: ReturnType<typeof setTimeout> | undefined;
let profileTimer: ReturnType<typeof setTimeout> | undefined;
let lastProfileJson = '';

const loggedIn = () => !!accountStore.get().session;
const hasLocalData = () => {
  const s = appStore.get();
  return s.tasks.length > 0 || s.history.length > 0;
};

function applyRemote(remote: RemoteState) {
  const next = migrate(remote.state);
  if (!next) return;
  applyingRemote = true;
  appStore.set(next);
  applyingRemote = false;
  saveMeta({ lastSyncedAt: remote.updatedAt, dirty: false });
}

export async function pushNow() {
  if (!loggedIn()) return;
  clearTimeout(pushTimer);
  setStatus('syncing');
  try {
    const at = new Date().toISOString();
    await withSession((s) => backend.pushState(s, appStore.get(), at));
    saveMeta({ lastSyncedAt: at, dirty: false });
    setStatus('idle');
  } catch {
    setStatus('error');
  }
}

/** Trae la versión del servidor si es más nueva que la nuestra. */
export async function pullNow() {
  if (!loggedIn() || syncStore.get().conflict) return;
  const userId = accountStore.get().session!.userId;
  if (meta.userId !== userId) saveMeta({ userId, lastSyncedAt: null });
  setStatus('syncing');
  try {
    const remote = await withSession((s) => backend.pullState(s));
    if (!remote) {
      await pushNow(); // primera vez: subimos lo de este dispositivo
      return;
    }
    if (!meta.lastSyncedAt) {
      // Primera vez en este dispositivo.
      if (hasLocalData()) {
        syncStore.set((s) => ({ ...s, conflict: remote, status: 'conflict' }));
        return;
      }
      applyRemote(remote);
    } else if (remote.updatedAt > meta.lastSyncedAt) {
      if (meta.dirty) await pushNow(); // ambos cambiaron: gana el más reciente (este)
      else applyRemote(remote);
    } else if (meta.dirty) {
      await pushNow();
    }
    setStatus('idle');
  } catch {
    setStatus('error');
  }
}

/** Resolver la primera sincronización: conservar la nube o este dispositivo. */
export async function resolveConflict(keep: 'cloud' | 'device') {
  const remote = syncStore.get().conflict;
  syncStore.set((s) => ({ ...s, conflict: null }));
  if (keep === 'cloud' && remote) {
    applyRemote(remote);
    setStatus('idle');
  } else {
    await pushNow();
  }
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

    const unsubState = appStore.subscribe(() => {
      if (applyingRemote) return;
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
        saveMeta({ lastSyncedAt: null, userId: null });
        setStatus('off');
      }
      if (now && accountStore.get().profile && !lastProfileJson) void publishProfile();
      wasLogged = now;
    });

    if (loggedIn()) void pullNow().then(publishProfile);
    else setStatus('off');

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
    };
  }, []);
}
