import { useMemo } from 'react';
import { addDays, capitalize, formatLong, formatRelative, rangeDays, type DateStr } from '../domain/dates';
import { isRecurring, occurrencesBetween } from '../domain/recurrence';
import type { Task } from '../domain/types';
import { TaskItem } from '../components/tasks/TaskItem';
import { IconButton } from '../components/ui/Button';
import { useApp, useToday } from '../store/appStore';
import { useListsById, useStreaks, useTaskCompare } from '../store/selectors';
import { TaskGroup } from './TodayPage';
import { ui } from '../store/uiStore';

const DAYS = 14;

export function UpcomingPage() {
  const today = useToday();
  const tasks = useApp((s) => s.tasks);
  const lists = useListsById();
  const streaks = useStreaks();
  const compare = useTaskCompare();
  const grace = useApp((s) => s.settings.graceDays);

  const days = useMemo(() => {
    const end = addDays(today, DAYS - 1);
    const map = new Map<DateStr, { real: Task[]; ghost: Task[] }>(rangeDays(today, end).map((d) => [d, { real: [], ghost: [] }]));
    for (const t of tasks) {
      if (t.status === 'done' || !t.dueDate) continue;
      const slot = map.get(t.dueDate);
      if (slot) slot.real.push(t);
      // Proyecta las siguientes ocurrencias de las recurrentes (solo lectura).
      if (isRecurring(t.recurrence) && t.anchorDate) {
        const from = addDays(t.dueDate < today ? today : t.dueDate, 1);
        for (const d of occurrencesBetween(t.recurrence, t.anchorDate, from, end)) map.get(d)?.ghost.push(t);
      }
    }
    return [...map.entries()].map(([date, v]) => ({ date, real: v.real.sort(compare), ghost: v.ghost.sort(compare) }));
  }, [tasks, today, compare]);

  return (
    <div>
      <header>
        <h1 className="font-display text-[2rem] leading-none font-extrabold tracking-tight">Próximo</h1>
        <p className="text-muted mt-1.5">Las próximas dos semanas. Las repeticiones futuras aparecen atenuadas.</p>
      </header>
      <div className="mt-4">
        {days.map(({ date, real, ghost }) => (
          <section key={date} className="mt-5">
            <div className="sticky top-[4.75rem] xl:top-0 z-10 bg-bg/95 backdrop-blur flex items-center justify-between px-3 py-2 border-b border-line">
              <h2 className="text-[15px]">
                {['Hoy', 'Mañana'].includes(formatRelative(date, today)) ? (
                  <><span className="font-display font-bold">{formatRelative(date, today)}</span><span className="text-muted ml-2">{formatLong(date)}</span></>
                ) : (
                  <span className="font-display font-bold">{capitalize(formatLong(date))}</span>
                )}
              </h2>
              <IconButton icon="plus" label="Añadir tarea este día" size={16} className="w-8 h-8" onClick={() => ui.openEditor(null, { date })} />
            </div>
            {real.length === 0 && ghost.length === 0 ? (
              <p className="px-3 py-3 text-sm text-muted/80">Nada previsto</p>
            ) : (
              <div className="flex flex-col gap-2 pt-3">
                <TaskGroup tasks={real} today={today} lists={lists} streaks={streaks} graceDays={grace} showDate={false} />
                {ghost.map((t) => <TaskItem key={`${t.id}-${date}`} task={t} today={today} list={lists.get(t.listId)} showDate={false} ghost />)}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
