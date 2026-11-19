import { useMemo, useState } from 'react';
import { art } from '../components/frog/art';
import { Button } from '../components/ui/Button';
import { EmptyState, inputClass } from '../components/ui/controls';
import { Icon } from '../components/ui/Icon';
import { addDays, capitalize, formatLong, formatRelative, type DateStr } from '../domain/dates';
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

export function HistoryPage() {
  const today = useToday();
  const history = useApp((s) => s.history);
  const plan = useApp((s) => s.meta.plan);
  const lists = useListsById();
  const [query, setQuery] = useState('');
  const from = addDays(today, -(limitsFor(plan).statsDays - 1));

  const days = useMemo(() => {
    const q = fold(query.trim());
    const map = new Map<DateStr, HistoryEntry[]>();
    for (const h of history) {
      if (h.type !== 'complete' || h.date < from) continue;
      if (q && !fold(h.title).includes(q)) continue;
      const arr = map.get(h.date) ?? [];
      arr.push(h);
      map.set(h.date, arr);
    }
    return [...map.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([date, items]) => ({ date, items: items.sort((a, b) => b.at - a.at) }));
  }, [history, query, from]);

  return (
    <div>
      <header>
        <h1 className="font-display text-[2rem] leading-none font-extrabold tracking-tight">Historial</h1>
        <p className="text-muted mt-2">Lo que has completado. Pulsa «Repetir» para volver a hacer una tarea otro día, o varios.</p>
      </header>

      <div className="relative mt-5">
        <Icon name="search" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar en el historial" aria-label="Buscar en el historial" className={cn(inputClass, 'pl-10')} />
      </div>

      {days.length === 0 ? (
        <EmptyState art={<img src={art('ui/empty-tasks.webp')} alt="" className="w-28 h-28 object-contain" />} title={query ? 'Sin resultados' : 'Aún no has completado tareas'}>
          {query ? `Nada en el historial contiene "${query}".` : 'Cuando completes tareas aparecerán aquí, agrupadas por día.'}
        </EmptyState>
      ) : (
        days.map(({ date, items }) => (
          <section key={date} className="mt-8">
            <h2 className="font-display text-lg font-bold px-1 mb-3">
              {['Hoy', 'Ayer'].includes(formatRelative(date, today)) ? formatRelative(date, today) : capitalize(formatLong(date))}
              <span className="ml-2 text-sm font-semibold text-muted tabular-nums">{items.length}</span>
            </h2>
            <div className="flex flex-col gap-2">
              {items.map((h) => {
                const list = h.listId ? lists.get(h.listId) : undefined;
                return (
                  <div key={h.id} className="flex items-center gap-3 rounded-2xl border border-line bg-surface shadow-card pl-4 pr-1.5 py-1.5">
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
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
