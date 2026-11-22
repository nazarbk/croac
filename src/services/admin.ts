import { createStore, useStore } from '../store/createStore';
import { accountStore, withSession } from './account';
import { backend } from './backend';

/**
 * ¿La sesión actual es de un administrador? Lo responde el servidor (función is_admin de
 * supabase/schema.sql, que mira la tabla admins). La tabla solo se puede cambiar desde el
 * panel de Supabase: nadie puede hacerse administrador desde la app ni desde el navegador.
 *
 * Esto solo decide qué se ENSEÑA (el probador). Lo que un administrador puede GUARDAR lo
 * vuelve a comprobar la base de datos en cada escritura (RLS).
 */
type Status = 'no' | 'checking' | 'yes' | 'error';
interface AdminState { status: Status; userId: string | null }

// Con sesión guardada se empieza «comprobando» (no «no»), para no enseñar otra pantalla un instante.
export const adminStore = createStore<AdminState>({
  status: backend.enabled && accountStore.get().session ? 'checking' : 'no',
  userId: null,
});
export const useAdminStatus = () => useStore(adminStore, (s) => s.status);
export const useIsAdmin = () => useStore(adminStore, (s) => s.status === 'yes');

async function check(force = false) {
  const userId = accountStore.get().session?.userId ?? null;
  const cur = adminStore.get();
  if (!force && cur.userId === userId && cur.status !== 'error' && cur.status !== 'checking') return;
  if (!userId || !backend.enabled) {
    adminStore.set({ status: 'no', userId });
    return;
  }
  adminStore.set({ status: 'checking', userId });
  try {
    const ok = await withSession((s) => backend.isAdmin(s));
    if (accountStore.get().session?.userId === userId) adminStore.set({ status: ok ? 'yes' : 'no', userId });
  } catch {
    // Sin conexión o error: no se enseña nada de administración (se reintenta luego).
    if (accountStore.get().session?.userId === userId) adminStore.set({ status: 'error', userId });
  }
}

let started = false;
/** Comprueba al arrancar y cada vez que cambia la sesión. */
export function startAdminWatch() {
  if (started) return;
  started = true;
  void check();
  accountStore.subscribe(() => void check());
}

export const recheckAdmin = () => check(true);
