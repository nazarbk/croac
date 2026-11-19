/**
 * Implementación del backend con Supabase usando su API REST directamente
 * (Auth + PostgREST), sin SDK. Configuración en .env:
 *   VITE_SUPABASE_URL=https://xxxx.supabase.co
 *   VITE_SUPABASE_ANON_KEY=sb_publishable_...   (o la clave «anon» antigua, eyJ...)
 * El esquema de la base de datos está en supabase/schema.sql.
 */
import { ApiError, type Backend, type Friendship, type Profile, type RemoteState, type Session } from './types';

const URL_ = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';
const KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? '';

interface AuthResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  user?: { id: string; email?: string };
  id?: string;
}

async function call<T>(path: string, init: RequestInit & { token?: string; prefer?: string } = {}): Promise<T> {
  const headers: Record<string, string> = { apikey: KEY, 'Content-Type': 'application/json' };
  if (init.token) headers.Authorization = `Bearer ${init.token}`;
  if (init.prefer) headers.Prefer = init.prefer;
  let res: Response;
  try {
    res = await fetch(`${URL_}${path}`, { ...init, headers: { ...headers, ...(init.headers as Record<string, string>) } });
  } catch {
    throw new ApiError('network', 'Sin conexión', 0);
  }
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // Respuesta que no es JSON (URL mal configurada, página de error del proxy…).
    if (!res.ok) throw new ApiError(res.status === 404 ? 'misconfigured' : 'server', `Error ${res.status}`, res.status);
  }
  if (!res.ok) throw toApiError(res.status, body as Record<string, string> | null);
  return body as T;
}

function toApiError(status: number, body: Record<string, string> | null): ApiError {
  const raw = `${body?.error_code ?? ''} ${body?.code ?? ''} ${body?.msg ?? ''} ${body?.message ?? ''} ${body?.error_description ?? ''} ${body?.error ?? ''}`.toLowerCase();
  const msg = body?.msg ?? body?.message ?? body?.error_description ?? 'Error del servidor';
  if (raw.includes('invalid_credentials') || raw.includes('invalid login')) return new ApiError('invalid_credentials', msg, status);
  if (raw.includes('rate_limit') || raw.includes('rate limit') || status === 429) return new ApiError('rate_limit', msg, status);
  if (raw.includes('email_address_invalid') || raw.includes('validation_failed') || raw.includes('unable to validate email')) return new ApiError('invalid_email', msg, status);
  if (raw.includes('signup_disabled') || raw.includes('signups not allowed')) return new ApiError('signup_disabled', msg, status);
  if (raw.includes('same_password')) return new ApiError('same_password', msg, status);
  if (raw.includes('pgrst202') || raw.includes('could not find the function') || raw.includes('pgrst205') || raw.includes('42p01') || raw.includes('could not find the table')) return new ApiError('schema_missing', msg, status);
  if (raw.includes('invalid api key') || raw.includes('no api key')) return new ApiError('misconfigured', msg, status);
  if (raw.includes('already') && raw.includes('regist')) return new ApiError('user_already_exists', msg, status);
  if (raw.includes('user_already_exists')) return new ApiError('user_already_exists', msg, status);
  if (raw.includes('weak_password') || raw.includes('at least 6')) return new ApiError('weak_password', msg, status);
  if (raw.includes('email_not_confirmed') || raw.includes('not confirmed')) return new ApiError('email_not_confirmed', msg, status);
  if (raw.includes('23505') || raw.includes('duplicate key')) return new ApiError('username_taken', msg, status);
  if (raw.includes('not_found')) return new ApiError('not_found', msg, status);
  if (raw.includes(' self')) return new ApiError('self', msg, status);
  if (status === 401 || raw.includes('jwt expired')) return new ApiError('session_expired', msg, status);
  return new ApiError('server', msg, status);
}

function toSession(r: AuthResponse): Session {
  if (!r.access_token || !r.refresh_token || !r.user) throw new ApiError('server', 'Respuesta de sesión incompleta');
  return {
    accessToken: r.access_token,
    refreshToken: r.refresh_token,
    expiresAt: Date.now() + (r.expires_in ?? 3600) * 1000,
    userId: r.user.id,
    email: r.user.email ?? '',
  };
}

/** Lee los datos de un token de acceso (JWT) sin verificarlo: solo para rellenar la sesión. */
function decodeJwt(token: string): { sub?: string; email?: string; exp?: number } {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(part.padEnd(part.length + ((4 - (part.length % 4)) % 4), '='));
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
  } catch {
    return {};
  }
}

const redirect = (to: string) => (to ? `?redirect_to=${encodeURIComponent(to)}` : '');

export const backend: Backend = {
  enabled: Boolean(URL_ && KEY),

  sessionFromTokens(accessToken, refreshToken, expiresIn) {
    const p = decodeJwt(accessToken);
    if (!p.sub) return null;
    return {
      accessToken,
      refreshToken,
      expiresAt: p.exp ? p.exp * 1000 : Date.now() + (expiresIn ?? 3600) * 1000,
      userId: p.sub,
      email: p.email ?? '',
    };
  },

  async signUp(email, password, redirectTo) {
    const r = await call<AuthResponse>(`/auth/v1/signup${redirect(redirectTo)}`, { method: 'POST', body: JSON.stringify({ email, password }) });
    // Con «Confirm email» activado no hay sesión hasta confirmar el correo.
    return r.access_token ? toSession(r) : null;
  },

  async signIn(email, password) {
    return toSession(await call<AuthResponse>('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email, password }) }));
  },

  async refresh(refreshToken) {
    return toSession(await call<AuthResponse>('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: JSON.stringify({ refresh_token: refreshToken }) }));
  },

  async recover(email, redirectTo) {
    await call(`/auth/v1/recover${redirect(redirectTo)}`, { method: 'POST', body: JSON.stringify({ email }) });
  },

  async updatePassword(s, password) {
    await call('/auth/v1/user', { method: 'PUT', token: s.accessToken, body: JSON.stringify({ password }) });
  },

  async usernameAvailable(name) {
    return call<boolean>('/rest/v1/rpc/username_available', { method: 'POST', body: JSON.stringify({ name }) });
  },

  async deleteAccount(s) {
    await call('/rest/v1/rpc/delete_my_account', { method: 'POST', token: s.accessToken, body: '{}' });
  },

  async signOut(s) {
    await call('/auth/v1/logout', { method: 'POST', token: s.accessToken }).catch(() => undefined);
  },

  async getProfile(s, id) {
    const rows = await call<Profile[]>(`/rest/v1/profiles?id=eq.${id}&select=*`, { token: s.accessToken });
    return rows[0] ?? null;
  },

  async createProfile(s, username, stats) {
    const rows = await call<Profile[]>('/rest/v1/profiles', {
      method: 'POST', token: s.accessToken, prefer: 'return=representation',
      body: JSON.stringify({ id: s.userId, username, ...stats }),
    });
    return rows[0];
  },

  async updateProfile(s, patch) {
    await call(`/rest/v1/profiles?id=eq.${s.userId}`, {
      method: 'PATCH', token: s.accessToken, body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
    });
  },

  async listFriendships(s) {
    return call<Friendship[]>('/rest/v1/friendships?select=*', { token: s.accessToken });
  },

  async getProfiles(s, ids) {
    if (!ids.length) return [];
    return call<Profile[]>(`/rest/v1/profiles?id=in.(${ids.join(',')})&select=*`, { token: s.accessToken });
  },

  async sendFriendRequest(s, code) {
    const r = await call<{ status: 'pending' | 'accepted' }>('/rest/v1/rpc/send_friend_request', {
      method: 'POST', token: s.accessToken, body: JSON.stringify({ code }),
    });
    return r.status;
  },

  async acceptFriend(s, requesterId) {
    await call(`/rest/v1/friendships?requester=eq.${requesterId}&addressee=eq.${s.userId}`, {
      method: 'PATCH', token: s.accessToken, body: JSON.stringify({ status: 'accepted' }),
    });
  },

  async removeFriendship(s, otherId) {
    const me = s.userId;
    await call(`/rest/v1/friendships?or=(and(requester.eq.${me},addressee.eq.${otherId}),and(requester.eq.${otherId},addressee.eq.${me}))`, {
      method: 'DELETE', token: s.accessToken,
    });
  },

  async pullState(s): Promise<RemoteState | null> {
    const rows = await call<{ state: unknown; updated_at: string }[]>(`/rest/v1/user_state?user_id=eq.${s.userId}&select=state,updated_at`, { token: s.accessToken });
    return rows[0] ? { state: rows[0].state, updatedAt: rows[0].updated_at } : null;
  },

  async pushState(s, state, updatedAt) {
    await call('/rest/v1/user_state', {
      method: 'POST', token: s.accessToken, prefer: 'resolution=merge-duplicates',
      body: JSON.stringify({ user_id: s.userId, state, updated_at: updatedAt }),
    });
  },
};
