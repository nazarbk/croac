import { useEffect, useState } from 'react';
import { Button } from '../components/ui/Button';
import { Field, inputClass, Segmented } from '../components/ui/controls';
import { Icon } from '../components/ui/Icon';
import { Modal } from '../components/ui/Modal';
import { cn } from '../lib/cn';
import { account, accountStore, cloudEnabled, pendingUsername, useAccount, USERNAME_RE } from '../services/account';
import { social } from '../services/social';
import { pullNow, resolveConflict, syncStore, useSync } from '../services/sync';
import { friendlyError } from '../services/types';
import { createStore, useStore } from '../store/createStore';
import { ui } from '../store/uiStore';

/* La ventana de acceso se puede abrir desde cualquier parte. */
type AuthMode = 'signin' | 'signup' | 'reset';
const authStore = createStore<{ open: boolean; mode: AuthMode }>({ open: false, mode: 'signup' });
export const openAuth = (mode: AuthMode = 'signup') => authStore.set({ open: true, mode });

/** «Sincronizar ahora»: trae, combina y sube, y dice cómo ha ido. */
async function syncByHand() {
  await pullNow();
  const { status } = syncStore.get();
  if (status === 'error') ui.toast({ message: 'No se ha podido sincronizar. Comprueba la conexión.', tone: 'danger' });
  else if (status !== 'conflict') ui.toast({ message: 'Todo sincronizado' });
}

function timeAgo(at: string | number | null) {
  if (!at) return 'nunca';
  const min = Math.round((Date.now() - (typeof at === 'number' ? at : Date.parse(at))) / 60000);
  if (min < 1) return 'ahora mismo';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  return h < 24 ? `hace ${h} h` : `hace ${Math.round(h / 24)} días`;
}

function UsernameInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Field label="Nombre de usuario" hint="Lo verán tus amigos. Minúsculas, números y _ (3–20).">
      <input
        className={inputClass} value={value} autoComplete="nickname" autoCapitalize="none" autoCorrect="off" enterKeyHint="go" spellCheck={false}
        onChange={(e) => onChange(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20))}
        placeholder="ej. nazar_rana" aria-label="Nombre de usuario"
      />
    </Field>
  );
}

function PasswordInput({ value, onChange, autoComplete, enterKeyHint, autoFocus }: {
  value: string; onChange: (v: string) => void; autoComplete: string; enterKeyHint: 'next' | 'go'; autoFocus?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id="auth-password" type={show ? 'text' : 'password'} autoCapitalize="none" autoCorrect="off" spellCheck={false}
        enterKeyHint={enterKeyHint} className={cn(inputClass, 'pr-12')} value={value} data-autofocus={autoFocus || undefined}
        onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} aria-label="Contraseña"
      />
      <button
        type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={show}
        className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 rounded-lg flex items-center justify-center text-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lily"
      >
        <Icon name={show ? 'eyeOff' : 'eye'} size={18} />
      </button>
    </div>
  );
}

const NAME_ERROR = 'El nombre debe tener entre 3 y 20 caracteres: minúsculas, números o _.';

/** Entrar / crear cuenta / recuperar contraseña / elegir nombre. */
export function AuthModal() {
  const { open, mode } = useStore(authStore, (s) => s);
  const { loading, needsUsername, session, recovery, notice } = useAccount();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const close = () => { authStore.set({ open: false, mode }); setError(null); setInfo(null); setPassword(''); };
  const setMode = (m: AuthMode) => { authStore.set({ open: true, mode: m }); setError(null); setInfo(null); };

  // Al volver del correo de confirmación (o abrir la app con sesión y sin perfil): elegir nombre.
  useEffect(() => {
    if (session && needsUsername && !recovery) {
      setUsername((u) => u || pendingUsername());
      authStore.set({ open: true, mode: 'signin' });
    }
  }, [session, needsUsername, recovery]);

  // Avisos al volver de un enlace de correo.
  useEffect(() => {
    if (!notice) return;
    ui.toast({ message: notice.text, tone: notice.tone === 'error' ? 'danger' : undefined, duration: 6000 });
    account.dismissNotice();
  }, [notice]);

  const choosingName = open && !!session && needsUsername;

  const submit = async () => {
    setError(null);
    try {
      if (choosingName) {
        if (!USERNAME_RE.test(username)) return setError(NAME_ERROR);
        await account.createProfile(username);
        ui.toast({ message: `¡Bienvenido a la charca, @${username}!` });
        return close();
      }
      if (!email.includes('@')) return setError('Escribe tu correo.');
      if (mode === 'reset') {
        await account.recover(email);
        setInfo('Si hay una cuenta con ese correo, te llegará un enlace para elegir una contraseña nueva. Mira también en spam.');
        return;
      }
      if (password.length < 6) return setError('La contraseña tiene que tener al menos 6 caracteres.');
      if (mode === 'signup') {
        if (!USERNAME_RE.test(username)) return setError(NAME_ERROR);
        const ok = await account.signUp(email, password, username);
        if (!ok) {
          setInfo(`Te hemos enviado un correo a ${email}. Pulsa el enlace para activar la cuenta (mira también en spam).`);
          authStore.set({ open: true, mode: 'signin' });
          return;
        }
        ui.toast({ message: `¡Cuenta creada, @${username}! Tus datos ya se sincronizan.` });
      } else {
        await account.signIn(email, password);
        if (accountStore.get().needsUsername) { setUsername((u) => u || pendingUsername()); return; } // elegir nombre
        ui.toast({ message: 'Has entrado. Sincronizando tus datos…' });
      }
      close();
    } catch (e) {
      setError(friendlyError(e));
    }
  };

  if (!open || recovery) return null;

  const title = choosingName ? 'Elige tu nombre' : mode === 'signup' ? 'Crea tu cuenta' : mode === 'reset' ? 'Recuperar contraseña' : 'Entrar';
  const cta = choosingName ? 'Guardar nombre' : mode === 'signup' ? 'Crear cuenta' : mode === 'reset' ? 'Enviar enlace' : 'Entrar';

  return (
    <Modal
      open
      onClose={close}
      size="sm"
      title={title}
      footer={<Button variant="primary" className="w-full" onClick={() => void submit()} disabled={loading}>{loading ? 'Un momento…' : cta}</Button>}
    >
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void submit(); }} noValidate>
        {choosingName ? (
          <p className="text-sm text-muted leading-relaxed">Es como te verán tus amigos en la charca. No se puede cambiar después.</p>
        ) : (
          <>
            {mode === 'reset' ? (
              <p className="text-sm text-muted leading-relaxed">Escribe el correo de tu cuenta y te enviaremos un enlace para elegir una contraseña nueva.</p>
            ) : (
              <>
                <p className="text-sm text-muted leading-relaxed">
                  Con una cuenta tus tareas se guardan en la nube, las tienes en el móvil y en el ordenador, y puedes añadir amigos a tu charca.
                </p>
                <Segmented<'signin' | 'signup'> full value={mode} onChange={setMode}
                  options={[{ value: 'signup', label: 'Crear cuenta' }, { value: 'signin', label: 'Ya tengo cuenta' }]} />
              </>
            )}
            <Field label="Correo">
              <input
                data-autofocus id="auth-email" type="email" inputMode="email" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint={mode === 'reset' ? 'go' : 'next'}
                className={inputClass} value={email} onChange={(e) => setEmail(e.target.value.trim())} autoComplete="email" placeholder="tu@correo.com" aria-label="Correo"
              />
            </Field>
            {mode !== 'reset' && (
              <Field label="Contraseña" hint={mode === 'signup' ? 'Al menos 6 caracteres.' : undefined}>
                <PasswordInput value={password} onChange={setPassword} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} enterKeyHint={mode === 'signup' ? 'next' : 'go'} />
                {mode === 'signin' && (
                  <button type="button" onClick={() => setMode('reset')} className="mt-2 text-sm font-semibold text-lily-strong hover:underline">
                    ¿Has olvidado la contraseña?
                  </button>
                )}
              </Field>
            )}
          </>
        )}
        {(mode === 'signup' || choosingName) && <UsernameInput value={username} onChange={setUsername} />}
        {mode === 'reset' && !choosingName && (
          <button type="button" onClick={() => setMode('signin')} className="text-sm font-semibold text-lily-strong hover:underline">Volver a entrar</button>
        )}
        {info && <p role="status" className="text-sm rounded-xl bg-lily-soft text-lily-strong p-3 leading-relaxed">{info}</p>}
        {error && <p className="text-sm rounded-xl bg-danger-soft text-danger p-3 leading-relaxed" role="alert">{error}</p>}
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

/** Tras pulsar el enlace de «recuperar contraseña»: elegir la nueva. */
export function NewPasswordModal() {
  const { recovery, loading } = useAccount();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  if (!recovery) return null;
  const submit = async () => {
    setError(null);
    if (password.length < 6) return setError('La contraseña tiene que tener al menos 6 caracteres.');
    try {
      await account.updatePassword(password);
      ui.toast({ message: 'Contraseña cambiada. Ya has entrado.' });
      void account.loadProfile().catch(() => {});
    } catch (e) {
      setError(friendlyError(e));
    }
  };
  return (
    <Modal
      open dismissable={false} onClose={() => {}} size="sm" title="Elige una contraseña nueva"
      footer={<Button variant="primary" className="w-full" onClick={() => void submit()} disabled={loading}>{loading ? 'Un momento…' : 'Guardar contraseña'}</Button>}
    >
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <Field label="Contraseña nueva" hint="Al menos 6 caracteres.">
          <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" enterKeyHint="go" autoFocus />
        </Field>
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
        Lo más seguro es combinarlos: se juntan las tareas, lo hecho y las compras de los dos, sin perder nada.
      </p>
      <div className="mt-5 grid gap-2">
        <Button variant="primary" icon="refresh" onClick={() => void resolveConflict('merge')}>Combinar los dos (recomendado)</Button>
        <Button icon="cloud" onClick={() => void resolveConflict('cloud')}>Usar solo los de mi cuenta</Button>
        <Button variant="ghost" icon="smartphone" onClick={() => void resolveConflict('device')}>Usar solo los de este dispositivo</Button>
      </div>
      <p className="text-[13px] text-muted mt-4">Con «usar solo», los otros se sustituyen, aunque se guarda una copia que puedes recuperar en Ajustes → Tus datos.</p>
    </Modal>
  );
}

/** Tarjeta de Ajustes: estado de la cuenta y de la sincronización. */
export function AccountCard() {
  const { session, profile, loading } = useAccount();
  const sync = useSync();
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  // Para que «hace X min» se actualice solo.
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

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
          : `Sincronizado ${timeAgo(sync.checkedAt ?? sync.lastSyncedAt)}`;

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
            <Button size="sm" icon="refresh" disabled={sync.status === 'syncing'} onClick={() => void syncByHand()}>
              {sync.status === 'syncing' ? 'Sincronizando…' : 'Sincronizar ahora'}
            </Button>
            <Button size="sm" variant="ghost" icon="logOut" onClick={() => { void account.signOut(); social.clear(); }}>Cerrar sesión</Button>
          </div>
          <button type="button" onClick={() => setConfirmDelete(true)} className="mt-4 text-[13px] text-muted hover:text-danger underline-offset-2 hover:underline">
            Borrar mi cuenta
          </button>
        </div>
      </div>
      <Modal
        open={confirmDelete} onClose={() => { setConfirmDelete(false); setDeleteError(null); }} size="sm" title="¿Borrar tu cuenta?"
        footer={<>
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Cancelar</Button>
          <Button variant="danger" disabled={loading} onClick={async () => {
            try {
              await account.deleteAccount();
              social.clear();
              setConfirmDelete(false);
              ui.toast({ message: 'Cuenta borrada. Tus tareas siguen en este dispositivo.' });
            } catch (e) {
              setDeleteError(friendlyError(e));
            }
          }}>Borrar cuenta</Button>
        </>}
      >
        <p className="text-[15px] leading-relaxed">
          Se borrarán tu perfil, tus amistades y la copia en la nube. Desaparecerás de la charca de tus amigos. Tus tareas seguirán en este dispositivo.
        </p>
        {deleteError && <p className="text-sm rounded-xl bg-danger-soft text-danger p-3 mt-3" role="alert">{deleteError}</p>}
      </Modal>
    </section>
  );
}
