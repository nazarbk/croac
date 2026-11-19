import { useState } from 'react';
import { MiniCalendar } from '../components/common/MiniCalendar';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { addDays, formatRelative, weekday, type DateStr } from '../domain/dates';
import type { Weekday } from '../domain/recurrence';
import type { TaskInput } from '../domain/tasks';
import { cn } from '../lib/cn';
import { actions } from '../store/actions';
import { createStore, useStore } from '../store/createStore';
import { useToday } from '../store/appStore';
import { ui } from '../store/uiStore';

/* Se puede abrir desde el historial o desde el menú de cualquier tarea. */
const store = createStore<{ template: TaskInput | null }>({ template: null });
export const openScheduleAgain = (template: TaskInput) => store.set({ template });

/** Elegir uno o varios días para volver a hacer una tarea (crea una copia por día). */
export function ScheduleAgain() {
  const template = useStore(store, (s) => s.template);
  const today = useToday();
  const [dates, setDates] = useState<DateStr[]>([]);
  const toggle = (d: DateStr) => setDates((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  const nextMonday = addDays(today, ((8 - weekday(today)) % 7) || 7);
  const quick: { label: string; days: DateStr[] }[] = [
    { label: 'Hoy', days: [today] },
    { label: 'Mañana', days: [addDays(today, 1)] },
    { label: 'Próx. 3 días', days: [0, 1, 2].map((n) => addDays(today, n)) },
    { label: 'Próx. lunes', days: [nextMonday] },
  ];

  const close = () => {
    setDates([]);
    store.set({ template: null });
  };

  if (!template) return null;

  const schedule = () => {
    const copies = actions.scheduleCopies(template, dates);
    ui.toast({
      message: copies.length === 1 ? `Programada para ${formatRelative(copies[0].dueDate!, today).toLowerCase()}` : `Programada en ${copies.length} días`,
      action: { label: 'Deshacer', run: () => actions.removeTasks(copies.map((c) => c.id)) },
    });
    close();
  };

  const makeRecurring = () => {
    const tpl = template;
    close();
    ui.openEditor(null, { date: today, template: { ...tpl, recurrence: { type: 'weekly', interval: 1, days: [weekday(today) as Weekday] } } });
  };

  return (
    <Modal
      open
      onClose={close}
      title="Programar de nuevo"
      footer={
        <>
          <Button variant="ghost" icon="repeat" className="mr-auto px-2.5" onClick={makeRecurring}>Que se repita</Button>
          <Button variant="primary" onClick={schedule} disabled={!dates.length}>
            {dates.length > 1 ? `Programar ${dates.length} días` : 'Programar'}
          </Button>
        </>
      }
    >
      <p className="text-[15px] font-semibold leading-snug break-words">{template.title}</p>
      <p className="text-sm text-muted mt-1">Elige uno o varios días. Se crea una tarea para cada día.</p>
      <div className="flex flex-wrap gap-1.5 mt-4">
        {quick.map((q) => {
          const on = q.days.every((d) => dates.includes(d));
          return (
            <button
              key={q.label}
              type="button"
              onClick={() => setDates((prev) => (on ? prev.filter((d) => !q.days.includes(d)) : [...new Set([...prev, ...q.days])]))}
              className={cn('h-8 px-3 rounded-lg text-[13px] font-medium border transition-colors', on ? 'bg-lily-soft border-lily/40 text-lily-strong' : 'border-line text-muted hover:text-ink')}
            >
              {q.label}
            </button>
          );
        })}
      </div>
      <div className="mt-4">
        <MiniCalendar today={today} selected={dates} onToggle={toggle} />
      </div>
      {dates.length > 0 && (
        <p className="text-[13px] text-lily-strong font-medium mt-3">
          {[...dates].sort().map((d) => formatRelative(d, today)).join(' · ')}
        </p>
      )}
    </Modal>
  );
}

