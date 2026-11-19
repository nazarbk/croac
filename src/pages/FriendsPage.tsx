import { useEffect, useState, type ReactNode } from 'react';
import { art } from '../components/frog/art';
import { Frog } from '../components/frog/Frog';
import { Button, IconButton } from '../components/ui/Button';
import { EmptyState, inputClass } from '../components/ui/controls';
import { Modal } from '../components/ui/Modal';
import { stageForLevel } from '../domain/progression';
import { openAuth } from '../features/account';
import { cn } from '../lib/cn';
import { useRoute } from '../lib/router';
import { cloudEnabled, currentWeekStart, useAccount } from '../services/account';
import { inviteLink, social, useSocial, weekScore } from '../services/social';
import { friendlyError, type Profile } from '../services/types';
import { useToday } from '../store/appStore';
import { ui } from '../store/uiStore';

const INVITE_KEY = 'croac:invite';
function saveInvite(code: string | null) {
  try {
    if (code) localStorage.setItem(INVITE_KEY, code.toUpperCase());
    else localStorage.removeItem(INVITE_KEY);
  } catch { /* nada */ }
}
function loadInvite(): string | null {
  try { return localStorage.getItem(INVITE_KEY); } catch { return null; }
}

export function FrogAvatar({ p, className }: { p: Pick<Profile, 'level' | 'mood' | 'equipped'>; className?: string }) {
  return (
    <span className={cn('shrink-0 rounded-2xl bg-lily-soft border border-lily/20 overflow-hidden', className ?? 'w-12 h-12')}>
      <Frog level={p.level} mood={p.mood} equipped={{ ...p.equipped, background: undefined }} className="w-full h-full scale-110 translate-y-0.5" />
    </span>
  );
}

/** Pantalla para quien aún no tiene cuenta (o la app no tiene servidor). */
export function NeedsAccount({ title, children }: { title: string; children: ReactNode }) {
  const { session } = useAccount();
  if (session) {
    // Ha entrado pero aún no ha elegido nombre de usuario.
    return (
      <div className="mt-6 rounded-[1.75rem] border border-line bg-surface shadow-card p-6 text-center">
        <img src={art('ui/empty-friends.webp')} alt="" className="mx-auto w-28 h-28 object-contain" />
        <h2 className="font-display text-xl font-bold mt-3">Te falta elegir tu nombre</h2>
        <p className="text-muted mt-2 max-w-md mx-auto leading-relaxed">Es como te verán tus amigos. Después tendrás tu código para invitarles.</p>
        <Button variant="primary" className="mt-5" onClick={() => openAuth('signin')}>Elegir nombre</Button>
      </div>
    );
  }
  return (
    <div className="mt-6 rounded-[1.75rem] border border-line bg-surface shadow-card p-6 text-center">
      <img src={art('ui/empty-friends.webp')} alt="" className="mx-auto w-28 h-28 object-contain" />
      <h2 className="font-display text-xl font-bold mt-3">{title}</h2>
      <p className="text-muted mt-2 max-w-md mx-auto leading-relaxed">{children}</p>
      {cloudEnabled ? (
        <div className="mt-5 flex flex-wrap gap-2 justify-center">
          <Button variant="primary" onClick={() => openAuth('signup')}>Crear cuenta</Button>
          <Button onClick={() => openAuth('signin')}>Entrar</Button>
        </div>
      ) : (
        <p className="text-sm text-muted mt-4">Esta instalación aún no está conectada a un servidor. Ver <code>docs/CUENTAS.md</code>.</p>
      )}
    </div>
  );
}

function Row({ p, children, sub }: { p: Profile; children?: ReactNode; sub?: ReactNode }) {
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-line bg-surface shadow-card p-2.5 pr-2">
      <FrogAvatar p={p} />
      <div className="flex-1 min-w-0">
        <div className="font-semibold leading-tight truncate">{p.frog_name} <span className="text-muted font-normal">@{p.username}</span></div>
        <div className="text-[13px] text-muted mt-0.5 leading-snug line-clamp-2">{sub ?? `${stageForLevel(p.level).name} · nivel ${p.level}`}</div>
      </div>
      {children}
    </li>
  );
}

export function FriendsPage() {
  const { session, profile } = useAccount();
  const { friends, incoming, outgoing, loading, error } = useSocial();
  const route = useRoute();
  const today = useToday();
  const week = currentWeekStart(today);
  const [code, setCode] = useState(route.params.get('codigo') ?? '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [removing, setRemoving] = useState<Profile | null>(null);

  useEffect(() => {
    if (session && profile) void social.refresh();
  }, [session, profile]);

  useEffect(() => {
    const c = route.params.get('codigo');
    if (c) {
      setCode(c);
      saveInvite(c);
    }
  }, [route]);

  // Si llegó con un enlace de invitación, se envía la solicitud en cuanto tenga cuenta.
  useEffect(() => {
    const invite = loadInvite();
    if (!session || !profile || !invite) return;
    saveInvite(null);
    if (invite === profile.friend_code) return;
    void social.add(invite).then(
      (status) => {
        setCode('');
        setMsg({ tone: 'ok', text: status === 'accepted' ? '¡Ya sois amigos! Su rana ya está en tu charca.' : 'Te hemos conectado con quien te invitó: cuando acepte, aparecerá en tu charca.' });
      },
      (e) => setMsg({ tone: 'error', text: friendlyError(e) }),
    );
  }, [session, profile]);

  if (!session || !profile) {
    return (
      <div>
        <h1 className="font-display text-[2rem] leading-none font-extrabold tracking-tight">Amigos</h1>
        <NeedsAccount title="Añade a tus amigos">
          Crea una cuenta para tener tu código de amigo, añadir a otras personas y ver sus ranas en tu charca.
          {code && <><br /><br />Te han invitado con el código <strong className="font-mono">{code}</strong>: entra y se añadirá aquí.</>}
        </NeedsAccount>
      </div>
    );
  }

  const add = async () => {
    if (!code.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      const status = await social.add(code);
      setMsg(status === 'accepted'
        ? { tone: 'ok', text: '¡Ya sois amigos! Su rana ya está en tu charca.' }
        : { tone: 'ok', text: 'Solicitud enviada. Cuando la acepte, aparecerá en tu charca.' });
      setCode('');
    } catch (e) {
      setMsg({ tone: 'error', text: friendlyError(e) });
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    const url = inviteLink(profile.friend_code);
    const text = `Únete a mi charca en Croac. Mi código de amigo es ${profile.friend_code}`;
    try {
      if (navigator.share) await navigator.share({ title: 'Croac', text, url });
      else {
        await navigator.clipboard.writeText(`${text}: ${url}`);
        ui.toast({ message: 'Enlace de invitación copiado' });
      }
    } catch {
      /* el usuario canceló */
    }
  };

  return (
    <div>
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-[2rem] leading-none font-extrabold tracking-tight">Amigos</h1>
          <p className="text-muted mt-2">Añade a gente con su código y compite por completar más tareas.</p>
        </div>
        <IconButton icon="refresh" label="Actualizar" onClick={() => void social.refresh()} className={cn(loading && 'animate-spin')} />
      </header>

      <section className="mt-6 rounded-[1.5rem] bg-surface border border-line shadow-card p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <div className="text-sm text-muted">Tu código de amigo</div>
            <div className="font-mono text-2xl font-bold tracking-[0.18em] mt-1">{profile.friend_code}</div>
          </div>
          <Button variant="primary" icon="share" onClick={() => void share()}>Invitar</Button>
        </div>
        <form className="mt-5 flex gap-2" onSubmit={(e) => { e.preventDefault(); void add(); }}>
          <input
            className={cn(inputClass, code && 'font-mono tracking-wider')} value={code} maxLength={12}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
            placeholder="Código de tu amigo" aria-label="Código de tu amigo" autoCapitalize="characters" spellCheck={false}
          />
          <Button type="submit" icon="userPlus" disabled={busy || !code.trim()} className="shrink-0">Añadir</Button>
        </form>
        {msg && <p role="status" className={cn('text-sm mt-3 rounded-xl p-3', msg.tone === 'ok' ? 'bg-lily-soft text-lily-strong' : 'bg-danger-soft text-danger')}>{msg.text}</p>}
      </section>

      {error && <p className="mt-5 text-sm rounded-xl bg-danger-soft text-danger p-3">{error}</p>}

      {incoming.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-lg font-bold px-1 mb-3">Solicitudes<span className="ml-2 text-sm text-muted">{incoming.length}</span></h2>
          <ul className="flex flex-col gap-2">
            {incoming.map((p) => (
              <Row key={p.id} p={p} sub="Quiere ser tu amigo">
                <Button size="sm" variant="primary" onClick={() => void social.accept(p.id)}>Aceptar</Button>
                <IconButton icon="x" label={`Rechazar a @${p.username}`} onClick={() => void social.remove(p.id)} />
              </Row>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <h2 className="font-display text-lg font-bold px-1 mb-3">Tus amigos<span className="ml-2 text-sm text-muted">{friends.length}</span></h2>
        {friends.length === 0 ? (
          <EmptyState title="Tu charca está muy tranquila" art={<img src={art('ui/empty-friends.webp')} alt="" className="w-28 h-28 object-contain" />}>
            Comparte tu código o pulsa «Invitar» para mandar un enlace por WhatsApp.
          </EmptyState>
        ) : (
          <ul className="flex flex-col gap-2">
            {friends.map((p) => {
              const w = weekScore(p, week);
              return (
                <Row key={p.id} p={p} sub={`Nivel ${p.level} · ${w.tasks} ${w.tasks === 1 ? 'tarea' : 'tareas'} esta semana · racha ${p.streak}`}>
                  <IconButton icon="trash" label={`Quitar a @${p.username}`} className="hover:text-danger" onClick={() => setRemoving(p)} />
                </Row>
              );
            })}
          </ul>
        )}
      </section>

      {outgoing.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-lg font-bold px-1 mb-3">Enviadas<span className="ml-2 text-sm text-muted">{outgoing.length}</span></h2>
          <ul className="flex flex-col gap-2">
            {outgoing.map((p) => (
              <Row key={p.id} p={p} sub="Pendiente de aceptar">
                <Button size="sm" variant="ghost" onClick={() => void social.remove(p.id)}>Cancelar</Button>
              </Row>
            ))}
          </ul>
        </section>
      )}

      <Modal
        open={!!removing} onClose={() => setRemoving(null)} size="sm" title="¿Quitar de tus amigos?"
        footer={<><Button variant="ghost" onClick={() => setRemoving(null)}>Cancelar</Button><Button variant="danger" onClick={() => { if (removing) void social.remove(removing.id); setRemoving(null); }}>Quitar</Button></>}
      >
        <p className="text-[15px]">{removing?.frog_name} (@{removing?.username}) dejará de estar en tu charca y tú en la suya.</p>
      </Modal>
    </div>
  );
}
