import { forwardRef, useMemo, useState } from 'react';
import { formatRelative, type DateStr } from '../../domain/dates';
import { parseQuickAdd, type ParsedToken } from '../../domain/parser';
import { describeRecurrence } from '../../domain/recurrence';
import { cn } from '../../lib/cn';
import { actions } from '../../store/actions';
import { useToday } from '../../store/appStore';
import { ui } from '../../store/uiStore';
import { Icon } from '../ui/Icon';

const chipTone: Record<ParsedToken['kind'], string> = {
  date: 'bg-lily-soft text-lily-strong',
  recurrence: 'bg-lily-soft text-lily-strong',
  time: 'bg-lily-soft text-lily-strong',
  priority: 'bg-danger-soft text-danger',
  list: 'bg-surface-2 text-ink border border-line',
  tag: 'bg-surface-2 text-lily-strong border border-line',
};

interface QuickAddProps {
  defaultDate?: DateStr | null;
  listId?: string;
  placeholder?: string;
  autoFocus?: boolean;
  /** Se llama tras crear la tarea (p. ej. para cerrar la hoja en móvil). */
  onAdded?: () => void;
  /** Se llama al pulsar "Más opciones" (antes de abrir el editor). */
  onMore?: () => void;
}

/** Entrada rápida con lenguaje natural y vista previa de lo que se ha entendido. */
export const QuickAdd = forwardRef<HTMLInputElement, QuickAddProps>(function QuickAdd({ defaultDate, listId, placeholder, autoFocus, onAdded, onMore }, ref) {
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);
  const today = useToday();
  const parsed = useMemo(() => (text.trim() ? parseQuickAdd(text, today) : null), [text, today]);

  const submit = () => {
    const task = actions.quickAdd(text, { date: defaultDate, listId });
    if (!task) return;
    setText('');
    if (task.dueDate && task.dueDate !== defaultDate) {
      ui.toast({ message: `Añadida para ${formatRelative(task.dueDate, today).toLowerCase()}` });
    } else if (onAdded) {
      ui.toast({ message: 'Tarea añadida' });
    }
    onAdded?.();
  };

  const chips = parsed
    ? [
        parsed.recurrence && { kind: 'recurrence' as const, text: describeRecurrence(parsed.recurrence), icon: 'repeat' as const },
        parsed.date && { kind: 'date' as const, text: formatRelative(parsed.date, today), icon: 'calendar' as const },
        parsed.time && { kind: 'time' as const, text: parsed.time, icon: 'clock' as const },
        parsed.priority && { kind: 'priority' as const, text: `P${parsed.priority}`, icon: 'flag' as const },
        parsed.listName && { kind: 'list' as const, text: parsed.listName, icon: 'folder' as const },
        ...parsed.tags.map((t) => ({ kind: 'tag' as const, text: `@${t}`, icon: 'tag' as const })),
      ].filter(Boolean)
    : [];

  return (
    <div className="rounded-2xl bg-surface border border-line shadow-card focus-within:border-lily focus-within:ring-4 focus-within:ring-lily/15 transition-shadow">
      <form
        className="flex items-center gap-2.5 pl-4 pr-2"
        onSubmit={(e) => { e.preventDefault(); submit(); }}
      >
        <Icon name="plus" size={20} className="text-lily shrink-0" />
        <input
          ref={ref}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoFocus={autoFocus}
          placeholder={placeholder ?? 'Añadir tarea'}
          className="flex-1 min-w-0 h-12 bg-transparent outline-none text-base sm:text-[15px] placeholder:text-muted/80"
          aria-label="Nueva tarea"
          enterKeyHint="done"
        />
        {text.trim() ? (
          <button type="submit" className="shrink-0 h-9 px-4 rounded-xl bg-lily bg-primary-grad text-on-lily font-semibold text-sm hover:brightness-105">
            Añadir
          </button>
        ) : (
          <button
            type="button"
            onClick={() => { onMore?.(); ui.openEditor(null, { date: defaultDate ?? null, listId }); }}
            className="shrink-0 h-9 px-3 rounded-xl text-muted hover:text-ink hover:bg-surface-2 text-sm font-medium"
          >
            Más opciones
          </button>
        )}
      </form>
      {focused && !text && (
        <p className="px-4 pb-3 -mt-1 text-[13px] text-muted">
          Escribe con naturalidad: <span className="text-ink/80">«Leer cada día a las 22:00 #personal p2»</span>
        </p>
      )}
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-3 -mt-1">
          {chips.map((c, i) => c && (
            <span key={i} className={cn('inline-flex items-center gap-1 px-2 h-6 rounded-lg text-xs font-semibold', chipTone[c.kind])}>
              <Icon name={c.icon} size={12} />{c.text}
            </span>
          ))}
        </div>
      )}
    </div>
  );
});
