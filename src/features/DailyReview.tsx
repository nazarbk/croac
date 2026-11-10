import { useEffect, useState } from 'react';
import { Frog } from '../components/frog/Frog';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { formatRelative } from '../domain/dates';
import { needsRollover, tasksForReview } from '../domain/engine';
import type { Task } from '../domain/types';
import { cn } from '../lib/cn';
import { actions } from '../store/actions';
import { appStore, useApp, useToday } from '../store/appStore';
import { useFrogInfo } from '../store/selectors';
import { Icon } from '../components/ui/Icon';

/**
 * Al empezar un día nuevo: si quedaron tareas sin marcar, se pregunta antes de
 * aplicar penalizaciones (por si se hicieron y no se apuntaron).
 */
export function DailyReview() {
  const today = useToday();
  const onboarded = useApp((s) => s.meta.onboarded);
  const [pending, setPending] = useState<Task[] | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const info = useFrogInfo();

  useEffect(() => {
    const s = appStore.get();
    if (!s.meta.onboarded || !needsRollover(s, today)) return;
    const review = tasksForReview(s, today);
    if (review.length === 0 || s.settings.vacationMode) {
      actions.rollover();
    } else {
      setChecked(new Set());
      setPending(review);
    }
  }, [today, onboarded]);

  if (!pending) return null;

  const finish = () => {
    actions.finishReview([...checked]);
    setPending(null);
  };

  return (
    <Modal open dismissable={false} onClose={finish} size="md" title="Antes de empezar el día"
      footer={<Button variant="primary" size="lg" onClick={finish} data-autofocus>{checked.size ? `Marcar ${checked.size} y empezar` : 'Empezar el día'}</Button>}>
      <div className="flex gap-4 items-center">
        <Frog level={info.level} mood="worried" equipped={info.frog.equipped} className="w-20 h-20 shrink-0" />
        <p className="text-[15px] text-ink/85">
          Estas tareas se quedaron sin marcar. ¿Hiciste alguna? Márcala y {info.frog.name} recibirá su recompensa. Las demás pasan a hoy.
        </p>
      </div>
      <ul className="mt-4 space-y-1">
        {pending.map((t) => {
          const on = checked.has(t.id);
          return (
            <li key={t.id}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => setChecked((prev) => { const n = new Set(prev); if (n.has(t.id)) n.delete(t.id); else n.add(t.id); return n; })}
                className={cn('w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition-colors', on ? 'border-lily bg-lily-soft' : 'border-line hover:bg-surface-2')}
              >
                <span className={cn('w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center shrink-0', on ? 'bg-lily border-lily text-on-lily' : 'border-muted/60')}>
                  {on && <Icon name="check" size={13} strokeWidth={3.2} />}
                </span>
                <span className="flex-1 text-[15px]">{t.title}</span>
                <span className="text-xs text-muted">{t.dueDate ? formatRelative(t.dueDate, today) : ''}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
