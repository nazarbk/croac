import { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Field, inputClass, Segmented } from '../components/ui/controls';
import { Icon } from '../components/ui/Icon';
import { Modal } from '../components/ui/Modal';
import { cn } from '../lib/cn';
import { account, accountStore, cloudEnabled, useAccount, USERNAME_RE } from '../services/account';
import { social } from '../services/social';
import { pullNow, resolveConflict, useSync } from '../services/sync';
import { friendlyError } from '../services/types';
import { createStore, useStore } from '../store/createStore';
import { ui } from '../store/uiStore';

/* La ventana de acceso se puede abrir desde cualquier parte. */
const authStore = createStore<{ open: boolean; mode: 'signin' | 'signup' }>({ open: false, mode: 'signup' });
export const openAuth = (mode: 'signin' | 'signup' = 'signup') => authStore.set({ open: true, mode });

function timeAgo(iso: string | null) {
  if (!iso) return 'nunca';
  const min = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (min < 1) return 'ahora mismo';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  return h < 24 ? `hace ${h} h` : `hace ${Math.round(h / 24)} días`;
}

function UsernameInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Field label="Nombre de usuario" hint="Lo verán tus amigos. Minúsculas, números y _ (3–20).">
      <input
        className={inputClass} value={value} autoComplete="username" autoCapitalize="none" spellCheck={false}
        onChange={(e) => onChange(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20))}
        placeholder="ej. nazar_rana" aria-label="Nombre de usuario"
      />
    </Field>
  );
}

/** Entrar / crear cuenta. */
export function AuthModal() {
  const { open, mode } = useStore(authStore, (s) => s);
  const { loading, needsUsername, session } = useAccount();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const close = () => { authStore.set({ open: false, mode }); setError(null); setInfo(null); setPassword(''); };
  const setMode = (m: 'signin' | 'signup') => { authStore.set({ open: true, mode: m }); setError(null); setInfo(null); };

  // Tras entrar sin perfil todavía: elegir nombre de usuario.
  const choosingName = open && !!session && needsUsername;

  const submit = async () => {
    setError(null);
    try {
      if (choosingName) {
        if (!USERNAME_RE.test(username)) return setError('El nombre debe tener entre 3 y 20 caracteres: minúsculas, números o _.');
        await account.createProfile(username);
        ui.toast({ message: `¡Bienvenido a la charca, @${username}!` });
        return close();
      }
      if (mode === 'signup') {
        if (!USERNAME_RE.test(username)) return setError('El nombre debe tener entre 3 y 20 caracteres: minúsculas, números o _.');
        const ok = await account.signUp(email, password, username);
        if (!ok) {
          setInfo('Te hemos enviado un correo para confirmar la cuenta. Ábrelo y después entra aquí con tu correo y contraseña.');
          authStore.set({ open: true, mode: 'signin' });
          return;
        }
        ui.toast({ message: 'Cuenta creada. Tus datos ya se sincronizan.' });
      } else {
        await account.signIn(email, password);
        if (accountStore.get().needsUsername) return; // se queda abierta para elegir nombre
        ui.toast({ message: 'Has entrado. Sincronizando tus datos…' });
      }
      close();
    } catch (e) {
      setError(friendlyError(e));
    }
  };

  if (!open) return null;

  return (
    <Modal
      open
      onClose={close}
      size="sm"
      title={choosingName ? 'Elige tu nombre' : mode === 'signup' ? 'Crea tu cuenta' : 'Entrar'}
      footer={<Button variant="primary" className="w-full" onClick={() => void submit()} disabled={loading}>{loading ? 'Un momento…' : choosingName ? 'Guardar nombre' : mode === 'signup' ? 'Crear cuenta' : 'Entrar'}</Button>}
    >
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        {!choosingName && (
          <>
            <p className="text-sm text-muted leading-relaxed">
              Con una cuenta tus tareas se guardan en la nube, las tienes en el móvil y en el ordenador, y puedes añadir amigos a tu charca.
            </p>
            <Segmented<'signin' | 'signup'> full value={mode} onChange={setMode}
              options={[{ value: 'signup', label: 'Crear cuenta' }, { value: 'signin', label: 'Ya tengo cuenta' }]} />
            <Field label="Correo">
              <input data-autofocus type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="tu@correo.com" aria-label="Correo" />
            </Field>
            <Field label="Contraseña" hint={mode === 'signup' ? 'Al menos 6 caracteres.' : undefined}>
              <input type="password" className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} aria-label="Contraseña" />
            </Field>
          </>
        )}
        {(mode === 'signup' || choosingName) && <UsernameInput value={username} onChange={setUsername} />}
        {info && <p className="text-sm rounded-xl bg-lily-soft text-lily-strong p-3">{info}</p>}
        {error && <p className="text-sm rounded-xl bg-danger-soft text-danger p-3" role="alert">{error}</p>}
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

/** Primera vez que entras en un dispositivo que ya tenía datos. */
export function SyncConflictModal() {
  const { conflict } = useSync();
  if (!conflict) return null;
  const remote = conflict.state as { tasks?: unknown[]; frog?: { name?: string } } | null;
  const remoteTasks = Array.isArray(remote?.tasks) ? remote!.tasks!.length : 0;
  return (
    <Modal open dismissable={false} onClose={() => {}} size="sm" title="¿Qué datos quieres conservar?">
      <p className="text-[15px] leading-relaxed">
        Tu cuenta ya tiene datos guardados ({remoteTasks} {remoteTasks === 1 ? 'tarea' : 'tareas'}) y este dispositivo también tiene los suyos.
        Elige con cuáles seguir; los otros se sustituirán.
      </p>
      <div className="mt-5 grid gap-2">
        <Button variant="primary" icon="cloud" onClick={() => void resolveConflict('cloud')}>Usar los de mi cuenta</Button>
        <Button icon="smartphone" onClick={() => void resolveConflict('device')}>Subir los de este dispositivo</Button>
      </div>
      <p className="text-[13px] text-muted mt-4">Consejo: si no estás seguro, exporta antes una copia desde Ajustes → Tus datos.</p>
    </Modal>
  );
}

/** Tarjeta de Ajustes: estado de la cuenta y de la sincronización. */
export function AccountCard() {
  const { session, profile } = useAccount();
  const sync = useSync();
  const [copied, setCopied] = useState(false);

  if (!cloudEnabled) {
    return (
      <section className="mt-5 rounded-[1.5rem] bg-surface border border-line shadow-card p-5">
        <h2 className="font-display text-lg font-bold">Cuenta y sincronización</h2>
        <p className="text-sm text-muted mt-1 leading-relaxed">
          Esta instalación no está conectada a un servidor, así que tus datos solo viven en este dispositivo y no puedes añadir amigos.
          Quien publica la app puede activarlo en minutos con Supabase (ver <code className="text-[13px]">docs/CUENTAS.md</code>).
        </p>
      </section>
    );
  }

  if (!session) {
    return (
      <section className="mt-5 rounded-[1.5rem] bg-surface border border-line shadow-card p-5">
        <div className="flex items-start gap-4">
          <span className="w-12 h-12 rounded-2xl bg-lily-soft text-lily-strong flex items-center justify-center shrink-0"><Icon name="cloud" size={22} /></span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg font-bold">Tu cuenta</h2>
            <p className="text-sm text-muted mt-0.5 leading-snug">Guarda tus tareas en la nube, úsalas en el móvil y en el ordenador, y compite con tus amigos.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="primary" onClick={() => openAuth('signup')}>Crear cuenta</Button>
              <Button onClick={() => openAuth('signin')}>Entrar</Button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const statusText =
    sync.status === 'syncing' ? 'Sincronizando…'
      : sync.status === 'error' ? 'No se ha podido sincronizar. Se reintentará solo.'
        : sync.status === 'conflict' ? 'Elige qué datos conservar'
          : `Sincronizado ${timeAgo(sync.lastSyncedAt)}`;

  return (
    <section className="mt-5 rounded-[1.5rem] bg-surface border border-line shadow-card p-5">
      <div className="flex items-start gap-4">
        <span className="w-12 h-12 rounded-2xl bg-lily-soft text-lily-strong flex items-center justify-center shrink-0 font-display font-bold text-lg">
          {(profile?.username ?? session.email).slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-bold truncate">{profile ? `@${profile.username}` : 'Tu cuenta'}</h2>
          <p className="text-sm text-muted truncate">{session.email}</p>
          <p className={cn('text-sm mt-2 flex items-center gap-1.5', sync.status === 'error' ? 'text-danger' : 'text-lily-strong')}>
            <Icon name={sync.status === 'error' ? 'alert' : 'cloud'} size={15} />{statusText}
          </p>
          {profile && (
            <p className="text-sm mt-2">
              Tu código de amigo:{' '}
              <button
                type="button"
                className="font-mono font-semibold tracking-wider px-2 py-0.5 rounded-md bg-surface-2 border border-line"
                onClick={() => { void navigator.clipboard?.writeText(profile.friend_code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {}); }}
                title="Copiar"
              >
                {profile.friend_code}
              </button>
              {copied && <span className="ml-2 text-lily-strong">Copiado</span>}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {!profile && <Button variant="primary" onClick={() => openAuth('signin')}>Elegir nombre</Button>}
            <Button size="sm" icon="refresh" onClick={() => void pullNow()}>Sincronizar ahora</Button>
            <Button size="sm" variant="ghost" icon="logOut" onClick={() => { void account.signOut(); social.clear(); }}>Cerrar sesión</Button>
          </div>
        </div>
      </div>
    </section>
  );
}
