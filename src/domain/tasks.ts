import { maxDate, type DateStr } from './dates';
import { isRecurring, normalizeRecurrence, NO_REPEAT, occurrenceOnOrAfter, type Recurrence } from './recurrence';
import { uid } from './id';
import type { Ctx, Difficulty, Priority, Subtask, Task, TaskSort } from './types';

export const INBOX_ID = 'inbox';

export interface TaskInput {
  title: string;
  notes?: string;
  listId?: string;
  tags?: string[];
  priority?: Priority;
  difficulty?: Difficulty;
  recurrence?: Recurrence;
  /** Para recurrentes: fecha de inicio. Para puntuales: fecha límite. */
  date?: DateStr | null;
  time?: string | null;
  subtasks?: Subtask[];
}

/** Calcula ancla y próxima fecha de una tarea a partir de su recurrencia. */
function schedule(recurrence: Recurrence, date: DateStr | null | undefined, today: DateStr) {
  if (!isRecurring(recurrence)) {
    return { recurrence: NO_REPEAT, anchorDate: null, dueDate: date ?? null };
  }
  const anchor = date ?? today;
  const rec = normalizeRecurrence(recurrence, anchor);
  return { recurrence: rec, anchorDate: anchor, dueDate: occurrenceOnOrAfter(rec, anchor, maxDate(anchor, today)) };
}

export function buildTask(input: TaskInput, ctx: Ctx, order = 0): Task {
  const sched = schedule(input.recurrence ?? NO_REPEAT, input.date, ctx.today);
  return {
    id: uid('t'),
    title: input.title.trim() || 'Tarea sin título',
    notes: input.notes ?? '',
    listId: input.listId ?? INBOX_ID,
    tags: input.tags ?? [],
    priority: input.priority ?? 4,
    difficulty: input.difficulty ?? 'easy',
    status: 'todo',
    ...sched,
    time: input.time ?? null,
    subtasks: input.subtasks ?? [],
    createdAt: ctx.now,
    updatedAt: ctx.now,
    completedAt: null,
    order,
  };
}

/** Aplica cambios del editor. Si cambia la programación, se recalcula la próxima fecha. */
export function updateTaskFields(task: Task, input: Partial<TaskInput>, ctx: Ctx): Task {
  const next: Task = {
    ...task,
    title: input.title !== undefined ? input.title.trim() || task.title : task.title,
    notes: input.notes ?? task.notes,
    listId: input.listId ?? task.listId,
    tags: input.tags ?? task.tags,
    priority: input.priority ?? task.priority,
    difficulty: input.difficulty ?? task.difficulty,
    time: input.time !== undefined ? input.time : task.time,
    subtasks: input.subtasks ?? task.subtasks,
    updatedAt: ctx.now,
  };
  const recurrence = input.recurrence ?? task.recurrence;
  const currentDate = isRecurring(task.recurrence) ? task.anchorDate : task.dueDate;
  const date = input.date !== undefined ? input.date : currentDate;
  const changed =
    JSON.stringify(recurrence) !== JSON.stringify(task.recurrence) || date !== currentDate;
  if (changed) Object.assign(next, schedule(recurrence, date, ctx.today));
  return next;
}

export function emptySubtask(title: string): Subtask {
  return { id: uid('s'), title, done: false };
}

/* ---------- Orden ---------- */

/** Orden "inteligente": en proceso primero, luego prioridad, hora y orden manual. */
export const smartCompare = (a: Task, b: Task) =>
  (a.status === 'in_progress' ? 0 : 1) - (b.status === 'in_progress' ? 0 : 1) ||
  a.priority - b.priority ||
  (a.time ?? '99').localeCompare(b.time ?? '99') ||
  a.order - b.order;

export const manualCompare = (a: Task, b: Task) => a.order - b.order || a.createdAt - b.createdAt;

export const compareFor = (sort: TaskSort) => (sort === 'manual' ? manualCompare : smartCompare);

/**
 * Reordena un grupo de tareas (p. ej. "Para hoy") sin alterar la posición
 * relativa del resto. `ids` es el nuevo orden del grupo. Devuelve todas las
 * tareas con `order` renumerado 0..n-1 según el orden visible actual.
 */
export function reorderTasks(tasks: Task[], ids: string[], current: TaskSort): Task[] {
  const sorted = [...tasks].sort(compareFor(current));
  const group = new Set(ids);
  const slots: number[] = [];
  sorted.forEach((t, i) => group.has(t.id) && slots.push(i));
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const result = [...sorted];
  ids.forEach((id, i) => {
    const t = byId.get(id);
    if (t && slots[i] !== undefined) result[slots[i]] = t;
  });
  const order = new Map(result.map((t, i) => [t.id, i]));
  return tasks.map((t) => (order.get(t.id) === t.order ? t : { ...t, order: order.get(t.id)! }));
}
