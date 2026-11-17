import { levelInfo } from '../domain/progression';
import { addDays, startOfWeek, type DateStr } from '../domain/dates';
import { frogMood, globalStreak } from '../domain/engine';
import type { AppState } from '../domain/types';
import { appStore, getCtx } from '../store/appStore';
import { createStore, useStore } from '../store/createStore';
import { backend } from './backend';
import { ApiError, type Profile, type ProfileStats, type Session } from './types';

const SESSION_KEY = 'croac:session';

interface AccountState {
  session: Session | null;
  profile: Profile | null;
  /** Hay sesión pero falta elegir nombre de usuario. */
  needsUsername: boolean;
  loading: boolean;
}

function loadSession(): Session | null {
  try {
    const raw = JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null');
    return raw && raw.accessToken && raw.refreshToken ? raw : null;
  } catch {
    return null;
  }
}

function saveSession(s: Session | null) {
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* sin almacenamiento: la sesión dura lo que la pestaña */
  }
}

export const accountStore = createStore<AccountState>({
  session: backend.enabled ? loadSession() : null,
  profile: null,
  needsUsername: false,
  loading: false,
});

export const useAccount = () => useStore(accountStore, (s) => s);
export const cloudEnabled = backend.enabled;

const set = (p: Partial<AccountState>) => accountStore.set((s) => ({ ...s, ...p }));

function setSession(session: Session | null) {
  saveSession(session);
  set({ session });
}

/**
 * Ejecuta una llamada con una sesión válida: renueva el token si va a caducar
 * y reintenta una vez si el servidor responde 401.
 */
export async function withSession<T>(fn: (s: Session) => Promise<T>): Promise<T> {
  let s = accountStore.get().session;
  if (!s) throw new ApiError('session_expired', 'Sin sesión');
  if (s.expiresAt - Date.now() < 60_000) s = await renew(s);
  try {
    return await fn(s);
  } catch (e) {
    if (e instanceof ApiError && e.code === 'session_expired') return fn(await renew(s));
    throw e;
  }
}

let renewing: Promise<Session> | null = null;
function renew(s: Session): Promise<Session> {
  renewing ??= backend
    .refresh(s.refreshToken)
    .then((ns) => {
      setSession(ns);
      return ns;
    })
    .catch((e) => {
      // Refresh inválido: hay que volver a entrar.
      if (e instanceof ApiError && e.code !== 'network') setSession(null);
      throw e;
    })
    .finally(() => {
      renewing = null;
    });
  return renewing;
}

/* ---------- Estadísticas públicas de la rana ---------- */

export function currentWeekStart(today: DateStr): DateStr {
  return startOfWeek(today, 1);
}

export function statsFrom(state: AppState): ProfileStats {
  const { today } = getCtx();
  const week = currentWeekStart(today);
  let weekXp = 0;
  let weekTasks = 0;
  let total = 0;
  for (const h of state.history) {
    if (h.type === 'complete') total++;
    if (h.date < week || h.date > addDays(week, 6)) continue;
    if (h.type === 'complete') weekTasks++;
    if ((h.type === 'complete' || h.type === 'bonus') && h.xp > 0) weekXp += h.xp;
  }
  return {
    frog_name: state.frog.name,
    level: levelInfo(state.frog.xp).level,
    xp: state.frog.xp,
    equipped: state.frog.equipped,
    mood: frogMood(state, today),
    streak: globalStreak(state.history, today).current,
    week_start: week,
    week_xp: weekXp,
    week_tasks: weekTasks,
    total_tasks: total,
  };
}

/* ---------- Acciones ---------- */

async function loadProfile() {
  const p = await withSession((s) => backend.getProfile(s, s.userId));
  set({ profile: p, needsUsername: !p });
  return p;
}

export const account = {
  async signIn(email: string, password: string) {
    set({ loading: true });
    try {
      setSession(await backend.signIn(email.trim(), password));
      await loadProfile();
    } finally {
      set({ loading: false });
    }
  },

  /** Devuelve false si hay que confirmar el correo antes de entrar. */
  async signUp(email: string, password: string, username: string): Promise<boolean> {
    set({ loading: true });
    try {
      const session = await backend.signUp(email.trim(), password);
      if (!session) return false;
      setSession(session);
      await account.createProfile(username);
      return true;
    } finally {
      set({ loading: false });
    }
  },

  async createProfile(username: string) {
    const p = await withSession((s) => backend.createProfile(s, username.trim().toLowerCase(), statsFrom(appStore.get())));
    set({ profile: p, needsUsername: false });
  },

  async signOut() {
    const s = accountStore.get().session;
    if (s) await backend.signOut(s);
    setSession(null);
    set({ profile: null, needsUsername: false });
  },

  /** Al abrir la app con una sesión guardada. */
  async restore() {
    if (!accountStore.get().session) return;
    try {
      await loadProfile();
    } catch {
      /* sin red: se reintenta más tarde */
    }
  },

  loadProfile,
};

export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
