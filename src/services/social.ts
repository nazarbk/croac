import { addDays } from '../domain/dates';
import { createStore, useStore } from '../store/createStore';
import { accountStore, withSession } from './account';
import { backend } from './backend';
import type { Friendship, Profile } from './types';

interface SocialState {
  loading: boolean;
  error: string | null;
  friends: Profile[];
  incoming: Profile[];
  outgoing: Profile[];
  loadedAt: number;
}

export const socialStore = createStore<SocialState>({ loading: false, error: null, friends: [], incoming: [], outgoing: [], loadedAt: 0 });
export const useSocial = () => useStore(socialStore, (s) => s);

const set = (p: Partial<SocialState>) => socialStore.set((s) => ({ ...s, ...p }));

function split(me: string, rows: Friendship[], profiles: Profile[]) {
  const byId = new Map(profiles.map((p) => [p.id, p]));
  const friends: Profile[] = [];
  const incoming: Profile[] = [];
  const outgoing: Profile[] = [];
  for (const f of rows) {
    const other = f.requester === me ? f.addressee : f.requester;
    const p = byId.get(other);
    if (!p) continue;
    if (f.status === 'accepted') friends.push(p);
    else if (f.addressee === me) incoming.push(p);
    else outgoing.push(p);
  }
  return { friends, incoming, outgoing };
}

export const social = {
  async refresh() {
    const me = accountStore.get().session?.userId;
    if (!me || !backend.enabled) return;
    set({ loading: true, error: null });
    try {
      const rows = await withSession((s) => backend.listFriendships(s));
      const ids = [...new Set(rows.map((f) => (f.requester === me ? f.addressee : f.requester)))];
      const profiles = await withSession((s) => backend.getProfiles(s, ids));
      set({ ...split(me, rows, profiles), loading: false, loadedAt: Date.now() });
    } catch {
      set({ loading: false, error: 'No se han podido cargar tus amigos. Comprueba la conexión.' });
    }
  },

  async add(code: string) {
    const status = await withSession((s) => backend.sendFriendRequest(s, code.trim().toUpperCase()));
    await social.refresh();
    return status;
  },

  async accept(id: string) {
    await withSession((s) => backend.acceptFriend(s, id));
    await social.refresh();
  },

  async remove(id: string) {
    await withSession((s) => backend.removeFriendship(s, id));
    await social.refresh();
  },

  clear() {
    set({ friends: [], incoming: [], outgoing: [], loadedAt: 0, error: null });
  },
};

/** Datos de la semana en curso (si el perfil es de otra semana, cuenta 0). */
export function weekScore(p: Profile, weekStart: string) {
  return p.week_start === weekStart ? { xp: p.week_xp, tasks: p.week_tasks } : { xp: 0, tasks: 0 };
}

/** Datos de la semana anterior a weekStart (lo que se ve el lunes, cuando todo empieza de cero). */
export function lastWeekScore(p: Pick<Profile, 'week_start' | 'week_xp' | 'week_tasks' | 'last_week_xp' | 'last_week_tasks'>, weekStart: string) {
  if (p.week_start === weekStart) return { xp: p.last_week_xp ?? 0, tasks: p.last_week_tasks ?? 0 };
  if (p.week_start === addDays(weekStart, -7)) return { xp: p.week_xp, tasks: p.week_tasks };
  return { xp: 0, tasks: 0 };
}

/** Enlace para invitar: abre la app en Amigos con el código rellenado. */
export function inviteLink(code: string) {
  const base = `${location.origin}${location.pathname}`;
  return `${base}#/amigos?codigo=${encodeURIComponent(code)}`;
}
