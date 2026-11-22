import type { Slot } from '../domain/types';
import type { Mood } from '../domain/engine';

/** Sesión de usuario (tokens de Supabase Auth). */
export interface Session {
  accessToken: string;
  refreshToken: string;
  /** Epoch en ms en el que caduca el accessToken. */
  expiresAt: number;
  userId: string;
  email: string;
}

/** Perfil público: lo que tus amigos ven de ti y de tu rana. */
export interface Profile {
  id: string;
  username: string;
  friend_code: string;
  frog_name: string;
  level: number;
  xp: number;
  equipped: Partial<Record<Slot, string>>;
  mood: Mood;
  streak: number;
  /** Lunes de la semana a la que corresponden week_xp y week_tasks. */
  week_start: string | null;
  week_xp: number;
  week_tasks: number;
  total_tasks: number;
  updated_at: string;
}

export type ProfileStats = Omit<Profile, 'id' | 'username' | 'friend_code' | 'updated_at'>;

export interface Friendship {
  requester: string;
  addressee: string;
  status: 'pending' | 'accepted';
  created_at: string;
}

export interface RemoteState {
  state: unknown;
  updatedAt: string;
}

/**
 * Todo lo que la app necesita de un servidor. La implementación actual es
 * Supabase (services/backend.ts); cambiar de proveedor = otra implementación.
 */
export interface Backend {
  enabled: boolean;
  /** Construye una sesión a partir de los tokens que vienen en el enlace de un correo. */
  sessionFromTokens(accessToken: string, refreshToken: string, expiresIn?: number): Session | null;
  /** redirectTo: adónde vuelve el enlace del correo de confirmación. */
  signUp(email: string, password: string, redirectTo: string): Promise<Session | null>;
  recover(email: string, redirectTo: string): Promise<void>;
  updatePassword(s: Session, password: string): Promise<void>;
  usernameAvailable(name: string): Promise<boolean>;
  deleteAccount(s: Session): Promise<void>;
  signIn(email: string, password: string): Promise<Session>;
  refresh(refreshToken: string): Promise<Session>;
  signOut(s: Session): Promise<void>;
  getProfile(s: Session, id: string): Promise<Profile | null>;
  createProfile(s: Session, username: string, stats: ProfileStats): Promise<Profile>;
  updateProfile(s: Session, patch: Partial<ProfileStats>): Promise<void>;
  listFriendships(s: Session): Promise<Friendship[]>;
  getProfiles(s: Session, ids: string[]): Promise<Profile[]>;
  sendFriendRequest(s: Session, code: string): Promise<'pending' | 'accepted'>;
  acceptFriend(s: Session, requesterId: string): Promise<void>;
  removeFriendship(s: Session, otherId: string): Promise<void>;
  pullState(s: Session): Promise<RemoteState | null>;
  pushState(s: Session, state: unknown, updatedAt: string): Promise<void>;
  /** ¿Es administrador? Lo decide el servidor (tabla admins), no el navegador. */
  isAdmin(s: Session): Promise<boolean>;
  /** Configuración pública de la app (p. ej. los ajustes de los complementos). */
  getConfig(key: string): Promise<RemoteConfig | null>;
  /** Solo administradores: lo comprueba la base de datos (RLS). */
  setConfig(s: Session, key: string, value: unknown): Promise<RemoteConfig>;
  deleteConfig(s: Session, key: string): Promise<void>;
}

export interface RemoteConfig {
  value: unknown;
  updatedAt: string;
}

/** Error con un código estable para traducirlo a un mensaje para el usuario. */
export class ApiError extends Error {
  constructor(public code: string, message: string, public status = 0) {
    super(message);
  }
}

export function friendlyError(e: unknown): string {
  const code = e instanceof ApiError ? e.code : '';
  switch (code) {
    case 'invalid_credentials': return 'El correo o la contraseña no son correctos.';
    case 'user_already_exists': return 'Ya hay una cuenta con ese correo. Prueba a entrar.';
    case 'weak_password': return 'La contraseña es demasiado corta: usa al menos 6 caracteres.';
    case 'email_not_confirmed': return 'Confirma tu correo con el enlace que te hemos enviado y vuelve a entrar.';
    case 'username_taken': return 'Ese nombre de usuario ya existe. Elige otro.';
    case 'not_found': return 'No hay nadie con ese código. Revisa que esté bien escrito.';
    case 'self': return 'Ese es tu propio código.';
    case 'network': return 'No hay conexión con el servidor. Inténtalo de nuevo en un momento.';
    case 'session_expired': return 'Tu sesión ha caducado. Vuelve a entrar.';
    case 'rate_limit': return 'Demasiados intentos seguidos. Espera unos minutos y vuelve a probar.';
    case 'invalid_email': return 'Ese correo no parece válido. Revísalo.';
    case 'signup_disabled': return 'Ahora mismo no se pueden crear cuentas nuevas.';
    case 'same_password': return 'La nueva contraseña tiene que ser distinta de la anterior.';
    case 'link_expired': return 'El enlace ha caducado o ya se usó. Pide uno nuevo.';
    case 'schema_missing': return 'Falta preparar la base de datos: ejecuta supabase/schema.sql en Supabase (ver docs/CUENTAS.md).';
    case 'misconfigured': return 'La app no está bien conectada al servidor: revisa VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.';
    case 'forbidden': return 'No tienes permiso para hacer esto.';
    default: return e instanceof Error && e.message ? e.message : 'Algo ha fallado. Inténtalo de nuevo.';
  }
}
