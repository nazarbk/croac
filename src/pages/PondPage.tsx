import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { art } from '../components/frog/art';
import { Frog } from '../components/frog/Frog';
import { IconButton } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { Modal } from '../components/ui/Modal';
import { stageForLevel } from '../domain/progression';
import { cn } from '../lib/cn';
import { href } from '../lib/router';
import { currentWeekStart, statsFrom, useAccount } from '../services/account';
import { lastWeekScore, social, useSocial, weekScore } from '../services/social';
import type { Profile } from '../services/types';
import { appStore, useApp, useToday } from '../store/appStore';
import { useUi } from '../store/uiStore';
import { NeedsAccount } from './FriendsPage';

/**
 * Nenúfares pintados en las ilustraciones de la charca: centro x %, centro y %, ancho %.
 * [móvil (imagen cuadrada), escritorio (imagen panorámica)]. El primero es el tuyo.
 */
const SLOTS: [[number, number, number], [number, number, number]][] = [
  [[50, 67, 27], [50, 70, 27]], [[19, 67, 27], [19, 70, 27]], [[81, 67, 27], [81, 70, 27]],
  [[38.5, 46, 20], [39, 44, 16.5]], [[61, 46, 20], [61, 44, 16.5]], [[15.5, 46, 20], [17, 44, 16.5]], [[84.5, 46, 20], [83.5, 44, 16.5]],
  [[50, 29, 15], [50, 27, 10]], [[27, 29, 15], [30, 27, 10]], [[73, 29, 15], [70, 27, 10]],
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
  last: { xp: number; tasks: number };
  xp: number;
  total: number;
}

const pondArt = (name: string) => art(`pond/${name}.webp`);

function PondBackground() {
  return (
    <>
      <picture className="dark:hidden">
        <source media="(min-width: 640px)" srcSet={pondArt('day-wide')} />
        <img src={pondArt('day-square')} alt="" className="absolute inset-0 w-full h-full object-cover" />
      </picture>
      <picture className="hidden dark:block">
        <source media="(min-width: 640px)" srcSet={pondArt('night-wide')} />
        <img src={pondArt('night-square')} alt="" className="absolute inset-0 w-full h-full object-cover" />
      </picture>
    </>
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
      last: { xp: st.last_week_xp ?? 0, tasks: st.last_week_tasks ?? 0 }, xp: st.xp,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frog, history, today, profile]);

  const frogs = useMemo<PondFrog[]>(() => [
    me,
    ...friends.map((p) => ({
      id: p.id, me: false, name: p.frog_name, username: p.username, level: p.level, mood: p.mood,
      equipped: p.equipped, streak: p.streak, week: weekScore(p, week), total: p.total_tasks,
      last: lastWeekScore(p, week), xp: p.xp,
    })),
  ], [me, friends, week]);

  const ranking = [...frogs].sort((a, b) => b.week.xp - a.week.xp || b.week.tasks - a.week.tasks);
  const leaderId = ranking.length > 1 && ranking[0].week.xp > 0 ? ranking[0].id : null;
  const maxXp = Math.max(1, ...ranking.map((f) => f.week.xp));
  // El lunes la clasificación vuelve a cero: se explica y se enseña quién ganó la semana pasada.
  const freshWeek = ranking.every((f) => f.week.xp === 0);
  const lastWinner = [...frogs].sort((a, b) => b.last.xp - a.last.xp)[0];
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

      <div className="relative isolate mt-6 rounded-[1.75rem] overflow-hidden border border-line shadow-card aspect-square sm:aspect-[1586/992]">
        <PondBackground />
        {visible.map((f, i) => {
          const [[x, y, w], [xw, yw, ww]] = SLOTS[i];
          const vars = { '--x': `${x}%`, '--y': `${y + 1}%`, '--w': `${w * 0.92}%`, '--xw': `${xw}%`, '--yw': `${yw + 1}%`, '--ww': `${ww * 0.92}%`, zIndex: Math.round(y) } as CSSProperties;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setSelected(f)}
              className="absolute -translate-x-1/2 -translate-y-full group focus-visible:outline-none left-[var(--x)] top-[var(--y)] w-[var(--w)] sm:left-[var(--xw)] sm:top-[var(--yw)] sm:w-[var(--ww)]"
              style={vars}
              aria-label={`${f.name}${f.me ? ' (tú)' : ` de @${f.username}`}, nivel ${f.level}`}
            >
              <span className="relative block aspect-square transition-transform group-hover:-translate-y-1">
                <Frog level={f.level} mood={f.mood} equipped={{ ...f.equipped, background: undefined }} hopKey={f.me ? hop : 0} className="w-full h-full drop-shadow-[0_6px_6px_rgb(0_0_0/0.18)]" />
                {f.id === leaderId && (
                  <img src={art('ui/trophy.webp')} alt="" title="Líder de la semana" className="absolute -top-[6%] -right-[8%] w-[34%] min-w-6 drop-shadow" />
                )}
              </span>
              <span className={cn(
                'absolute left-1/2 -translate-x-1/2 top-[92%] max-w-[160%] truncate rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-semibold shadow-card whitespace-nowrap',
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
          {freshWeek && (
            <div className="mb-3 rounded-2xl border border-lily/30 bg-lily-soft px-4 py-3 text-[14px] leading-snug">
              <strong>¡Semana nueva!</strong> La clasificación empieza de cero cada lunes; los niveles y la experiencia de cada rana siguen intactos.
              {lastWinner && lastWinner.last.xp > 0 && (
                <> La semana pasada ganó <strong>{lastWinner.me ? 'tu rana' : lastWinner.name}</strong> con {lastWinner.last.xp} XP.</>
              )}
            </div>
          )}
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
                  <div className="text-xs text-muted tabular-nums">
                    {freshWeek && f.last.xp > 0 ? `semana pasada ${f.last.xp} XP` : `${f.week.tasks} ${f.week.tasks === 1 ? 'tarea' : 'tareas'}`}
                  </div>
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
            <dl className="mt-4 grid grid-cols-2 gap-2 text-center">
              {[['Esta semana', `${selected.week.xp} XP`], ['Semana pasada', `${selected.last.xp} XP`], ['Racha', `${selected.streak} ${selected.streak === 1 ? 'día' : 'días'}`], ['Total', `${selected.total} tareas`]].map(([k, v]) => (
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
