import { useMemo, useState } from 'react';
import { addDays, formatShort, startOfWeek, WEEKDAYS_LETTER, type DateStr } from '../domain/dates';
import { limitsFor } from '../domain/plans';
import { completionsByList, dailyStats, habitsOverview, summary, type HabitDay } from '../domain/stats';
import { Icon } from '../components/ui/Icon';
import { EmptyState } from '../components/ui/controls';
import { cn } from '../lib/cn';
import { useApp, useToday } from '../store/appStore';
import { appStore } from '../store/appStore';

function Tile({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-2xl bg-surface border border-line p-4">
      <div className="text-sm text-muted">{label}</div>
      <div className="font-display text-[1.75rem] font-extrabold leading-tight tabular-nums mt-0.5">{value}</div>
      {sub && <div className="text-xs text-muted mt-0.5">{sub}</div>}
    </div>
  );
}

/** Barras de tareas completadas por día (una serie, sin leyenda: el título la nombra). */
function DailyBars({ data, today }: { data: { date: DateStr; completed: number }[]; today: DateStr }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(4, ...data.map((d) => d.completed));
  const H = 140;
  return (
    <div className="relative">
      <div className="flex items-end gap-[2px] h-[140px] border-b border-line" role="img" aria-label="Tareas completadas por día, últimas dos semanas">
        {data.map((d, i) => (
          <div key={d.date} className="relative flex-1 h-full flex items-end justify-center"
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onClick={() => setHover(i)}>
            <div
              className={cn('w-full max-w-7 rounded-t-[4px] transition-colors', d.completed ? (hover === i ? 'bg-lily-strong' : 'bg-lily') : 'bg-transparent')}
              style={{ height: `${(d.completed / max) * (H - 8)}px` }}
            />
            {hover === i && (
              <div className="absolute bottom-full mb-2 z-10 whitespace-nowrap rounded-lg bg-inverse text-on-inverse text-xs px-2 py-1 pointer-events-none">
                <span className="font-semibold">{d.completed}</span> {d.completed === 1 ? 'tarea' : 'tareas'} · {d.date === today ? 'hoy' : formatShort(d.date)}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-[2px] mt-1.5">
        {data.map((d, i) => (
          <div key={d.date} className={cn('flex-1 text-center text-[11px] text-muted', i % 2 === 1 && i !== data.length - 1 && 'max-sm:invisible')}>
            {d.date === today ? 'Hoy' : WEEKDAYS_LETTER[new Date(d.date).getUTCDay()]}
          </div>
        ))}
      </div>
    </div>
  );
}

const HEAT = ['bg-line/60', 'bg-lily/30', 'bg-lily/55', 'bg-lily/80', 'bg-lily-strong'];

function Heatmap({ weeks, today }: { weeks: number; today: DateStr }) {
  const history = useApp((s) => s.history);
  const [hover, setHover] = useState<{ date: DateStr; n: number } | null>(null);
  const cols = useMemo(() => {
    const start = addDays(startOfWeek(today, 1), -(weeks - 1) * 7);
    const counts = new Map<DateStr, number>();
    for (const h of history) if (h.type === 'complete') counts.set(h.date, (counts.get(h.date) ?? 0) + 1);
    return Array.from({ length: weeks }, (_, w) =>
      Array.from({ length: 7 }, (_, d) => {
        const date = addDays(start, w * 7 + d);
        return { date, n: counts.get(date) ?? 0, future: date > today };
      }),
    );
  }, [history, weeks, today]);
  const level = (n: number) => (n === 0 ? 0 : n <= 1 ? 1 : n <= 3 ? 2 : n <= 5 ? 3 : 4);
  return (
    <div>
      <div className="flex gap-[3px] overflow-x-auto scrollbar-none" role="img" aria-label={`Actividad de las últimas ${weeks} semanas`}>
        {cols.map((col, i) => (
          <div key={i} className="flex flex-col gap-[3px]">
            {col.map((c) => (
              <div key={c.date}
                onMouseEnter={() => setHover({ date: c.date, n: c.n })} onMouseLeave={() => setHover(null)}
                onClick={() => setHover({ date: c.date, n: c.n })}
                className={cn('w-[14px] h-[14px] sm:w-4 sm:h-4 rounded-[4px]', c.future ? 'bg-transparent' : HEAT[level(c.n)])} />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-2 text-xs text-muted min-h-5">
        <span>{hover ? `${formatShort(hover.date)}: ${hover.n} ${hover.n === 1 ? 'tarea' : 'tareas'}` : 'Toca un día para ver el detalle'}</span>
        <span className="flex items-center gap-1">Menos {HEAT.map((c) => <span key={c} className={cn('w-3 h-3 rounded-[3px]', c)} />)} Más</span>
      </div>
    </div>
  );
}

const habitCell: Record<HabitDay, { cls: string; label: string }> = {
  done: { cls: 'bg-lily border-lily', label: 'Hecho' },
  missed: { cls: 'border-danger/60 bg-danger-soft', label: 'No hecho' },
  pending: { cls: 'border-lily border-dashed', label: 'Pendiente hoy' },
  off: { cls: 'border-transparent', label: 'No tocaba' },
};

export function StatsPage() {
  const today = useToday();
  const history = useApp((s) => s.history);
  const tasks = useApp((s) => s.tasks);
  const plan = useApp((s) => s.meta.plan);
  const s = useMemo(() => summary(appStore.get(), today), [history, today]); // eslint-disable-line react-hooks/exhaustive-deps
  const daily = useMemo(() => dailyStats(appStore.get(), addDays(today, -13), today), [history, today]); // eslint-disable-line react-hooks/exhaustive-deps
  const byList = useMemo(() => completionsByList(appStore.get(), addDays(today, -29)), [history, today]); // eslint-disable-line react-hooks/exhaustive-deps
  const habits = useMemo(() => habitsOverview(appStore.get(), today, 7), [history, tasks, today]); // eslint-disable-line react-hooks/exhaustive-deps
  const weeks = Math.min(20, Math.floor(limitsFor(plan).statsDays / 7));
  const maxList = Math.max(1, ...byList.map((x) => x.count));

  return (
    <div>
      <header>
        <h1 className="font-display text-[2rem] leading-none font-extrabold tracking-tight">Estadísticas</h1>
        <p className="text-muted mt-1.5">Cómo vas, sin adornos.</p>
      </header>

      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Tile label="Racha actual" value={<span className="flex items-center gap-1">{s.currentStreak}<Icon name="flame" size={22} className="text-warn" /></span>} sub={`Mejor: ${s.bestStreak} ${s.bestStreak === 1 ? 'día' : 'días'}`} />
        <Tile label="Completadas" value={s.totalCompleted} sub={`${s.completedLastWeek} esta semana`} />
        <Tile label="XP en 7 días" value={`+${s.xpLastWeek}`} sub={s.xpLostLastWeek ? `${s.xpLostLastWeek} por retrasos` : 'Sin penalizaciones'} />
        <Tile label="Días perfectos" value={s.perfectDays} sub="Todo lo del día hecho" />
      </div>

      {s.totalCompleted === 0 ? (
        <EmptyState title="Aún no hay datos">Completa tu primera tarea y aquí empezarás a ver tu progreso.</EmptyState>
      ) : (
        <>
          <section className="mt-6 rounded-2xl bg-surface border border-line p-5">
            <h2 className="font-display text-lg font-bold">Tareas completadas por día</h2>
            <p className="text-sm text-muted mb-4">Últimas dos semanas</p>
            <DailyBars data={daily} today={today} />
          </section>

          <section className="mt-4 rounded-2xl bg-surface border border-line p-5">
            <h2 className="font-display text-lg font-bold">Constancia</h2>
            <p className="text-sm text-muted mb-4">Últimas {weeks} semanas{plan === 'free' ? ' · el historial completo es parte de Pro' : ''}</p>
            <Heatmap weeks={weeks} today={today} />
          </section>

          {habits.length > 0 && (
            <section className="mt-4 rounded-2xl bg-surface border border-line p-5">
              <h2 className="font-display text-lg font-bold">Hábitos</h2>
              <p className="text-sm text-muted mb-3">Tareas que se repiten, últimos 7 días</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-muted text-xs">
                      <th className="text-left font-medium py-1.5">Hábito</th>
                      {habits[0].cells.map((c) => <th key={c.date} className="font-medium w-8">{c.date === today ? 'Hoy' : WEEKDAYS_LETTER[new Date(c.date).getUTCDay()]}</th>)}
                      <th className="font-medium text-right w-16">Racha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {habits.map((h) => (
                      <tr key={h.task.id} className="border-t border-line">
                        <td className="py-2 pr-2 max-w-40 truncate">{h.task.title}</td>
                        {h.cells.map((c) => (
                          <td key={c.date} className="text-center">
                            <span title={habitCell[c.state].label} aria-label={habitCell[c.state].label}
                              className={cn('inline-flex w-5 h-5 rounded-full border-2 items-center justify-center text-on-lily', habitCell[c.state].cls)}>
                              {c.state === 'done' && <Icon name="check" size={11} strokeWidth={3.5} />}
                              {c.state === 'off' && <span className="w-2 h-0.5 rounded bg-line" />}
                            </span>
                          </td>
                        ))}
                        <td className="text-right font-semibold tabular-nums">{h.streak > 0 ? <span className="inline-flex items-center gap-0.5">{h.streak}<Icon name="flame" size={13} className="text-warn" /></span> : '–'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {byList.length > 0 && (
            <section className="mt-4 rounded-2xl bg-surface border border-line p-5">
              <h2 className="font-display text-lg font-bold">Por lista</h2>
              <p className="text-sm text-muted mb-4">Tareas completadas en los últimos 30 días</p>
              <div className="space-y-2.5">
                {byList.map(({ list, count }) => (
                  <div key={list.id} className="flex items-center gap-3 text-sm">
                    <span className="w-32 truncate shrink-0">{list.emoji} {list.name}</span>
                    <div className="flex-1 h-5 flex items-center">
                      <div className="h-3.5 rounded-r-[4px] bg-lily" style={{ width: `${(count / maxList) * 100}%` }} />
                    </div>
                    <span className="w-8 text-right font-semibold tabular-nums">{count}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
