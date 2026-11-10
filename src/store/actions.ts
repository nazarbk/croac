import { createInitialState, LIST_COLORS, STARTER_TASKS } from '../domain/defaults';
import { maxDate, type DateStr } from '../domain/dates';
import * as engine from '../domain/engine';
import { uid } from '../domain/id';
import { parseQuickAdd } from '../domain/parser';
import { limitsFor } from '../domain/plans';
import { levelInfo, stageForLevel } from '../domain/progression';
import { NO_REPEAT } from '../domain/recurrence';
import { buildTask, emptySubtask, INBOX_ID, reorderTasks, updateTaskFields, type TaskInput } from '../domain/tasks';
import type { AppState, Ctx, EngineResult, Plan, Settings, Task, TaskList, TaskSort, TaskStatus } from '../domain/types';
import { appStore, getCtx, storage } from './appStore';
import { migrate } from './persistence';
import { emitGameEvents } from './uiStore';

/** Ejecuta una función del motor, guarda el resultado y emite sus eventos. */
function run(fn: (s: AppState, ctx: Ctx) => EngineResult): EngineResult {
  const r = fn(appStore.get(), getCtx());
  appStore.set(r.state);
  emitGameEvents(r.events);
  return r;
}

function patch(fn: (s: AppState) => AppState) {
  appStore.set(fn);
}

const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

function nextOrder(s: AppState) {
  return s.tasks.reduce((m, t) => Math.max(m, t.order), 0) + 1;
}

export const actions = {
  /* ---------- Tareas ---------- */

  addTask(input: TaskInput): Task {
    const ctx = getCtx();
    const task = buildTask(input, ctx, nextOrder(appStore.get()));
    patch((s) => ({ ...s, tasks: [...s.tasks, task] }));
    return task;
  },

  /** Crea una tarea desde la entrada rápida, creando la lista si no existe. */
  quickAdd(text: string, defaults: { date?: DateStr | null; listId?: string } = {}): Task | null {
    const ctx = getCtx();
    const p = parseQuickAdd(text, ctx.today);
    if (!p.title) return null;
    let listId = defaults.listId ?? INBOX_ID;
    if (p.listName) {
      const found = appStore.get().lists.find((l) => fold(l.name).startsWith(fold(p.listName!)));
      listId = found ? found.id : (actions.addList({ name: p.listName }).list?.id ?? listId);
    }
    return actions.addTask({
      title: p.title,
      date: p.date ?? (p.recurrence ? null : defaults.date ?? null),
      time: p.time,
      recurrence: p.recurrence ?? NO_REPEAT,
      priority: p.priority ?? undefined,
      listId,
      tags: p.tags,
    });
  },

  updateTask(id: string, input: Partial<TaskInput>) {
    const ctx = getCtx();
    patch((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? updateTaskFields(t, input, ctx) : t)) }));
  },

  deleteTask(id: string): Task | undefined {
    const task = appStore.get().tasks.find((t) => t.id === id);
    patch((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) }));
    return task;
  },

  restoreTask(task: Task) {
    patch((s) => (s.tasks.some((t) => t.id === task.id) ? s : { ...s, tasks: [...s.tasks, task] }));
  },

  duplicateTask(id: string) {
    const t = appStore.get().tasks.find((x) => x.id === id);
    if (!t) return;
    const copy: Task = {
      ...t, id: uid('t'), title: `${t.title} (copia)`, status: 'todo', completedAt: null,
      createdAt: Date.now(), updatedAt: Date.now(), order: nextOrder(appStore.get()),
      subtasks: t.subtasks.map((st) => ({ ...st, id: uid('s'), done: false })),
    };
    patch((s) => ({ ...s, tasks: [...s.tasks, copy] }));
    return copy;
  },

  completeTask(id: string) {
    return run((s, ctx) => engine.completeTask(s, id, ctx));
  },

  undoCompletion(entryId: string) {
    return run((s, ctx) => engine.undoCompletion(s, entryId, ctx));
  },

  setStatus(id: string, status: TaskStatus) {
    return run((s, ctx) => engine.setStatus(s, id, status, ctx));
  },

  /** Mueve solo la ocurrencia actual (no cambia la serie de una recurrente). */
  reschedule(id: string, date: DateStr | null) {
    patch((s) => ({
      ...s,
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, dueDate: date, updatedAt: Date.now() } : t)),
    }));
  },

  rescheduleOverdue(ids: string[], date: DateStr) {
    patch((s) => ({
      ...s,
      tasks: s.tasks.map((t) => (ids.includes(t.id) ? { ...t, dueDate: maxDate(date, t.dueDate ?? date), updatedAt: Date.now() } : t)),
    }));
  },

  /** Marca/desmarca una subtarea. Devuelve true si con esto quedan todas hechas. */
  toggleSubtask(taskId: string, subId: string): boolean {
    let allDone = false;
    patch((s) => ({
      ...s,
      tasks: s.tasks.map((t) => {
        if (t.id !== taskId) return t;
        const subtasks = t.subtasks.map((st) => (st.id === subId ? { ...st, done: !st.done } : st));
        const anyDone = subtasks.some((st) => st.done);
        allDone = subtasks.length > 0 && subtasks.every((st) => st.done);
        // Empezar una subtarea pone la tarea "en proceso"; desmarcarlas todas la devuelve a pendiente.
        const status = t.status === 'todo' && anyDone ? 'in_progress' : t.status === 'in_progress' && !anyDone ? 'todo' : t.status;
        return { ...t, status, subtasks, updatedAt: Date.now() };
      }),
    }));
    return allDone;
  },

  addSubtask(taskId: string, title: string) {
    const clean = title.trim();
    if (!clean) return;
    patch((s) => ({
      ...s,
      tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, subtasks: [...t.subtasks, emptySubtask(clean)], updatedAt: Date.now() } : t)),
    }));
  },

  deleteSubtask(taskId: string, subId: string) {
    patch((s) => ({
      ...s,
      tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, subtasks: t.subtasks.filter((st) => st.id !== subId) } : t)),
    }));
  },

  /** Guarda el nuevo orden de un grupo de tareas. Activa el orden personalizado. */
  reorder(ids: string[]) {
    patch((s) => ({
      ...s,
      tasks: reorderTasks(s.tasks, ids, s.settings.taskSort),
      settings: s.settings.taskSort === 'manual' ? s.settings : { ...s.settings, taskSort: 'manual' },
    }));
  },

  setTaskSort(sort: TaskSort) {
    patch((s) => ({ ...s, settings: { ...s.settings, taskSort: sort } }));
  },

  /* ---------- Listas ---------- */

  addList(input: { name: string; emoji?: string; color?: string }): { list?: TaskList; error?: string } {
    const s = appStore.get();
    const limit = limitsFor(s.meta.plan).lists;
    if (s.lists.length >= limit) return { error: `El plan gratuito permite hasta ${limit} listas.` };
    const list: TaskList = {
      id: uid('l'),
      name: input.name.trim() || 'Nueva lista',
      emoji: input.emoji || '📁',
      color: input.color || LIST_COLORS[s.lists.length % LIST_COLORS.length],
      order: s.lists.length,
    };
    patch((st) => ({ ...st, lists: [...st.lists, list] }));
    return { list };
  },

  updateList(id: string, p: Partial<Pick<TaskList, 'name' | 'emoji' | 'color'>>) {
    patch((s) => ({ ...s, lists: s.lists.map((l) => (l.id === id ? { ...l, ...p } : l)) }));
  },

  deleteList(id: string) {
    patch((s) => {
      const list = s.lists.find((l) => l.id === id);
      if (!list || list.system) return s;
      return {
        ...s,
        lists: s.lists.filter((l) => l.id !== id),
        tasks: s.tasks.map((t) => (t.listId === id ? { ...t, listId: INBOX_ID } : t)),
      };
    });
  },

  /* ---------- Rana y tienda ---------- */

  buy(itemId: string) {
    const r = engine.buyItem(appStore.get(), itemId, getCtx());
    if (r.ok) appStore.set(r.state);
    return r;
  },

  toggleEquip(itemId: string) {
    patch((s) => engine.toggleEquip(s, itemId));
  },

  renameFrog(name: string) {
    const clean = name.trim().slice(0, 24);
    if (clean) patch((s) => ({ ...s, frog: { ...s.frog, name: clean } }));
  },

  /* ---------- Día ---------- */

  rollover() {
    return run((s, ctx) => engine.rollover(s, ctx));
  },

  /** Revisión del día: marca lo que se hizo ayer y después cierra el día. */
  finishReview(doneIds: string[]) {
    run((s, ctx) => {
      let state = s;
      const events: EngineResult['events'] = [];
      for (const id of doneIds) {
        const t = state.tasks.find((x) => x.id === id);
        if (!t?.dueDate) continue;
        const r = engine.completeTask(state, id, ctx, { on: t.dueDate });
        state = r.state;
        events.push(...r.events);
      }
      const r = engine.rollover(state, ctx);
      // Si en el mismo cierre se sube y se baja de nivel, solo se comunica el resultado neto.
      const all = [...events, ...r.events].filter((e) => !['levelUp', 'levelDown', 'evolve', 'devolve'].includes(e.type));
      const before = levelInfo(s.frog.xp).level;
      const after = levelInfo(r.state.frog.xp).level;
      if (after !== before) {
        all.push({ type: after > before ? 'levelUp' : 'levelDown', level: after });
        const sb = stageForLevel(before).id;
        const sa = stageForLevel(after).id;
        if (sb !== sa) all.push({ type: after > before ? 'evolve' : 'devolve', stage: sa });
      }
      return { state: r.state, events: all };
    });
  },

  /* ---------- Ajustes ---------- */

  updateSettings(p: Partial<Settings>) {
    patch((s) => ({ ...s, settings: { ...s.settings, ...p } }));
  },

  setPlan(plan: Plan) {
    patch((s) => ({ ...s, meta: { ...s.meta, plan } }));
  },

  markNotificationsRead() {
    patch((s) => ({ ...s, notifications: s.notifications.map((n) => (n.read ? n : { ...n, read: true })) }));
  },

  clearNotifications() {
    patch((s) => ({ ...s, notifications: [] }));
  },

  finishOnboarding(frogName: string, starterIds: string[]) {
    const ctx = getCtx();
    patch((s) => {
      let order = nextOrder(s);
      const tasks = STARTER_TASKS.filter((t) => starterIds.includes(t.id)).map((t) => buildTask(t.input, ctx, order++));
      return {
        ...s,
        tasks: [...s.tasks, ...tasks],
        frog: { ...s.frog, name: frogName.trim().slice(0, 24) || s.frog.name },
        meta: { ...s.meta, onboarded: true, lastRolloverDate: ctx.today },
      };
    });
  },

  /* ---------- Datos ---------- */

  exportData(): string {
    return JSON.stringify(appStore.get(), null, 2);
  },

  importData(json: string): { ok: boolean; error?: string } {
    try {
      const next = migrate(JSON.parse(json));
      if (!next) return { ok: false, error: 'El archivo no tiene el formato de una copia de Croac.' };
      appStore.set(next);
      return { ok: true };
    } catch {
      return { ok: false, error: 'No se pudo leer el archivo. Comprueba que es un .json exportado desde Croac.' };
    }
  },

  resetAll() {
    storage.clear();
    appStore.set(createInitialState());
  },
};
