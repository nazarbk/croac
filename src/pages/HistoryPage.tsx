import { useMemo, useState } from 'react';
import { art } from '../components/frog/art';
import { Button, IconButton } from '../components/ui/Button';
import { EmptyState, inputClass } from '../components/ui/controls';
import { Icon } from '../components/ui/Icon';
import { addDays, capitalize, dayOfMonth, diffDays, daysInMonth, formatLong, formatRelative, MONTHS, startOfWeek, WEEKDAYS_LETTER, type DateStr } from '../domain/dates';
import { limitsFor } from '../domain/plans';
import { templateOf, type TaskInput } from '../domain/tasks';
import type { HistoryEntry } from '../domain/types';
import { cn } from '../lib/cn';
import { appStore, useApp, useToday } from '../store/appStore';
import { useListsById } from '../store/selectors';
import { openScheduleAgain } from '../features/ScheduleAgain';

const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

function timeOf(at: number) {
  const d = new Date(at);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Plantilla para volver a programar: la tarea original si existe; si no, lo que guarda el historial. */
function templateFor(entry: HistoryEntry): TaskInput {
  const task = appStore.get().tasks.find((t) => t.id === entry.taskId);
  return task ? { ...templateOf(task), title: entry.title } : { title: entry.title, listId: entry.listId };
}

/** Primer día del mes de una fecha («2026-11-17» → «2026-11-01»). */
const monthStart = (d: DateStr) => `${d.slice(0, 7)}-01`;
const shiftMonth = (m: DateStr, n: number) => {
  const y = Number(m.slice(0, 4));
  const mi = Number(m.slice(5, 7)) - 1 + n;
  const yy = y + Math.floor(mi / 12);
  const mm = ((mi % 12) + 12) % 12;
  return `${yy}-${String(mm + 1).padStart(2, '0')}-01`;
};

interface DayInfo {
  done: HistoryEntry[];
  other: HistoryEntry[];
  xp: number;
  coins: number;
}

export function HistoryPage() {
  const today = useToday();
  const history = useApp((s) => s.history);
  const plan = useApp((s) => s.meta.plan);
  const perfect = useApp((s) => s.meta.perfectDays);
  const weekStartsOn = useApp((s) => s.settings.weekStartsOn);
  const lists = useListsById();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<DateStr>(today);
  const [month, setMonth] = useState<DateStr>(monthStart(today));
  const from = addDays(today, -(limitsFor(plan).statsDays - 1));
  const perfectSet = useMemo(() => new Set(perfect), [perfect]);

  // Todo lo que pasó cada día (lo completado y, aparte, premios, penalizaciones y compras).
  const byDay = useMemo(() => {
    const map = new Map<DateStr, DayInfo>();
    for (const h of history) {
      if (h.date < from) continue;
      const d = map.get(h.date) ?? { done: [], other: [], xp: 0, coins: 0 };
      (h.type === 'complete' ? d.done : d.other).push(h);
      d.xp += h.xp;
      d.coins += h.coins;
      map.set(h.date, d);
    }
    for (const d of map.values()) {
      d.done.sort((a, b) => b.at - a.at);
      d.other.sort((a, b) => b.at - a.at);
    }
    return map;
  }, [history, from]);

  // Con búsqueda: resultados de todos los días, como lista.
  const results = useMemo(() => {
    const q = fold(query.trim());
    if (!q) return null;
    return [...byDay.entries()]
      .map(([date, d]) => ({ date, items: d.done.filter((h) => fold(h.title).includes(q)) }))
      .filter((d) => d.items.length)
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [byDay, query]);

  const max = useMemo(() => Math.max(1, ...[...byDay.values()].map((d) => d.done.length)), [byDay]);
  const firstMonth = monthStart(from);
  const thisMonth = monthStart(today);
  const gridStart = startOfWeek(month, weekStartsOn);
  const len = daysInMonth(Number(month.slice(0, 4)), Number(month.slice(5, 7)));
  const monthEnd = addDays(month, len - 1);
  const cells = Math.ceil((diffDays(month, gridStart) + len) / 7) * 7;
  const letters = Array.from({ length: 7 }, (_, i) => WEEKDAYS_LETTER[(i + weekStartsOn) % 7]);
  const day = byDay.get(selected);
  const monthDone = [...byDay.entries()].filter(([d]) => d >= month && d <= monthEnd).reduce((n, [, d]) => n + d.done.length, 0);

  const pickDay = (d: DateStr) => {
    setSelected(d);
    if (monthStart(d) !== month) setMonth(monthStart(d));
  };

  return (
    <div>
      <header>
        <h1 className="font-display text-[2rem] leading-none font-extrabold tracking-tight">Historial</h1>
        <p className="text-muted mt-2">Elige un día para ver lo que hiciste. Pulsa «Repetir» para volver a programar una tarea.</p>
      </header>

      <div className="relative mt-5">
        <Icon name="search" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar en el historial" aria-label="Buscar en el historial" className={cn(inputClass, 'pl-10')} />
      </div>

      {results ? (
        results.length === 0 ? (
          <EmptyState art={<img src={art('ui/empty-tasks.webp')} alt="" className="w-28 h-28 object-contain" />} title="Sin resultados">
            {`Nada en el historial contiene "${query}".`}
          </EmptyState>
        ) : (
          results.map(({ date, items }) => (
            <section key={date} className="mt-7">
              <button type="button" onClick={() => { setQuery(''); pickDay(date); }} className="font-display text-lg font-bold px-1 mb-3 hover:text-lily-strong">
                {dayTitle(date, today)}<span className="ml-2 text-sm font-semibold text-muted tabular-nums">{items.length}</span>
              </button>
              <div className="flex flex-col gap-2">{items.map((h) => <DoneRow key={h.id} h={h} lists={lists} />)}</div>
            </section>
          ))
        )
      ) : (
        <>
          <section className="mt-5 rounded-3xl border border-line bg-surface shadow-card p-4 sm:p-5" aria-label="Calendario">
            <div className="flex items-center justify-between gap-2">
              <IconButton icon="chevronLeft" label="Mes anterior" disabled={month <= firstMonth} onClick={() => setMonth(shiftMonth(month, -1))} />
              <div className="text-center">
                <div className="font-display text-lg font-bold">{capitalize(MONTHS[Number(month.slice(5, 7)) - 1])} {month.slice(0, 4)}</div>
                <div className="text-[13px] text-muted">{monthDone} {monthDone === 1 ? 'tarea hecha' : 'tareas hechas'}</div>
              </div>
              <IconButton icon="chevronRight" label="Mes siguiente" disabled={month >= thisMonth} onClick={() => setMonth(shiftMonth(month, 1))} />
            </div>
            <div className="mt-4 mx-auto max-w-[26rem] grid grid-cols-7 gap-1 text-center" role="grid">
              {letters.map((l, i) => <div key={i} className="text-[12px] font-semibold text-muted pb-1" aria-hidden="true">{l}</div>)}
              {Array.from({ length: cells }, (_, i) => {
                const d = addDays(gridStart, i);
                const inMonth = d >= month && d <= monthEnd;
                const n = byDay.get(d)?.done.length ?? 0;
                const future = d > today;
                const locked = d < from;
                const isSel = d === selected;
                const level = n === 0 ? 0 : Math.min(4, Math.ceil((n / max) * 4));
                return (
                  <button
                    key={d}
                    type="button"
                    disabled={future || locked || !inMonth}
                    onClick={() => pickDay(d)}
                    aria-pressed={isSel}
                    aria-label={`${formatLong(d)}: ${n} ${n === 1 ? 'tarea' : 'tareas'}${perfectSet.has(d) ? ', día perfecto' : ''}`}
                    className={cn(
                      'relative aspect-square rounded-xl flex flex-col items-center justify-center text-[14px] tabular-nums transition-colors',
                      !inMonth && 'invisible',
                      (future || locked) && 'text-muted/50',
                      level === 1 && 'bg-lily/15', level === 2 && 'bg-lily/30', level === 3 && 'bg-lily/50', level === 4 && 'bg-lily/70 text-on-lily',
                      !future && !locked && inMonth && level === 0 && 'hover:bg-surface-2',
                      d === today && 'font-bold',
                      isSel && 'ring-2 ring-lily-strong ring-offset-2 ring-offset-surface',
                    )}
                  >
                    {dayOfMonth(d)}
                    {perfectSet.has(d) && <Icon name="star" size={10} className="absolute top-1 right-1 text-coin" />}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 mx-auto max-w-[26rem] flex flex-wrap items-center justify-end gap-1.5 text-[12px] text-muted">
              Menos {[0, 1, 2, 3, 4].map((l) => <span key={l} className={cn('w-3 h-3 rounded', l === 0 ? 'bg-surface-2' : l === 1 ? 'bg-lily/15' : l === 2 ? 'bg-lily/30' : l === 3 ? 'bg-lily/50' : 'bg-lily/70')} />)} Más
              <span className="ml-3 flex items-center gap-1"><Icon name="star" size={11} className="text-coin" />día perfecto</span>
            </div>
          </section>

          <section className="mt-6" aria-live="polite">
            <div className="flex items-baseline justify-between gap-3 px-1 mb-3">
              <h2 className="font-display text-lg font-bold">{dayTitle(selected, today)}</h2>
              {day && (
                <span className="text-sm text-muted tabular-nums">
                  <span className={cn('font-semibold', day.xp >= 0 ? 'text-lily-strong' : 'text-danger')}>{day.xp >= 0 ? '+' : ''}{day.xp} XP</span>
                  {day.coins !== 0 && <> · {day.coins > 0 ? '+' : ''}{day.coins} monedas</>}
                </span>
              )}
            </div>
            {!day || (day.done.length === 0 && day.other.length === 0) ? (
              <p className="px-1 text-muted">{selected === today ? 'Hoy todavía no has completado nada. ¡A por ello!' : 'Ese día no completaste ninguna tarea.'}</p>
            ) : (
              <>
                <div className="flex flex-col gap-2">{day.done.map((h) => <DoneRow key={h.id} h={h} lists={lists} />)}</div>
                {day.other.length > 0 && (
                  <ul className="mt-3 flex flex-col gap-1.5 px-1">
                    {day.other.map((h) => (
                      <li key={h.id} className="flex items-center gap-2 text-sm text-muted">
                        <Icon name={h.type === 'penalty' ? 'alert' : h.type === 'purchase' ? 'bag' : 'sparkles'} size={14} className={h.type === 'penalty' ? 'text-danger' : h.type === 'purchase' ? '' : 'text-coin'} />
                        <span className="flex-1 min-w-0 truncate">{h.title}</span>
                        <span className="tabular-nums">{h.xp ? `${h.xp > 0 ? '+' : ''}${h.xp} XP` : ''}{h.xp && h.coins ? ' · ' : ''}{h.coins ? `${h.coins > 0 ? '+' : ''}${h.coins} monedas` : ''}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function dayTitle(date: DateStr, today: DateStr) {
  return ['Hoy', 'Ayer'].includes(formatRelative(date, today)) ? `${formatRelative(date, today)}, ${formatLong(date)}` : capitalize(formatLong(date));
}

function DoneRow({ h, lists }: { h: HistoryEntry; lists: ReturnType<typeof useListsById> }) {
  const list = h.listId ? lists.get(h.listId) : undefined;
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface shadow-card pl-4 pr-1.5 py-1.5">
      <span className="w-[22px] h-[22px] rounded-full bg-lily text-on-lily flex items-center justify-center shrink-0" aria-hidden="true">
        <Icon name="check" size={13} strokeWidth={3.2} />
      </span>
      <div className="flex-1 min-w-0 py-1.5">
        <div className="text-[15px] font-medium leading-snug break-words">{h.title}</div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] text-muted mt-0.5">
          <span className="tabular-nums">{timeOf(h.at)}</span>
          <span className="text-lily-strong font-semibold tabular-nums">+{h.xp} XP</span>
          {list && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: list.color }} />{list.name}</span>}
        </div>
      </div>
      <Button size="sm" icon="calendarPlus" onClick={() => openScheduleAgain(templateFor(h))} aria-label={`Programar de nuevo "${h.title}"`} className="shrink-0">
        Repetir
      </Button>
    </div>
  );
}
