import { levelInfo } from '../domain/progression';
import { addDays, startOfWeek, type DateStr } from '../domain/dates';
import { frogMood, globalStreak } from '../domain/engine';
import type { AppState } from '../domain/types';
import { appStore, getCtx } from '../store/appStore';
import { createStore, useStore } from '../store/createStore';
import { backend } from './backend';
import { ApiError, friendlyError, type Profile, type ProfileStats, type Session } from './types';

const SESSION_KEY = 'croac:session';

interface AccountState {
  session: Session | null;
  profile: Profile | null;
  /** Hay sesión pero falta elegir nombre de usuario. */
  needsUsername: boolean;
  loading: boolean;
  /** Se ha entrado desde el enlace de «recuperar contraseña»: hay que elegir una nueva. */
  recovery: boolean;
  /** Mensaje tras volver de un enlace de correo (confirmación o error). */
  notice: { tone: 'ok' | 'error'; text: string } | null;
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
  recovery: false,
  notice: null,
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

/* ---------- Enlaces de los correos (confirmar cuenta, recuperar contraseña) ---------- */

/** Dirección a la que vuelven los enlaces de los correos: esta misma app. */
export const appUrl = () => `${location.origin}${location.pathname}`;

/**
 * Supabase devuelve al usuario a la app con los tokens en el hash
 * (#access_token=…&refresh_token=…&type=signup|recovery) o con un error
 * (#error=…&error_code=otp_expired). Se procesa antes de pintar nada.
 */
function consumeAuthRedirect() {
  if (typeof location === 'undefined' || !backend.enabled) return;
  const raw = location.hash.replace(/^#\/?/, '');
  const query = location.search.replace(/^\?/, '');
  const hasTokens = raw.includes('access_token=');
  const hasError = raw.includes('error=') || query.includes('error=');
  if (!hasTokens && !hasError) return;
  const p = new URLSearchParams(hasTokens || raw.includes('error=') ? raw : query);
  history.replaceState(null, '', `${location.pathname}#/hoy`);
  if (hasTokens) {
    const session = backend.sessionFromTokens(p.get('access_token') ?? '', p.get('refresh_token') ?? '', Number(p.get('expires_in')) || undefined);
    if (!session) return;
    saveSession(session);
    const type = p.get('type');
    accountStore.set((s) => ({
      ...s,
      session,
      recovery: type === 'recovery',
      notice: type === 'recovery' ? null : { tone: 'ok', text: '¡Correo confirmado! Ya tienes tu cuenta.' },
    }));
  } else {
    const code = p.get('error_code') ?? '';
    const text = code === 'otp_expired' ? friendlyError(new ApiError('link_expired', '')) : p.get('error_description')?.replace(/\+/g, ' ') || 'No se ha podido completar el enlace.';
    accountStore.set((s) => ({ ...s, notice: { tone: 'error', text } }));
  }
}
consumeAuthRedirect();

/* ---------- Estadísticas públicas de la rana ---------- */

export function currentWeekStart(today: DateStr): DateStr {
  return startOfWeek(today, 1);
}

export function statsFrom(state: AppState): ProfileStats {
  const { today } = getCtx();
  const week = currentWeekStart(today);
  const prev = addDays(week, -7);
  let weekXp = 0;
  let weekTasks = 0;
  let lastXp = 0;
  let lastTasks = 0;
  let total = 0;
  for (const h of state.history) {
    if (h.type === 'complete') total++;
    const gained = (h.type === 'complete' || h.type === 'bonus') && h.xp > 0 ? h.xp : 0;
    if (h.date >= week && h.date <= addDays(week, 6)) {
      if (h.type === 'complete') weekTasks++;
      weekXp += gained;
    } else if (h.date >= prev && h.date < week) {
      if (h.type === 'complete') lastTasks++;
      lastXp += gained;
    }
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
    last_week_xp: lastXp,
    last_week_tasks: lastTasks,
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
      // Comprobar el nombre antes de crear la cuenta (si el servidor tiene la función).
      try {
        if (!(await backend.usernameAvailable(username))) throw new ApiError('username_taken', 'Nombre ocupado');
      } catch (e) {
        if (e instanceof ApiError && e.code === 'username_taken') throw e;
      }
      rememberUsername(username);
      const session = await backend.signUp(email.trim(), password, appUrl());
      if (!session) return false;
      setSession(session);
      try {
        await account.createProfile(username);
      } catch (e) {
        // La cuenta ya existe: que elija otro nombre en lugar de volver a registrarse.
        set({ needsUsername: true });
        throw e;
      }
      return true;
    } finally {
      set({ loading: false });
    }
  },

  async recover(email: string) {
    set({ loading: true });
    try {
      await backend.recover(email.trim(), appUrl());
    } finally {
      set({ loading: false });
    }
  },

  async updatePassword(password: string) {
    set({ loading: true });
    try {
      await withSession((s) => backend.updatePassword(s, password));
      set({ recovery: false });
    } finally {
      set({ loading: false });
    }
  },

  /** Borra la cuenta, el perfil, las amistades y los datos en la nube. Lo local se queda. */
  async deleteAccount() {
    set({ loading: true });
    try {
      await withSession((s) => backend.deleteAccount(s));
      setSession(null);
      set({ profile: null, needsUsername: false });
    } finally {
      set({ loading: false });
    }
  },

  dismissNotice() {
    set({ notice: null });
  },

  async createProfile(username: string) {
    const p = await withSession((s) => backend.createProfile(s, username.trim().toLowerCase(), statsFrom(appStore.get())));
    forgetUsername();
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

/* El nombre elegido al registrarse se recuerda por si hay que confirmar el correo antes. */
const PENDING_NAME = 'croac:pending-username';
function rememberUsername(name: string) {
  try { localStorage.setItem(PENDING_NAME, name); } catch { /* nada */ }
}
function forgetUsername() {
  try { localStorage.removeItem(PENDING_NAME); } catch { /* nada */ }
}
export function pendingUsername(): string {
  try { return localStorage.getItem(PENDING_NAME) ?? ''; } catch { return ''; }
}
