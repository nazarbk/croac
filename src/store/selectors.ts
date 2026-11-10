import { useMemo } from 'react';
import { completionDates, frogMood, globalStreak, overdueDays, taskStreak } from '../domain/engine';
import { levelInfo, nextStage, stageForLevel } from '../domain/progression';
import { isRecurring } from '../domain/recurrence';
import { compareFor } from '../domain/tasks';
import { appStore, useApp, useToday } from './appStore';

/** Nivel, etapa, ánimo y racha de la rana (memorizado). */
export function useFrogInfo() {
  const frog = useApp((s) => s.frog);
  const tasks = useApp((s) => s.tasks);
  const history = useApp((s) => s.history);
  const settings = useApp((s) => s.settings);
  const today = useToday();
  return useMemo(() => {
    const li = levelInfo(frog.xp);
    return {
      frog,
      ...li,
      stage: stageForLevel(li.level),
      next: nextStage(li.level),
      mood: frogMood(appStore.get(), today),
      streak: globalStreak(history, today),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frog, tasks, history, settings, today]);
}

export function useListsById() {
  const lists = useApp((s) => s.lists);
  return useMemo(() => new Map(lists.map((l) => [l.id, l])), [lists]);
}

/** Racha por tarea recurrente. */
export function useStreaks() {
  const tasks = useApp((s) => s.tasks);
  const history = useApp((s) => s.history);
  const today = useToday();
  return useMemo(() => {
    const m = new Map<string, number>();
    for (const t of tasks) if (isRecurring(t.recurrence)) m.set(t.id, taskStreak(t, completionDates(history, t.id), today));
    return m;
  }, [tasks, history, today]);
}

/** Comparador según el modo de orden elegido (personalizado o inteligente). */
export function useTaskCompare() {
  const sort = useApp((s) => s.settings.taskSort);
  return compareFor(sort);
}

/** Tareas de hoy agrupadas: atrasadas, para hoy. */
export function useTodayGroups() {
  const tasks = useApp((s) => s.tasks);
  const grace = useApp((s) => s.settings.graceDays);
  const compare = useTaskCompare();
  const today = useToday();
  return useMemo(() => {
    const overdue = tasks.filter((t) => t.status !== 'done' && t.dueDate && t.dueDate < today).sort(compare);
    const due = tasks.filter((t) => t.status !== 'done' && t.dueDate === today).sort(compare);
    const penalized = overdue.filter((t) => overdueDays(t, today) > grace);
    return { overdue, due, penalized };
  }, [tasks, today, grace, compare]);
}
