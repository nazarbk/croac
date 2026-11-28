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
  /** La semana anterior a week_start (para ver quién ganó cuando la nueva empieza de cero). */
  last_week_xp?: number;
  last_week_tasks?: number;
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

export interface StateVersion {
  id: number;
  saved_at: string;
  updated_at: string;
  xp: number | null;
  coins: number | null;
  /** 'daily': copia del día; 'loss': antes de un cambio que quitaba historial o complementos. */
  reason?: string;
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
  /** Sube el estado. Con `expected`, solo si la nube sigue en esa versión (si no: ApiError 'sync_conflict'). */
  pushState(s: Session, state: unknown, updatedAt: string, expected: string | null): Promise<void>;
  /** Copias automáticas del estado en la nube (las guarda el servidor al sobrescribir). */
  listStateVersions(s: Session): Promise<StateVersion[]>;
  getStateVersion(s: Session, id: number): Promise<unknown>;
  /** ¿Es administrador? Lo decide el servidor (tabla admins), no el navegador. */
  isAdmin(s: Session): Promise<boolean>;
  /** Configuración pública de la app (p. ej. los ajustes de los complementos). */
  getConfig(key: string): Promise<RemoteConfig | null>;
  /** Solo administradores: lo comprueba la base de datos (RLS). */
  setConfig(s: Session, key: string, value: unknown): Promise<RemoteConfig>;
  deleteConfig(s: Session, key: string): Promise<void>;

  /* Patio del complemento */
  patioWeek(s: Session): Promise<PatioEntry[]>;
  /** Público: sin sesión también (para dibujar en cualquier rana los complementos ganadores). */
  patioWinners(s: Session | null): Promise<PatioWinner[]>;
  patioSubmit(s: Session, entry: { slot: PatioSlot; name: string; ratio: number }, image: Blob): Promise<PatioEntry>;
  patioVote(s: Session, entryId: number, on: boolean): Promise<void>;
  patioReport(s: Session, entryId: number): Promise<void>;
  patioSetHidden(s: Session, entryId: number, hidden: boolean): Promise<void>;
  /** Con `imagePath` (dibujo propio) también borra la imagen. */
  patioDelete(s: Session, entryId: number, imagePath?: string): Promise<void>;
  /** Dirección pública de una imagen del patio. */
  patioImageUrl(path: string): string;
}

export type PatioSlot = 'hat' | 'neck' | 'eyes';

export interface PatioEntry {
  id: number;
  slot: PatioSlot;
  name: string;
  image_path: string;
  ratio: number;
  author: string;
  votes: number;
  voted: boolean;
  mine: boolean;
  hidden: boolean;
  /** Solo para administradores. */
  reports: number;
  week_start: string;
  created_at: string;
}

export interface PatioWinner {
  id: number;
  week_start: string;
  slot: PatioSlot;
  name: string;
  image_path: string;
  ratio: number;
  author: string;
  votes: number;
  /** El ganador es quien pregunta (para darle su premio). */
  mine: boolean;
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
    case 'patio_no_votes': return 'Ya has usado tus 3 votos de esta semana. Quita uno para votar a otro dibujo.';
    case 'patio_own_vote': return 'No puedes votar tu propio dibujo.';
    case 'patio_closed': return 'Ese dibujo ya no se puede votar.';
    case 'patio_already': return 'Ya has publicado un dibujo esta semana.';
    case 'patio_needs_profile': return 'Elige antes tu nombre de usuario.';
    case 'patio_too_big': return 'El dibujo pesa demasiado. Prueba con menos detalles.';
    default: return e instanceof Error && e.message ? e.message : 'Algo ha fallado. Inténtalo de nuevo.';
  }
}
