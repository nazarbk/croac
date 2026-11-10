import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { addDays, formatRelative, type DateStr } from '../../domain/dates';
import { canComplete, overdueDays } from '../../domain/engine';
import { DIFFICULTIES } from '../../domain/progression';
import { describeRecurrence, isRecurring } from '../../domain/recurrence';
import type { Priority, Task, TaskList } from '../../domain/types';
import { cn } from '../../lib/cn';
import { actions } from '../../store/actions';
import { ui, useUi } from '../../store/uiStore';
import { completeWithFeedback, deleteWithUndo, postponeToTomorrow } from '../../features/feedback';
import { Icon } from '../ui/Icon';
import { Menu } from '../ui/controls';
import type { DragHandleProps } from './Sortable';

const ring: Record<Priority, string> = {
  1: 'border-p1 bg-p1/10',
  2: 'border-p2 bg-p2/10',
  3: 'border-p3 bg-p3/10',
  4: 'border-muted/50',
};

/** Casilla redonda tipo nenúfar. El área táctil es de 40px aunque el círculo mida 22px. */
export function LilyCheck({ priority, state, disabled, onClick, label, size = 'md' }: {
  priority: Priority;
  state: 'todo' | 'in_progress' | 'done';
  disabled?: boolean;
  onClick?: () => void;
  label: string;
  size?: 'sm' | 'md';
}) {
  const dim = size === 'sm' ? 'w-[18px] h-[18px]' : 'w-[22px] h-[22px]';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={disabled ? 'Disponible el día que toca' : label}
      data-no-swipe
      className={cn('group/check shrink-0 flex items-center justify-center', size === 'sm' ? 'w-8 h-8' : 'w-10 h-10', disabled && 'cursor-not-allowed')}
    >
      <span
        className={cn(
          'relative rounded-full border-2 flex items-center justify-center transition-colors',
          dim,
          state === 'done' ? 'bg-lily border-lily text-on-lily animate-check' : size === 'sm' ? 'border-muted/50' : ring[priority],
          !disabled && state !== 'done' && 'group-hover/check:border-lily',
          disabled && 'opacity-40',
        )}
      >
        {state === 'in_progress' && (
          <span className="absolute inset-[3px] rounded-full overflow-hidden" aria-hidden="true">
            <span className="absolute inset-y-0 left-0 w-1/2 bg-lily/70" />
          </span>
        )}
        <Icon
          name="check" size={size === 'sm' ? 11 : 13} strokeWidth={3.2}
          className={cn('relative transition-opacity', state === 'done' ? 'opacity-100' : 'opacity-0 group-hover/check:opacity-40 text-lily')}
        />
      </span>
    </button>
  );
}

/** Subtareas dentro de la tarjeta: se ven, se marcan y se añaden sin abrir el editor. */
function Subtasks({ task, adding, setAdding, completable }: { task: Task; adding: boolean; setAdding: (v: boolean) => void; completable: boolean }) {
  const collapsed = useUi((s) => s.collapsed.includes(task.id));
  const [text, setText] = useState('');
  const done = task.subtasks.filter((s) => s.done).length;
  const total = task.subtasks.length;
  const open = !collapsed || adding;
  if (!total && !adding) return null;

  const toggle = (subId: string) => {
    const allDone = actions.toggleSubtask(task.id, subId);
    if (allDone && completable) {
      ui.toast({
        message: 'Subtareas terminadas',
        action: { label: 'Completar tarea', icon: 'check', run: () => completeWithFeedback(task.id) },
      });
    }
  };

  const submit = () => {
    if (text.trim()) actions.addSubtask(task.id, text);
    setText('');
  };

  return (
    <div className="mt-1" data-no-swipe>
      {total > 0 && (
        <button
          type="button"
          onClick={() => ui.toggleCollapsed(task.id)}
          aria-expanded={open}
          className="inline-flex items-center gap-2 h-8 -ml-1 pl-1 pr-2 rounded-lg text-[13px] text-muted hover:text-ink hover:bg-surface-2"
        >
          <Icon name="chevronDown" size={15} className={cn('transition-transform', !open && '-rotate-90')} />
          <span className="tabular-nums">{done}/{total} subtareas</span>
          <span className="w-12 h-1.5 rounded-full bg-line overflow-hidden" aria-hidden="true">
            <span className="block h-full bg-lily rounded-full transition-[width]" style={{ width: `${(done / total) * 100}%` }} />
          </span>
        </button>
      )}
      {open && (
        <ul className="mt-0.5 -ml-2">
          {task.subtasks.map((s) => (
            <li key={s.id} className="group/sub flex items-center rounded-lg hover:bg-surface-2">
              <LilyCheck size="sm" priority={4} state={s.done ? 'done' : 'todo'} label={s.done ? `Desmarcar "${s.title}"` : `Marcar "${s.title}"`} onClick={() => toggle(s.id)} />
              <span className={cn('flex-1 min-w-0 text-[14px] leading-snug py-1.5 break-words', s.done && 'line-through text-muted')}>{s.title}</span>
              <button
                type="button" aria-label={`Quitar "${s.title}"`} onClick={() => actions.deleteSubtask(task.id, s.id)}
                className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg text-muted hover:text-danger pointer-fine:opacity-0 group-hover/sub:opacity-100 focus:opacity-100"
              >
                <Icon name="x" size={14} />
              </button>
            </li>
          ))}
          <li>
            {adding ? (
              <form className="flex items-center gap-1 pl-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
                <Icon name="plus" size={15} className="text-lily shrink-0 mx-[6px]" />
                <input
                  autoFocus
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onBlur={() => { submit(); setAdding(false); }}
                  onKeyDown={(e) => e.key === 'Escape' && (setText(''), setAdding(false))}
                  placeholder="Nueva subtarea"
                  aria-label="Nueva subtarea"
                  enterKeyHint="enter"
                  className="flex-1 min-w-0 h-9 bg-transparent outline-none text-base sm:text-[14px] placeholder:text-muted/70"
                />
              </form>
            ) : (
              <button type="button" onClick={() => setAdding(true)} className="flex items-center gap-2 h-8 pl-2 pr-3 rounded-lg text-[13px] text-muted hover:text-lily-strong">
                <Icon name="plus" size={15} className="mx-[6px]" />Añadir subtarea
              </button>
            )}
          </li>
        </ul>
      )}
    </div>
  );
}

const SWIPE_TRIGGER = 88;

interface TaskItemProps {
  task: Task;
  today: DateStr;
  list?: TaskList;
  streak?: number;
  showDate?: boolean;
  showList?: boolean;
  /** Ocurrencia futura proyectada (solo lectura). */
  ghost?: boolean;
  graceDays?: number;
  handle?: DragHandleProps;
  dragging?: boolean;
}

export function TaskItem({ task, today, list, streak = 0, showDate = true, showList = true, ghost, graceDays = 1, handle, dragging }: TaskItemProps) {
  const [leaving, setLeaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const [dx, setDx] = useState(0);
  const swipe = useRef<{ x: number; y: number; id: number; active: boolean; moved: boolean } | null>(null);
  const done = task.status === 'done';
  const od = overdueDays(task, today);
  const recurring = isRecurring(task.recurrence);
  const completable = !ghost && canComplete(task, today);
  const canPostpone = !done && !ghost && !!task.dueDate && task.dueDate <= today;
  const reward = DIFFICULTIES[task.difficulty].xp;

  const complete = () => {
    if (!completable || leaving) return;
    setLeaving(true);
    setTimeout(() => completeWithFeedback(task.id), 380);
  };

  const onCheck = () => {
    if (done) actions.setStatus(task.id, 'todo');
    else complete();
  };

  /* Deslizar en móvil: derecha = completar, izquierda = posponer a mañana. */
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'touch' || ghost || done || dragging) return;
    if ((e.target as HTMLElement).closest('input, a, [data-no-swipe]')) return;
    swipe.current = { x: e.clientX, y: e.clientY, id: e.pointerId, active: false, moved: false };
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const s = swipe.current;
    if (!s || s.id !== e.pointerId) return;
    const mx = e.clientX - s.x;
    const my = e.clientY - s.y;
    if (!s.active) {
      if (Math.abs(my) > 10 && Math.abs(my) > Math.abs(mx)) { swipe.current = null; return; }
      if (Math.abs(mx) > 12) { s.active = true; e.currentTarget.setPointerCapture(e.pointerId); }
      else return;
    }
    s.moved = true;
    const limit = (v: number) => (v > 0 ? (completable ? v : v * 0.2) : canPostpone ? v : v * 0.2);
    setDx(Math.max(-140, Math.min(140, limit(mx))));
  };
  const onPointerEnd = () => {
    const s = swipe.current;
    swipe.current = null;
    if (!s?.active) return;
    if (dx > SWIPE_TRIGGER && completable) complete();
    else if (dx < -SWIPE_TRIGGER && canPostpone) postponeToTomorrow(task.id, addDays(today, 1));
    setDx(0);
  };

  const subDone = task.subtasks.filter((s) => s.done).length;
  const swipeHint = dx > 24 ? 'complete' : dx < -24 ? 'postpone' : null;

  return (
    <div className={cn('relative rounded-2xl', leaving && 'opacity-0 translate-x-4 transition-all duration-300')}>
      {/* Acción revelada al deslizar */}
      {swipeHint && (
        <div className={cn('absolute inset-0 rounded-2xl flex items-center px-5 font-semibold text-sm', swipeHint === 'complete' ? 'bg-lily text-on-lily justify-start' : 'bg-warn text-white dark:text-[#2a1600] justify-end')} aria-hidden="true">
          {swipeHint === 'complete'
            ? <span className="flex items-center gap-2"><Icon name="check" size={18} strokeWidth={3} />Completar</span>
            : <span className="flex items-center gap-2">Mañana<Icon name="arrowRight" size={18} /></span>}
        </div>
      )}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        style={{ transform: dx ? `translateX(${dx}px)` : undefined, transition: swipe.current?.active ? 'none' : 'transform 220ms cubic-bezier(.2,.8,.3,1)', touchAction: 'pan-y' }}
        className={cn(
          'group relative flex items-start gap-0.5 rounded-2xl border bg-surface pr-1 py-1 transition-shadow',
          handle ? 'pl-0.5' : 'pl-1.5',
          dragging ? 'border-lily/60 shadow-float ring-4 ring-lily/15' : 'border-line shadow-card hover:border-lily/30',
          ghost && 'bg-surface/60 border-dashed shadow-none',
          done && 'bg-surface/70',
        )}
      >
        {handle && (
          <button
            type="button"
            data-no-swipe
            {...handle}
            className={cn(
              'shrink-0 w-6 h-10 -mr-1 flex items-center justify-center rounded-lg text-muted/50 hover:text-ink touch-none',
              dragging ? 'cursor-grabbing text-lily' : 'cursor-grab',
              'pointer-fine:opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
            )}
          >
            <Icon name="grip" size={16} />
          </button>
        )}
        <LilyCheck
          priority={task.priority}
          state={leaving ? 'done' : task.status}
          disabled={!done && !completable}
          onClick={onCheck}
          label={done ? `Reabrir "${task.title}"` : `Completar "${task.title}"`}
        />
        {leaving && (
          <span className="absolute left-14 -top-1 text-sm font-bold text-lily-strong animate-float-up pointer-events-none">+{reward} XP</span>
        )}
        <div className="flex-1 min-w-0 py-2 pr-1">
          <button
            type="button"
            className="block w-full text-left rounded-lg"
            onClick={() => { if (!swipe.current?.moved) ui.openEditor(task.id); }}
          >
            <span className="flex items-center gap-2 flex-wrap">
              <span className={cn('text-[15px] leading-snug break-words font-medium', done && 'line-through text-muted font-normal')}>{task.title}</span>
              {task.status === 'in_progress' && (
                <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-md bg-lily-soft text-lily-strong">En proceso</span>
              )}
            </span>
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted mt-1 empty:hidden">
              {od > 0 && !done && (
                <span className={cn('flex items-center gap-1 font-semibold', od > graceDays ? 'text-danger' : 'text-warn')}>
                  <Icon name={od > graceDays ? 'alert' : 'clock'} size={13} />
                  {od === 1 ? 'Ayer' : `Hace ${od} días`}
                </span>
              )}
              {showDate && task.dueDate && od === 0 && !done && (
                <span className={cn('flex items-center gap-1', task.dueDate === today && 'text-lily-strong font-medium')}>
                  <Icon name="calendar" size={13} />{formatRelative(task.dueDate, today)}
                </span>
              )}
              {task.time && <span className="flex items-center gap-1"><Icon name="clock" size={13} />{task.time}</span>}
              {recurring && <span className="flex items-center gap-1"><Icon name="repeat" size={13} />{describeRecurrence(task.recurrence)}</span>}
              {streak > 1 && (
                <span className="flex items-center gap-0.5 text-warn font-semibold" title={`Racha de ${streak}`}>
                  <Icon name="flame" size={13} />{streak}
                </span>
              )}
              {ghost && task.subtasks.length > 0 && <span className="flex items-center gap-1"><Icon name="listChecks" size={13} />{subDone}/{task.subtasks.length}</span>}
              {task.notes && <span className="flex items-center" title="Tiene notas"><Icon name="edit" size={12} /></span>}
              {task.tags.map((t) => <span key={t} className="text-lily-strong">@{t}</span>)}
              {showList && list && (
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: list.color }} />{list.name}
                </span>
              )}
            </span>
          </button>
          {!ghost && !done && <Subtasks task={task} adding={adding} setAdding={setAdding} completable={completable} />}
        </div>
        {!ghost && (
          <Menu
            title={task.title}
            trigger={(p) => (
              <button
                type="button" {...p} aria-label="Más acciones" data-no-swipe
                className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-muted hover:text-ink hover:bg-surface-2 pointer-fine:opacity-0 group-hover:opacity-100 focus-visible:opacity-100 aria-expanded:opacity-100"
              >
                <Icon name="more" size={18} />
              </button>
            )}
            items={[
              ...(done ? [] : task.status === 'in_progress'
                ? [{ label: 'Marcar como pendiente', icon: 'pause' as const, onSelect: () => actions.setStatus(task.id, 'todo') }]
                : [{ label: 'Marcar en proceso', icon: 'play' as const, onSelect: () => actions.setStatus(task.id, 'in_progress') }]),
              ...(done ? [] : [{ label: 'Añadir subtarea', icon: 'listChecks' as const, onSelect: () => setAdding(true) }]),
              ...(canPostpone ? [{ label: 'Posponer a mañana', icon: 'arrowRight' as const, onSelect: () => postponeToTomorrow(task.id, addDays(today, 1)) }] : []),
              ...(!done && od > 0 ? [{ label: 'Mover a hoy', icon: 'sun' as const, onSelect: () => actions.reschedule(task.id, today) }] : []),
              { label: 'Editar', icon: 'edit', onSelect: () => ui.openEditor(task.id) },
              { label: 'Duplicar', icon: 'copy', onSelect: () => actions.duplicateTask(task.id) },
              { label: 'Eliminar', icon: 'trash', danger: true, onSelect: () => deleteWithUndo(task.id) },
            ]}
          />
        )}
      </div>
    </div>
  );
}
