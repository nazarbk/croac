import { useEffect, useMemo, useState } from 'react';
import { Frog } from '../components/frog/Frog';
import { IconButton } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { Modal } from '../components/ui/Modal';
import { stageForLevel } from '../domain/progression';
import { cn } from '../lib/cn';
import { href } from '../lib/router';
import { currentWeekStart, statsFrom, useAccount } from '../services/account';
import { social, useSocial, weekScore } from '../services/social';
import type { Profile } from '../services/types';
import { appStore, useApp, useToday } from '../store/appStore';
import { useUi } from '../store/uiStore';
import { NeedsAccount } from './FriendsPage';

/** Posiciones de los nenúfares (x %, y %, tamaño %). El primero es el tuyo. */
const SLOTS: [number, number, number][] = [
  [50, 63, 28], [20, 55, 21], [80, 55, 21], [34, 30, 18], [66, 30, 18],
  [10, 27, 15], [90, 27, 15], [50, 14, 15], [24, 11, 12], [76, 11, 12],
];

interface PondFrog {
  id: string;
  me: boolean;
  name: string;
  username: string;
  level: number;
  mood: Profile['mood'];
  equipped: Profile['equipped'];
  streak: number;
  week: { xp: number; tasks: number };
  total: number;
}

function PondBackground() {
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full" aria-hidden="true">
      <defs>
        <linearGradient id="pond-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--scene-sky-2)' }} />
          <stop offset="0.18" style={{ stopColor: 'var(--scene-water)' }} />
          <stop offset="1" style={{ stopColor: 'var(--scene-water)' }} />
        </linearGradient>
        <radialGradient id="pond-light" cx="0.5" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#fff" stopOpacity=".25" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="300" fill="url(#pond-water)" />
      <rect width="400" height="300" fill="url(#pond-light)" />
      <g style={{ stroke: 'var(--scene-ripple)' }} strokeWidth="2.5" strokeLinecap="round" fill="none" opacity=".8">
        <path d="M30 120 h50 M300 140 h60 M120 250 h70 M250 270 h50 M170 90 h40" />
        <ellipse cx="330" cy="225" rx="26" ry="7" /><ellipse cx="70" cy="200" rx="18" ry="5" />
      </g>
      <g style={{ stroke: 'var(--scene-reeds)' }} strokeWidth="4" strokeLinecap="round" fill="none">
        <path d="M8 300 Q4 230 14 180" /><path d="M20 300 Q22 250 30 215" /><path d="M392 300 Q398 240 386 196" /><path d="M380 300 Q376 260 370 236" />
      </g>
      <rect x="10" y="172" width="8" height="22" rx="4" fill="#8a5a3b" transform="rotate(8 14 183)" />
      <rect x="382" y="190" width="8" height="22" rx="4" fill="#8a5a3b" transform="rotate(-8 386 201)" />
    </svg>
  );
}

function LilyPad() {
  return (
    <svg viewBox="0 0 120 40" className="absolute left-1/2 -translate-x-1/2 bottom-[-4%] w-[118%]" aria-hidden="true">
      <path d="M8 20 A52 17 0 1 0 112 20 A52 17 0 0 0 76 5 L60 20 L50 4 A52 17 0 0 0 8 20 Z" style={{ fill: 'var(--scene-pad)' }} />
      <path d="M60 20 L36 30 M60 20 L84 31 M60 20 L104 19" stroke="rgba(0,0,0,.12)" strokeWidth="1.5" />
    </svg>
  );
}

export function PondPage() {
  const { session, profile } = useAccount();
  const { friends, loading } = useSocial();
  const today = useToday();
  const week = currentWeekStart(today);
  const history = useApp((s) => s.history);
  const frog = useApp((s) => s.frog);
  const hop = useUi((s) => s.hop);
  const [selected, setSelected] = useState<PondFrog | null>(null);

  useEffect(() => {
    if (session && profile) void social.refresh();
  }, [session, profile]);

  const me = useMemo<PondFrog>(() => {
    const st = statsFrom(appStore.get());
    return {
      id: 'me', me: true, name: frog.name, username: profile?.username ?? 'tú', level: st.level, mood: st.mood,
      equipped: frog.equipped, streak: st.streak, week: { xp: st.week_xp, tasks: st.week_tasks }, total: st.total_tasks,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frog, history, today, profile]);

  const frogs = useMemo<PondFrog[]>(() => [
    me,
    ...friends.map((p) => ({
      id: p.id, me: false, name: p.frog_name, username: p.username, level: p.level, mood: p.mood,
      equipped: p.equipped, streak: p.streak, week: weekScore(p, week), total: p.total_tasks,
    })),
  ], [me, friends, week]);

  const ranking = [...frogs].sort((a, b) => b.week.xp - a.week.xp || b.week.tasks - a.week.tasks);
  const leaderId = ranking.length > 1 && ranking[0].week.xp > 0 ? ranking[0].id : null;
  const maxXp = Math.max(1, ...ranking.map((f) => f.week.xp));
  const visible = frogs.slice(0, SLOTS.length);

  return (
    <div>
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-[2rem] leading-none font-extrabold tracking-tight">La charca</h1>
          <p className="text-muted mt-2">Tu rana y las de tus amigos. Gana quien más experiencia consiga esta semana.</p>
        </div>
        {session && profile && <IconButton icon="refresh" label="Actualizar" onClick={() => void social.refresh()} className={cn(loading && 'animate-spin')} />}
      </header>

      <div className={cn('relative isolate mt-6 rounded-[1.75rem] overflow-hidden border border-line shadow-card sm:aspect-[16/10]', visible.length <= 3 ? 'aspect-[5/4]' : 'aspect-square')}>
        <PondBackground />
        {visible.map((f, i) => {
          const [x, y, size] = SLOTS[i];
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setSelected(f)}
              className="absolute -translate-x-1/2 -translate-y-1/2 group focus-visible:outline-none"
              style={{ left: `${x}%`, top: `${y}%`, width: `${size}%`, zIndex: Math.round(y) }}
              aria-label={`${f.name}${f.me ? ' (tú)' : ` de @${f.username}`}, nivel ${f.level}`}
            >
              <div className="relative aspect-square">
                <LilyPad />
                <Frog level={f.level} mood={f.mood} equipped={{ ...f.equipped, background: undefined }} hopKey={f.me ? hop : 0} className="relative w-full h-full" />
                {f.id === leaderId && (
                  <span className="absolute top-[8%] -right-[2%] w-7 h-7 rounded-full bg-coin text-[#3d2a00] flex items-center justify-center shadow-card ring-2 ring-raised" title="Líder de la semana">
                    <Icon name="trophy" size={15} />
                  </span>
                )}
              </div>
              <span className={cn(
                'mt-1 inline-block max-w-full truncate rounded-full px-2.5 py-0.5 text-[11px] sm:text-xs font-semibold shadow-card',
                f.me ? 'bg-lily text-on-lily' : 'bg-raised/90 text-ink',
                'group-focus-visible:ring-2 group-focus-visible:ring-lily',
              )}>
                {f.me ? 'Tú' : f.name} · {f.level}
              </span>
            </button>
          );
        })}
      </div>

      {!session || !profile ? (
        <NeedsAccount title="Invita a tus amigos a tu charca">
          Con una cuenta puedes añadir amigos con un código, ver sus ranas aquí y competir cada semana por completar más tareas.
        </NeedsAccount>
      ) : (
        <section className="mt-8">
          <div className="flex items-center justify-between px-1 mb-3">
            <h2 className="font-display text-lg font-bold">Esta semana</h2>
            <a href={href('amigos')} className="text-sm font-semibold text-lily-strong hover:underline">Gestionar amigos</a>
          </div>
          <ol className="flex flex-col gap-2">
            {ranking.map((f, i) => (
              <li key={f.id} className={cn('flex items-center gap-3 rounded-2xl border bg-surface shadow-card p-2.5 pr-4', f.me ? 'border-lily/50' : 'border-line')}>
                <span className={cn('w-7 text-center font-display font-bold tabular-nums', i === 0 && f.week.xp > 0 ? 'text-coin' : 'text-muted')}>{i + 1}</span>
                <span className="shrink-0 w-11 h-11 rounded-xl bg-lily-soft overflow-hidden">
                  <Frog level={f.level} mood={f.mood} equipped={{ ...f.equipped, background: undefined }} className="w-full h-full scale-110 translate-y-0.5" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{f.name} <span className="text-muted font-normal">{f.me ? '(tú)' : `@${f.username}`}</span></div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-line overflow-hidden">
                    <div className="h-full rounded-full bg-xp-grad" style={{ width: `${(f.week.xp / maxXp) * 100}%` }} />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold tabular-nums">{f.week.xp} XP</div>
                  <div className="text-xs text-muted tabular-nums">{f.week.tasks} {f.week.tasks === 1 ? 'tarea' : 'tareas'}</div>
                </div>
              </li>
            ))}
          </ol>
          {friends.length === 0 && (
            <div className="mt-4 rounded-2xl border border-dashed border-line p-5 text-center">
              <p className="text-muted">Aún no tienes amigos en la charca.</p>
              <a href={href('amigos')} className="inline-flex items-center gap-2 mt-3 h-11 px-4.5 rounded-xl bg-lily bg-primary-grad text-on-lily font-semibold hover:brightness-105">
                <Icon name="userPlus" size={18} />Añadir amigos
              </a>
            </div>
          )}
          <p className="text-[13px] text-muted mt-4 px-1">La clasificación se reinicia cada lunes. Cuenta la experiencia ganada completando tareas y días perfectos.</p>
        </section>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} size="sm" title={selected ? `${selected.name}${selected.me ? ' (tú)' : ''}` : ''}>
        {selected && (
          <div className="text-center">
            <Frog level={selected.level} mood={selected.mood} equipped={selected.equipped} scene className="w-40 h-40 mx-auto rounded-[1.5rem]" />
            {!selected.me && <p className="text-muted mt-3">@{selected.username}</p>}
            <p className="font-semibold mt-1">{stageForLevel(selected.level).name} · nivel {selected.level}</p>
            <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[['Esta semana', `${selected.week.xp} XP`], ['Racha', `${selected.streak} ${selected.streak === 1 ? 'día' : 'días'}`], ['Total', `${selected.total} tareas`]].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-surface-2 p-2.5">
                  <dt className="text-xs text-muted">{k}</dt>
                  <dd className="font-bold tabular-nums mt-0.5">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </Modal>
    </div>
  );
}
