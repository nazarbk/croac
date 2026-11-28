/**
 * Implementación del backend con Supabase usando su API REST directamente
 * (Auth + PostgREST), sin SDK. Configuración en .env:
 *   VITE_SUPABASE_URL=https://xxxx.supabase.co
 *   VITE_SUPABASE_ANON_KEY=sb_publishable_...   (o la clave «anon» antigua, eyJ...)
 * El esquema de la base de datos está en supabase/schema.sql.
 */
import { ApiError, type Backend, type Friendship, type PatioEntry, type PatioWinner, type Profile, type RemoteConfig, type RemoteState, type Session, type StateVersion } from './types';

const clean = (v: unknown) => (typeof v === 'string' ? v.trim().replace(/^["']|["']$/g, '') : '');

/**
 * Solo el dominio del proyecto (https://xxxx.supabase.co). Si se pega la URL de la
 * API REST (…/rest/v1/) u otra ruta, se recorta: si no, Supabase responde
 * «Invalid path specified in request URL».
 */
function projectUrl(raw: string): string {
  if (!raw) return '';
  try {
    return new URL(raw.includes('://') ? raw : `https://${raw}`).origin;
  } catch {
    return raw.replace(/\/+$/, '');
  }
}

const URL_ = projectUrl(clean(import.meta.env.VITE_SUPABASE_URL));
const KEY = clean(import.meta.env.VITE_SUPABASE_ANON_KEY);

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
  if (raw.includes('invalid api key') || raw.includes('no api key') || raw.includes('invalid path specified')) return new ApiError('misconfigured', msg, status);
  if (raw.includes('already') && raw.includes('regist')) return new ApiError('user_already_exists', msg, status);
  if (raw.includes('user_already_exists')) return new ApiError('user_already_exists', msg, status);
  if (raw.includes('weak_password') || raw.includes('at least 6')) return new ApiError('weak_password', msg, status);
  if (raw.includes('email_not_confirmed') || raw.includes('not confirmed')) return new ApiError('email_not_confirmed', msg, status);
  if (raw.includes('23505') || raw.includes('duplicate key')) return new ApiError('username_taken', msg, status);
  if (raw.includes('not_found')) return new ApiError('not_found', msg, status);
  if (raw.includes(' self')) return new ApiError('self', msg, status);
  for (const c of ['patio_no_votes', 'patio_own_vote', 'patio_closed', 'patio_needs_profile', 'patio_bad_image']) {
    if (raw.includes(c)) return new ApiError(c, msg, status);
  }
  if (raw.includes('patio_entries_user_id_week_start_key') || (raw.includes('23505') && raw.includes('patio_entries'))) return new ApiError('patio_already', msg, status);
  if (raw.includes('payload too large') || raw.includes('exceeded the maximum allowed size') || status === 413) return new ApiError('patio_too_big', msg, status);
  if (raw.includes('42501') || raw.includes('row-level security') || raw.includes('permission denied')) return new ApiError('forbidden', msg, status);
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

/**
 * Columnas añadidas después (last_week_*): si el esquema de Supabase aún no las tiene, se
 * reintenta sin ellas para que el perfil se siga publicando.
 */
const NEW_PROFILE_COLUMNS = ['last_week_xp', 'last_week_tasks'];
async function withoutNewColumns<P extends object, T>(data: P, send: (d: P) => Promise<T>): Promise<T> {
  try {
    return await send(data);
  } catch (e) {
    const missing = e instanceof ApiError && NEW_PROFILE_COLUMNS.some((c) => e.message.includes(c));
    if (!missing) throw e;
    const rest = { ...data } as Record<string, unknown>;
    for (const c of NEW_PROFILE_COLUMNS) delete rest[c];
    return send(rest as P);
  }
}

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
    const rows = await withoutNewColumns(stats, (st) => call<Profile[]>('/rest/v1/profiles', {
      method: 'POST', token: s.accessToken, prefer: 'return=representation',
      body: JSON.stringify({ id: s.userId, username, ...st }),
    }));
    return rows[0];
  },

  async updateProfile(s, patch) {
    await withoutNewColumns(patch, (p) => call(`/rest/v1/profiles?id=eq.${s.userId}`, {
      method: 'PATCH', token: s.accessToken, body: JSON.stringify({ ...p, updated_at: new Date().toISOString() }),
    }));
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

  async pushState(s, state, updatedAt, expected) {
    // Escritura condicional: solo si la nube sigue en la versión que conocemos. Si otro
    // dispositivo subió algo entretanto, se avisa (sync_conflict) para fusionar antes.
    if (expected) {
      const rows = await call<unknown[]>(
        `/rest/v1/user_state?user_id=eq.${s.userId}&updated_at=eq.${encodeURIComponent(expected)}&select=user_id`,
        { method: 'PATCH', token: s.accessToken, prefer: 'return=representation', body: JSON.stringify({ state, updated_at: updatedAt }) },
      );
      if (!rows.length) throw new ApiError('sync_conflict', 'La nube ha cambiado', 409);
      return;
    }
    try {
      await call('/rest/v1/user_state', {
        method: 'POST', token: s.accessToken,
        body: JSON.stringify({ user_id: s.userId, state, updated_at: updatedAt }),
      });
    } catch (e) {
      // Ya había datos en la nube (otro dispositivo se adelantó): hay que fusionar.
      if (e instanceof ApiError && (e.status === 409 || e.code === 'username_taken')) throw new ApiError('sync_conflict', 'La nube ya tiene datos', 409);
      throw e;
    }
  },

  async listStateVersions(s) {
    try {
      return await call<StateVersion[]>(
        `/rest/v1/user_state_versions?user_id=eq.${s.userId}&select=id,saved_at,updated_at,reason,xp:state->frog->xp,coins:state->frog->coins&order=saved_at.desc&limit=20`,
        { token: s.accessToken },
      );
    } catch (e) {
      if (e instanceof ApiError && e.code === 'schema_missing') return [];
      throw e;
    }
  },

  async getStateVersion(s, id) {
    const rows = await call<{ state: unknown }[]>(`/rest/v1/user_state_versions?id=eq.${id}&user_id=eq.${s.userId}&select=state`, { token: s.accessToken });
    return rows[0]?.state ?? null;
  },

  async isAdmin(s) {
    try {
      return (await call<boolean>('/rest/v1/rpc/is_admin', { method: 'POST', token: s.accessToken, body: '{}' })) === true;
    } catch (e) {
      // Sin la función en el esquema (aún no se ha actualizado): nadie es administrador.
      if (e instanceof ApiError && e.code === 'schema_missing') return false;
      throw e;
    }
  },

  async getConfig(key) {
    const rows = await call<{ value: unknown; updated_at: string }[]>(`/rest/v1/app_config?key=eq.${encodeURIComponent(key)}&select=value,updated_at`);
    return rows[0] ? { value: rows[0].value, updatedAt: rows[0].updated_at } : null;
  },

  async setConfig(s, key, value): Promise<RemoteConfig> {
    const rows = await call<{ value: unknown; updated_at: string }[]>('/rest/v1/app_config?on_conflict=key', {
      method: 'POST', token: s.accessToken, prefer: 'resolution=merge-duplicates,return=representation',
      body: JSON.stringify({ key, value, updated_at: new Date().toISOString(), updated_by: s.userId }),
    });
    // Sin permiso, PostgREST no devuelve fila (o un 403): no se ha guardado.
    if (!rows?.[0]) throw new ApiError('forbidden', 'Sin permiso', 403);
    return { value: rows[0].value, updatedAt: rows[0].updated_at };
  },

  async deleteConfig(s, key) {
    await call(`/rest/v1/app_config?key=eq.${encodeURIComponent(key)}`, { method: 'DELETE', token: s.accessToken });
  },

  async patioWeek(s) {
    return call<PatioEntry[]>('/rest/v1/rpc/patio_week', { method: 'POST', token: s.accessToken, body: '{}' });
  },

  async patioWinners(s) {
    return call<PatioWinner[]>('/rest/v1/rpc/patio_winners', { method: 'POST', token: s?.accessToken, body: '{}' });
  },

  async patioSubmit(s, entry, image) {
    const ext = image.type === 'image/webp' ? 'webp' : 'png';
    const path = `${s.userId}/${Date.now().toString(36)}.${ext}`;
    let res: Response;
    try {
      res = await fetch(`${URL_}/storage/v1/object/patio/${path}`, {
        method: 'POST', body: image,
        headers: { apikey: KEY, Authorization: `Bearer ${s.accessToken}`, 'Content-Type': image.type, 'Cache-Control': 'max-age=31536000' },
      });
    } catch {
      throw new ApiError('network', 'Sin conexión', 0);
    }
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw toApiError(res.status, body);
    }
    try {
      const rows = await call<PatioEntry[]>('/rest/v1/patio_entries?select=*', {
        method: 'POST', token: s.accessToken, prefer: 'return=representation',
        body: JSON.stringify({ slot: entry.slot, name: entry.name.trim(), ratio: entry.ratio, image_path: path }),
      });
      return { ...rows[0], votes: 0, voted: false, mine: true, reports: 0 };
    } catch (e) {
      // No dejar la imagen huérfana si no se pudo publicar.
      await fetch(`${URL_}/storage/v1/object/patio/${path}`, { method: 'DELETE', headers: { apikey: KEY, Authorization: `Bearer ${s.accessToken}` } }).catch(() => undefined);
      throw e;
    }
  },

  async patioVote(s, entryId, on) {
    if (on) {
      await call('/rest/v1/patio_votes', { method: 'POST', token: s.accessToken, body: JSON.stringify({ entry_id: entryId }) });
    } else {
      await call(`/rest/v1/patio_votes?entry_id=eq.${entryId}&user_id=eq.${s.userId}`, { method: 'DELETE', token: s.accessToken });
    }
  },

  async patioReport(s, entryId) {
    try {
      await call('/rest/v1/patio_reports', { method: 'POST', token: s.accessToken, body: JSON.stringify({ entry_id: entryId }) });
    } catch (e) {
      // Denunciar dos veces no es un error para quien lo hace.
      if (!(e instanceof ApiError && e.status === 409)) throw e;
    }
  },

  async patioSetHidden(s, entryId, hidden) {
    await call(`/rest/v1/patio_entries?id=eq.${entryId}`, { method: 'PATCH', token: s.accessToken, body: JSON.stringify({ hidden }) });
  },

  async patioDelete(s, entryId, imagePath) {
    await call(`/rest/v1/patio_entries?id=eq.${entryId}`, { method: 'DELETE', token: s.accessToken });
    if (imagePath?.startsWith(`${s.userId}/`)) {
      await fetch(`${URL_}/storage/v1/object/patio/${imagePath}`, { method: 'DELETE', headers: { apikey: KEY, Authorization: `Bearer ${s.accessToken}` } }).catch(() => undefined);
    }
  },

  patioImageUrl(path) {
    return `${URL_}/storage/v1/object/public/patio/${path}`;
  },
};
