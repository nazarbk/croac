/**
 * Motor del juego: funciones PURAS que reciben el estado y devuelven el nuevo
 * estado + eventos (subida de nivel, recompensa…). No tocan React ni el
 * almacenamiento, así que son triviales de testear y de mover a un backend.
 */
import { addDays, diffDays, maxDate, type DateStr } from './dates';
import {
  levelInfo, MAX_PENALTY_CATCHUP_DAYS, PERFECT_DAY_BONUS, dailyPenaltyFor, rewardFor, stageForLevel,
} from './progression';
import { isRecurring, nextOccurrence, prevOccurrence } from './recurrence';
import { canBuy, itemById } from './shop';
import { can } from './plans';
import type {
  AppNotification, AppState, Ctx, EngineResult, GameEvent, HistoryEntry, PenaltyDetail, Task, TaskStatus,
} from './types';

import { uid } from './id';

export { uid };

const MAX_NOTIFICATIONS = 60;

function pushNotification(state: AppState, n: Omit<AppNotification, 'id' | 'read'>): AppState {
  const notif: AppNotification = { ...n, id: uid('n'), read: false };
  return { ...state, notifications: [notif, ...state.notifications].slice(0, MAX_NOTIFICATIONS) };
}

/* ---------- Consultas ---------- */

export const isOpen = (t: Task) => t.status !== 'done';

export function overdueDays(t: Task, today: DateStr): number {
  if (!t.dueDate || !isOpen(t)) return 0;
  return Math.max(0, diffDays(today, t.dueDate));
}

/** Tareas pendientes cuya fecha es hoy o anterior. */
export const isActionable = (t: Task, today: DateStr) => isOpen(t) && !!t.dueDate && t.dueDate <= today;

/** Las recurrentes no se pueden adelantar (evita "farmear" XP). */
export function canComplete(t: Task, today: DateStr): boolean {
  if (!isOpen(t)) return false;
  if (isRecurring(t.recurrence) && t.dueDate && t.dueDate > today) return false;
  return true;
}

export function completionDates(history: HistoryEntry[], taskId: string): DateStr[] {
  return history
    .filter((h) => h.type === 'complete' && h.taskId === taskId)
    .map((h) => h.date)
    .sort();
}

/**
 * Racha de una tarea recurrente: nº de ocurrencias consecutivas cubiertas.
 * Una ocurrencia `s` está cubierta si se completó entre `s` y la siguiente
 * ocurrencia (así, hacer el sábado la tarea del viernes aún cuenta).
 * La ocurrencia en curso no rompe la racha mientras siga abierta.
 */
export function taskStreak(task: Task, completions: DateStr[], today: DateStr): number {
  if (!isRecurring(task.recurrence) || !task.anchorDate) return 0;
  const { recurrence: r, anchorDate: anchor } = task;
  const covered = (s: DateStr) => {
    const next = nextOccurrence(r, anchor, s);
    return completions.some((c) => c >= s && (!next || c < next));
  };
  let s = prevOccurrence(r, anchor, today);
  if (s && !covered(s)) s = prevOccurrence(r, anchor, addDays(s, -1));
  let count = 0;
  while (s && covered(s) && count < 5000) {
    count++;
    s = prevOccurrence(r, anchor, addDays(s, -1));
  }
  return count;
}

/** Días consecutivos (hasta hoy o ayer) con al menos una tarea completada. */
export function globalStreak(history: HistoryEntry[], today: DateStr): { current: number; best: number } {
  const days = new Set(history.filter((h) => h.type === 'complete').map((h) => h.date));
  let current = 0;
  let d = days.has(today) ? today : addDays(today, -1);
  while (days.has(d)) {
    current++;
    d = addDays(d, -1);
  }
  const sorted = [...days].sort();
  let best = 0;
  let run = 0;
  for (let i = 0; i < sorted.length; i++) {
    run = i > 0 && diffDays(sorted[i], sorted[i - 1]) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return { current, best: Math.max(best, current) };
}

export type Mood = 'happy' | 'neutral' | 'worried' | 'sad' | 'sleeping';

export function frogMood(state: AppState, today: DateStr): Mood {
  if (state.settings.vacationMode) return 'sleeping';
  const grace = state.settings.graceDays;
  let worried = false;
  for (const t of state.tasks) {
    const od = overdueDays(t, today);
    if (od > grace) return 'sad';
    if (od >= 1) worried = true;
  }
  if (worried) return 'worried';
  const doneToday = state.history.some((h) => h.type === 'complete' && h.date === today);
  const pendingToday = state.tasks.some((t) => isActionable(t, today));
  if (doneToday && !pendingToday) return 'happy';
  return 'neutral';
}

/* ---------- XP y niveles ---------- */

export function applyXp(state: AppState, delta: number, ctx: Ctx): EngineResult {
  const before = levelInfo(state.frog.xp).level;
  const xp = Math.max(0, state.frog.xp + delta);
  const after = levelInfo(xp).level;
  const events: GameEvent[] = [];
  let next: AppState = {
    ...state,
    frog: { ...state.frog, xp, bestLevel: Math.max(state.frog.bestLevel, after) },
  };
  if (after !== before) {
    const sBefore = stageForLevel(before);
    const sAfter = stageForLevel(after);
    if (after > before) {
      events.push({ type: 'levelUp', level: after });
      next = pushNotification(next, {
        kind: 'level', at: ctx.now,
        title: `¡Nivel ${after}!`,
        body: sBefore.id !== sAfter.id ? `${state.frog.name} ha evolucionado: ahora es ${sAfter.name}.` : `${state.frog.name} sigue creciendo.`,
      });
    } else {
      events.push({ type: 'levelDown', level: after });
      next = pushNotification(next, {
        kind: 'penalty', at: ctx.now,
        title: `${state.frog.name} ha bajado al nivel ${after}`,
        body: 'Completa tus tareas atrasadas para recuperar la experiencia.',
      });
    }
    if (sBefore.id !== sAfter.id) {
      events.push({ type: after > before ? 'evolve' : 'devolve', stage: sAfter.id });
    }
  }
  return { state: next, events };
}

/* ---------- Completar / deshacer ---------- */

function isPerfectDay(state: AppState, date: DateStr): boolean {
  const any = state.history.some((h) => h.type === 'complete' && h.date === date);
  if (!any) return false;
  return !state.tasks.some((t) => isOpen(t) && t.dueDate && t.dueDate <= date);
}

function checkPerfectDay(state: AppState, ctx: Ctx): EngineResult {
  const date = ctx.today;
  if (state.meta.perfectDays.includes(date) || !isPerfectDay(state, date)) return { state, events: [] };
  const entry: HistoryEntry = {
    id: uid('h'), type: 'bonus', date, at: ctx.now,
    xp: PERFECT_DAY_BONUS.xp, coins: PERFECT_DAY_BONUS.coins, title: 'Día perfecto',
  };
  let next: AppState = {
    ...state,
    history: [...state.history, entry],
    meta: { ...state.meta, perfectDays: [...state.meta.perfectDays, date] },
    frog: { ...state.frog, coins: state.frog.coins + entry.coins },
  };
  const r = applyXp(next, entry.xp, ctx);
  next = r.state;
  return { state: next, events: [{ type: 'perfectDay', ...PERFECT_DAY_BONUS }, ...r.events] };
}

export function completeTask(state: AppState, taskId: string, ctx: Ctx, opts: { on?: DateStr } = {}): EngineResult {
  const task = state.tasks.find((t) => t.id === taskId);
  const on = opts.on ?? ctx.today;
  if (!task || !canComplete(task, on)) return { state, events: [] };

  const late = !!task.dueDate && task.dueDate < on;
  const completions = [...completionDates(state.history, task.id), on];
  const streak = isRecurring(task.recurrence) ? taskStreak(task, completions, on) : 0;
  const reward = rewardFor(task, { streak, late });

  const entry: HistoryEntry = {
    id: uid('h'), type: 'complete', date: on, at: ctx.now,
    xp: reward.xp, coins: reward.coins, title: task.title, taskId: task.id, listId: task.listId,
    prev: { dueDate: task.dueDate, status: task.status, subtasks: task.subtasks, completedAt: task.completedAt },
  };

  let updated: Task;
  if (isRecurring(task.recurrence) && task.anchorDate) {
    const from = task.dueDate ? maxDate(on, task.dueDate) : on;
    updated = {
      ...task,
      status: 'todo',
      dueDate: nextOccurrence(task.recurrence, task.anchorDate, from),
      subtasks: task.subtasks.map((s) => ({ ...s, done: false })),
      completedAt: ctx.now,
      updatedAt: ctx.now,
    };
  } else {
    updated = { ...task, status: 'done', completedAt: ctx.now, updatedAt: ctx.now };
  }

  let next: AppState = {
    ...state,
    tasks: state.tasks.map((t) => (t.id === task.id ? updated : t)),
    history: [...state.history, entry],
    frog: { ...state.frog, coins: state.frog.coins + reward.coins },
  };
  const events: GameEvent[] = [
    { type: 'reward', taskId: task.id, title: task.title, xp: reward.xp, coins: reward.coins, entryId: entry.id, streak },
  ];
  const xpRes = applyXp(next, reward.xp, ctx);
  next = xpRes.state;
  events.push(...xpRes.events);
  if (on === ctx.today) {
    const pd = checkPerfectDay(next, ctx);
    next = pd.state;
    events.push(...pd.events);
  }
  return { state: next, events };
}

export function undoCompletion(state: AppState, entryId: string, ctx: Ctx): EngineResult {
  const entry = state.history.find((h) => h.id === entryId && h.type === 'complete');
  if (!entry) return { state, events: [] };
  let next: AppState = {
    ...state,
    history: state.history.filter((h) => h.id !== entryId),
    frog: { ...state.frog, coins: Math.max(0, state.frog.coins - entry.coins) },
    tasks: state.tasks.map((t) =>
      t.id === entry.taskId && entry.prev
        ? { ...t, dueDate: entry.prev.dueDate, status: entry.prev.status, subtasks: entry.prev.subtasks, completedAt: entry.prev.completedAt, updatedAt: ctx.now }
        : t,
    ),
  };
  const events: GameEvent[] = [];
  const r = applyXp(next, -entry.xp, ctx);
  next = r.state;
  events.push(...r.events);

  // Si deshacer rompe un "día perfecto", se retira el bonus.
  if (next.meta.perfectDays.includes(entry.date) && !isPerfectDay(next, entry.date)) {
    const bonus = next.history.find((h) => h.type === 'bonus' && h.date === entry.date);
    next = {
      ...next,
      meta: { ...next.meta, perfectDays: next.meta.perfectDays.filter((d) => d !== entry.date) },
      history: bonus ? next.history.filter((h) => h.id !== bonus.id) : next.history,
      frog: bonus ? { ...next.frog, coins: Math.max(0, next.frog.coins - bonus.coins) } : next.frog,
    };
    if (bonus) {
      const rb = applyXp(next, -bonus.xp, ctx);
      next = rb.state;
      events.push(...rb.events);
    }
  }
  return { state: next, events };
}

/** Última compleción registrada de una tarea (para "reabrir"). */
export function lastCompletionEntry(state: AppState, taskId: string): HistoryEntry | undefined {
  for (let i = state.history.length - 1; i >= 0; i--) {
    const h = state.history[i];
    if (h.type === 'complete' && h.taskId === taskId) return h;
  }
  return undefined;
}

export function setStatus(state: AppState, taskId: string, status: TaskStatus, ctx: Ctx): EngineResult {
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task || task.status === status) return { state, events: [] };
  if (status === 'done') return completeTask(state, taskId, ctx);
  if (task.status === 'done') {
    // Reabrir: se deshace la última compleción para devolver XP y monedas.
    const entry = lastCompletionEntry(state, taskId);
    const res = entry ? undoCompletion(state, entry.id, ctx) : { state, events: [] };
    return {
      state: { ...res.state, tasks: res.state.tasks.map((t) => (t.id === taskId ? { ...t, status, completedAt: null } : t)) },
      events: res.events,
    };
  }
  return {
    state: { ...state, tasks: state.tasks.map((t) => (t.id === taskId ? { ...t, status, updatedAt: ctx.now } : t)) },
    events: [],
  };
}

/* ---------- Cierre diario: avisos y penalizaciones ---------- */

/**
 * Tareas que vencían desde la última apertura y siguen abiertas. Se muestran
 * en la "revisión del día" para marcar lo que se hizo pero no se apuntó,
 * ANTES de aplicar penalizaciones (idea tomada de Habitica).
 */
export function tasksForReview(state: AppState, today: DateStr): Task[] {
  const last = state.meta.lastRolloverDate;
  if (!last || last >= today) return [];
  return state.tasks.filter((t) => isOpen(t) && t.dueDate && t.dueDate < today && t.dueDate >= last);
}

export function needsRollover(state: AppState, today: DateStr): boolean {
  return !state.meta.lastRolloverDate || state.meta.lastRolloverDate < today;
}

export function rollover(state: AppState, ctx: Ctx): EngineResult {
  const last = state.meta.lastRolloverDate;
  const today = ctx.today;
  if (last && last >= today) return { state, events: [] };
  let next: AppState = { ...state, meta: { ...state.meta, lastRolloverDate: today } };
  if (!last || state.settings.vacationMode) return { state: next, events: [] };

  const { graceDays, penaltiesEnabled } = state.settings;
  const from = maxDate(addDays(last, 1), addDays(today, -(MAX_PENALTY_CATCHUP_DAYS - 1)));
  const details: PenaltyDetail[] = [];
  const warned: string[] = [];

  for (const t of state.tasks) {
    if (!isOpen(t) || !t.dueDate) continue;
    if (overdueDays(t, today) > graceDays) warned.push(t.title);
    if (!penaltiesEnabled) continue;
    let days = 0;
    for (let d = from; d <= today; d = addDays(d, 1)) {
      if (diffDays(d, t.dueDate) > graceDays) days++;
    }
    if (days > 0) details.push({ taskId: t.id, title: t.title, days, xp: days * dailyPenaltyFor(t) });
  }

  const events: GameEvent[] = [];
  if (warned.length) {
    events.push({ type: 'warning', titles: warned });
    next = pushNotification(next, {
      kind: 'warning', at: ctx.now,
      title: warned.length === 1 ? 'Una tarea lleva varios días atrasada' : `${warned.length} tareas llevan varios días atrasadas`,
      body: warned.slice(0, 3).join(' · ') + (warned.length > 3 ? '…' : ''),
    });
  }
  const total = details.reduce((a, d) => a + d.xp, 0);
  if (total > 0) {
    const entry: HistoryEntry = {
      id: uid('h'), type: 'penalty', date: today, at: ctx.now, xp: -total, coins: 0,
      title: 'Tareas atrasadas', details,
    };
    next = { ...next, history: [...next.history, entry] };
    next = pushNotification(next, {
      kind: 'penalty', at: ctx.now,
      title: `${state.frog.name} ha perdido ${total} XP`,
      body: 'Por tareas que llevan varios días sin completarse.',
    });
    events.push({ type: 'penalty', xp: total, details });
    const r = applyXp(next, -total, ctx);
    next = r.state;
    events.push(...r.events);
  }
  return { state: next, events };
}

/* ---------- Tienda ---------- */

export function buyItem(state: AppState, itemId: string, ctx: Ctx): { state: AppState; ok: boolean; reason?: string } {
  const item = itemById(itemId);
  const check = canBuy(item, {
    coins: state.frog.coins,
    level: levelInfo(state.frog.xp).level,
    owned: state.frog.owned,
    isPro: can(state.meta.plan, 'premiumItems'),
  });
  if (!check.ok || !item) return { state, ok: false, reason: check.ok ? 'unknown' : check.reason };
  const entry: HistoryEntry = {
    id: uid('h'), type: 'purchase', date: ctx.today, at: ctx.now, xp: 0, coins: -item.price, title: item.name,
  };
  return {
    ok: true,
    state: {
      ...state,
      history: [...state.history, entry],
      frog: {
        ...state.frog,
        coins: state.frog.coins - item.price,
        owned: [...state.frog.owned, item.id],
        equipped: { ...state.frog.equipped, [item.slot]: item.id },
      },
    },
  };
}

export function toggleEquip(state: AppState, itemId: string): AppState {
  const item = itemById(itemId);
  if (!item || !state.frog.owned.includes(itemId)) return state;
  const equipped = { ...state.frog.equipped };
  if (equipped[item.slot] === itemId) {
    // Piel y fondo siempre tienen que tener algo puesto.
    if (item.slot === 'skin' || item.slot === 'background') return state;
    delete equipped[item.slot];
  } else {
    equipped[item.slot] = itemId;
  }
  return { ...state, frog: { ...state.frog, equipped } };
}
