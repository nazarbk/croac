import { useEffect, useState } from 'react';
import { addDays, formatLong, formatRelative, weekday, type DateStr } from '../../domain/dates';
import { completionDates, taskStreak } from '../../domain/engine';
import { DIFFICULTIES, PRIORITIES, rewardFor } from '../../domain/progression';
import { describeRecurrence, isRecurring, NO_REPEAT, occurrenceOnOrAfter, type Recurrence } from '../../domain/recurrence';
import { emptySubtask, INBOX_ID } from '../../domain/tasks';
import type { Difficulty, Priority, Subtask, TaskStatus } from '../../domain/types';
import { cn } from '../../lib/cn';
import { actions } from '../../store/actions';
import { appStore, useApp, useToday } from '../../store/appStore';
import { ui, useUi } from '../../store/uiStore';
import { deleteWithUndo } from '../../features/feedback';
import { Button, IconButton } from '../ui/Button';
import { Field, inputClass, Segmented } from '../ui/controls';
import { Icon } from '../ui/Icon';
import { Modal } from '../ui/Modal';
import { RecurrencePicker } from './RecurrencePicker';

interface Draft {
  title: string;
  notes: string;
  listId: string;
  tags: string;
  priority: Priority;
  difficulty: Difficulty;
  recurrence: Recurrence;
  date: DateStr | null;
  time: string;
  subtasks: Subtask[];
  status: TaskStatus;
}

/** Ajusta la altura de un textarea a su contenido. */
const autoGrow = (el: HTMLTextAreaElement | null) => {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
};

const priorityColor: Record<Priority, string> = { 1: 'text-p1', 2: 'text-p2', 3: 'text-p3', 4: 'text-muted' };

export function TaskEditor() {
  const editor = useUi((s) => s.editor);
  const lists = useApp((s) => s.lists);
  const today = useToday();
  const task = useApp((s) => s.tasks.find((t) => t.id === editor.taskId));
  const [draft, setDraft] = useState<Draft | null>(null);
  const [newSub, setNewSub] = useState('');

  useEffect(() => {
    if (!editor.open) { setDraft(null); return; }
    if (task) {
      setDraft({
        title: task.title, notes: task.notes, listId: task.listId, tags: task.tags.join(', '),
        priority: task.priority, difficulty: task.difficulty, recurrence: task.recurrence,
        date: isRecurring(task.recurrence) ? task.anchorDate : task.dueDate,
        time: task.time ?? '', subtasks: task.subtasks, status: task.status,
      });
    } else {
      setDraft({
        title: '', notes: '', listId: editor.defaults?.listId ?? INBOX_ID, tags: '', priority: 4, difficulty: 'easy',
        recurrence: NO_REPEAT, date: editor.defaults?.date === undefined ? today : editor.defaults.date, time: '', subtasks: [], status: 'todo',
      });
    }
    setNewSub('');
    // Solo al abrir o cambiar de tarea.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor.open, editor.taskId]);

  if (!editor.open || !draft) return null;

  const isNew = !task;
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));
  const recurring = isRecurring(draft.recurrence);
  const refDate = draft.date ?? today;
  const nextDate = recurring ? occurrenceOnOrAfter(draft.recurrence, refDate, refDate < today ? today : refDate) : null;
  const streak = task && recurring ? taskStreak(task, completionDates(appStore.get().history, task.id), today) : 0;
  const reward = rewardFor({ difficulty: draft.difficulty }, { streak: streak + 1, late: false });

  const save = () => {
    if (!draft.title.trim()) return;
    const subtasks = newSub.trim() ? [...draft.subtasks, emptySubtask(newSub.trim())] : draft.subtasks;
    const input = {
      title: draft.title, notes: draft.notes.trim(), listId: draft.listId,
      tags: draft.tags.split(',').map((t) => t.trim().replace(/^@/, '').toLowerCase()).filter(Boolean),
      priority: draft.priority, difficulty: draft.difficulty, recurrence: draft.recurrence,
      date: draft.date, time: draft.time || null, subtasks,
    };
    if (isNew) {
      actions.addTask(input);
    } else {
      actions.updateTask(task.id, input);
      if (draft.status !== task.status) actions.setStatus(task.id, draft.status);
    }
    ui.closeEditor();
  };

  const nextMonday = addDays(today, ((8 - weekday(today)) % 7) || 7);
  const quickDates: { label: string; value: DateStr | null }[] = [
    { label: 'Hoy', value: today },
    { label: 'Mañana', value: addDays(today, 1) },
    { label: 'Próx. lunes', value: nextMonday },
    { label: 'Sin fecha', value: null },
  ];

  return (
    <Modal
      open
      onClose={ui.closeEditor}
      size="lg"
      title={isNew ? 'Nueva tarea' : 'Editar tarea'}
      footer={
        <>
          {!isNew && (
            <div className="mr-auto flex gap-1">
              <IconButton icon="trash" label="Eliminar" className="hover:text-danger" onClick={() => { deleteWithUndo(task.id); ui.closeEditor(); }} />
              <IconButton icon="copy" label="Duplicar" onClick={() => { actions.duplicateTask(task.id); ui.closeEditor(); }} />
            </div>
          )}
          <Button variant="ghost" onClick={ui.closeEditor}>Cancelar</Button>
          <Button variant="primary" onClick={save} disabled={!draft.title.trim()}>{isNew ? 'Crear tarea' : 'Guardar'}</Button>
        </>
      }
    >
      <form onSubmit={(e) => { e.preventDefault(); save(); }} className="space-y-5">
        <div>
          <textarea
            data-autofocus
            value={draft.title}
            rows={1}
            ref={autoGrow}
            onChange={(e) => { set('title', e.target.value.replace(/\n/g, ' ')); autoGrow(e.target); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save(); } }}
            placeholder="¿Qué hay que hacer?"
            className="w-full bg-transparent font-display text-[1.375rem] sm:text-2xl font-bold leading-tight outline-none resize-none overflow-hidden placeholder:text-muted/50"
            aria-label="Título"
          />
          <textarea
            value={draft.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Notas"
            rows={2}
            ref={autoGrow}
            onInput={(e) => autoGrow(e.currentTarget)}
            className="w-full mt-2 bg-transparent outline-none resize-none text-base sm:text-[15px] text-ink placeholder:text-muted/60"
            aria-label="Notas"
          />
        </div>

        {!isNew && (
          <Segmented<TaskStatus>
            value={draft.status}
            onChange={(v) => set('status', v)}
            options={[
              { value: 'todo', label: 'Pendiente' },
              { value: 'in_progress', label: 'En proceso' },
              { value: 'done', label: 'Completada' },
            ]}
          />
        )}

        <div className="grid sm:grid-cols-2 gap-5">
          <Field label={recurring ? 'Empieza' : 'Fecha'} hint={recurring && nextDate ? `Próxima vez: ${formatRelative(nextDate, today).toLowerCase()}` : draft.date ? formatLong(draft.date) : 'Sin fecha: no caduca ni penaliza'}>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {quickDates.filter((q) => !(recurring && q.value === null)).map((q) => (
                <button
                  key={q.label} type="button" onClick={() => set('date', q.value)}
                  className={cn('h-7 px-2.5 rounded-lg text-[13px] font-medium border transition-colors', draft.date === q.value ? 'bg-lily-soft border-lily/40 text-lily-strong' : 'border-line text-muted hover:text-ink')}
                >
                  {q.label}
                </button>
              ))}
            </div>
            <input type="date" className={inputClass} value={draft.date ?? ''} onChange={(e) => set('date', e.target.value || null)} aria-label="Fecha" />
          </Field>
          <Field label="Repetir">
            <RecurrencePicker value={draft.recurrence} onChange={(r) => set('recurrence', r)} date={refDate} />
          </Field>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          <Field label="Hora del recordatorio" hint="Opcional. Te avisaremos a esa hora si la app está abierta.">
            <input type="time" className={inputClass} value={draft.time} onChange={(e) => set('time', e.target.value)} aria-label="Hora" />
          </Field>
          <Field label="Lista">
            <select className={inputClass} value={draft.listId} onChange={(e) => set('listId', e.target.value)} aria-label="Lista">
              {lists.map((l) => <option key={l.id} value={l.id}>{l.emoji} {l.name}</option>)}
            </select>
          </Field>
        </div>

        <Field label="Prioridad">
          <Segmented<Priority>
            value={draft.priority}
            onChange={(v) => set('priority', v)}
            options={([1, 2, 3, 4] as Priority[]).map((p) => ({
              value: p,
              title: PRIORITIES[p].label,
              label: <span className="flex items-center gap-1"><Icon name="flag" size={14} className={priorityColor[p]} />{PRIORITIES[p].label}</span>,
            }))}
            className="flex-wrap"
          />
        </Field>

        <Field label="Dificultad" hint={`Recompensa: +${reward.xp} XP y +${reward.coins} monedas${streak > 1 ? ` (incluye bonus por racha de ${streak})` : ''}.`}>
          <Segmented<Difficulty>
            value={draft.difficulty}
            onChange={(v) => set('difficulty', v)}
            options={(Object.keys(DIFFICULTIES) as Difficulty[]).map((d) => ({ value: d, label: DIFFICULTIES[d].label, title: DIFFICULTIES[d].hint }))}
          />
        </Field>

        <Field label="Subtareas">
          <div className="space-y-1">
            {draft.subtasks.map((s) => (
              <div key={s.id} className="flex items-center gap-2 group/sub">
                <input
                  type="checkbox" checked={s.done} aria-label={`Hecha: ${s.title}`}
                  onChange={() => set('subtasks', draft.subtasks.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)))}
                  className="w-4 h-4 accent-[var(--lily)]"
                />
                <input
                  value={s.title}
                  onChange={(e) => set('subtasks', draft.subtasks.map((x) => (x.id === s.id ? { ...x, title: e.target.value } : x)))}
                  className={cn('flex-1 bg-transparent outline-none py-1 text-base sm:text-[15px]', s.done && 'line-through text-muted')}
                  aria-label="Subtarea"
                />
                <IconButton icon="x" label="Quitar subtarea" size={15} className="w-8 h-8 pointer-fine:opacity-0 group-hover/sub:opacity-100 focus-visible:opacity-100" onClick={() => set('subtasks', draft.subtasks.filter((x) => x.id !== s.id))} />
              </div>
            ))}
            <div className="flex items-center gap-2">
              <Icon name="plus" size={16} className="text-muted" />
              <input
                value={newSub}
                onChange={(e) => setNewSub(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (newSub.trim()) { set('subtasks', [...draft.subtasks, emptySubtask(newSub.trim())]); setNewSub(''); }
                  }
                }}
                placeholder="Añadir subtarea y pulsar Enter"
                className="flex-1 bg-transparent outline-none py-1.5 text-base sm:text-[15px] placeholder:text-muted/70"
                aria-label="Nueva subtarea"
              />
            </div>
          </div>
        </Field>

        <Field label="Etiquetas" hint="Separadas por comas. También puedes escribir @etiqueta en la entrada rápida.">
          <input className={inputClass} value={draft.tags} onChange={(e) => set('tags', e.target.value)} placeholder="foco, casa" aria-label="Etiquetas" />
        </Field>

        {recurring && (
          <p className="text-sm text-muted flex items-center gap-1.5">
            <Icon name="repeat" size={14} />{describeRecurrence(draft.recurrence)}
            {streak > 0 && <> · <Icon name="flame" size={14} className="text-warn" />racha de {streak}</>}
          </p>
        )}
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
