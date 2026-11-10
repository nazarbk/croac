import { addDays, rangeDays, type DateStr } from './dates';
import { completionDates, globalStreak, taskStreak } from './engine';
import { isRecurring, isScheduledOn } from './recurrence';
import type { AppState } from './types';

export interface DayStat {
  date: DateStr;
  completed: number;
  xp: number;
}

export function dailyStats(state: AppState, from: DateStr, to: DateStr): DayStat[] {
  const map = new Map<DateStr, DayStat>(rangeDays(from, to).map((d) => [d, { date: d, completed: 0, xp: 0 }]));
  for (const h of state.history) {
    const s = map.get(h.date);
    if (!s) continue;
    if (h.type === 'complete') s.completed++;
    s.xp += h.xp;
  }
  return [...map.values()];
}

export function summary(state: AppState, today: DateStr) {
  const completes = state.history.filter((h) => h.type === 'complete');
  const weekAgo = addDays(today, -6);
  const lastWeek = state.history.filter((h) => h.date >= weekAgo && h.date <= today);
  const streak = globalStreak(state.history, today);
  return {
    totalCompleted: completes.length,
    perfectDays: state.meta.perfectDays.length,
    currentStreak: streak.current,
    bestStreak: streak.best,
    xpLastWeek: lastWeek.reduce((a, h) => a + Math.max(0, h.xp), 0),
    xpLostLastWeek: lastWeek.reduce((a, h) => a + Math.min(0, h.xp), 0),
    completedLastWeek: lastWeek.filter((h) => h.type === 'complete').length,
    coinsEarned: state.history.reduce((a, h) => a + Math.max(0, h.coins), 0),
  };
}

export function completionsByList(state: AppState, from: DateStr) {
  const counts = new Map<string, number>();
  for (const h of state.history) {
    if (h.type !== 'complete' || h.date < from) continue;
    const id = h.listId ?? 'inbox';
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return state.lists
    .map((l) => ({ list: l, count: counts.get(l.id) ?? 0 }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count);
}

export type HabitDay = 'done' | 'missed' | 'pending' | 'off';

/** Hábitos (tareas recurrentes) con su racha y los últimos N días. */
export function habitsOverview(state: AppState, today: DateStr, days = 7) {
  const range = rangeDays(addDays(today, -(days - 1)), today);
  return state.tasks
    .filter((t) => isRecurring(t.recurrence) && t.anchorDate)
    .map((t) => {
      const dates = completionDates(state.history, t.id);
      const set = new Set(dates);
      const cells: { date: DateStr; state: HabitDay }[] = range.map((d) => {
        if (set.has(d)) return { date: d, state: 'done' };
        if (!isScheduledOn(t.recurrence, t.anchorDate!, d)) return { date: d, state: 'off' };
        return { date: d, state: d === today ? 'pending' : 'missed' };
      });
      return { task: t, streak: taskStreak(t, dates, today), cells };
    })
    .sort((a, b) => b.streak - a.streak);
}
