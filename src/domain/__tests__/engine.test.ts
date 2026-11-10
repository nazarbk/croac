import { describe, expect, it } from 'vitest';
import { createInitialState } from '../defaults';
import {
  buyItem, canComplete, completeTask, frogMood, overdueDays, rollover, setStatus, taskStreak,
  completionDates, tasksForReview, undoCompletion,
} from '../engine';
import { levelInfo, totalXpForLevel, stageForLevel, PERFECT_DAY_BONUS } from '../progression';
import { buildTask, compareFor, reorderTasks, updateTaskFields, type TaskInput } from '../tasks';
import type { AppState, Ctx } from '../types';

const ctx = (today: string): Ctx => ({ today, now: Date.parse(`${today}T12:00:00`) });

function withTasks(inputs: TaskInput[], today = '2026-11-03'): AppState {
  const s = createInitialState(0);
  return {
    ...s,
    tasks: inputs.map((i, n) => buildTask(i, ctx(today), n)),
    meta: { ...s.meta, lastRolloverDate: today, onboarded: true },
  };
}

describe('niveles', () => {
  it('curva de experiencia', () => {
    expect(totalXpForLevel(1)).toBe(0);
    expect(totalXpForLevel(2)).toBe(50);
    expect(totalXpForLevel(3)).toBe(125);
    expect(levelInfo(0).level).toBe(1);
    expect(levelInfo(124).level).toBe(2);
    expect(levelInfo(125).level).toBe(3);
  });

  it('etapas de evolución', () => {
    expect(stageForLevel(1).id).toBe('tadpole');
    expect(stageForLevel(5).id).toBe('froglet');
    expect(stageForLevel(10).id).toBe('young');
    expect(stageForLevel(20).id).toBe('adult');
    expect(stageForLevel(40).id).toBe('sage');
  });
});

describe('completar tareas', () => {
  it('una tarea puntual da XP y monedas y queda hecha', () => {
    const s = withTasks([{ title: 'Llamar al banco', date: '2026-11-03', difficulty: 'medium' }]);
    const id = s.tasks[0].id;
    const { state, events } = completeTask(s, id, ctx('2026-11-03'));
    expect(state.tasks[0].status).toBe('done');
    expect(state.frog.xp).toBe(20 + PERFECT_DAY_BONUS.xp);
    expect(state.frog.coins).toBe(20 + 6 + PERFECT_DAY_BONUS.coins);
    expect(events.map((e) => e.type)).toContain('perfectDay');
  });

  it('una recurrente avanza a la siguiente fecha y resetea subtareas', () => {
    const s = withTasks([{
      title: 'Leer', recurrence: { type: 'daily', interval: 1 },
      subtasks: [{ id: 'a', title: 'capítulo', done: true }],
    }]);
    const { state } = completeTask(s, s.tasks[0].id, ctx('2026-11-03'));
    expect(state.tasks[0].status).toBe('todo');
    expect(state.tasks[0].dueDate).toBe('2026-11-04');
    expect(state.tasks[0].subtasks[0].done).toBe(false);
  });

  it('no deja adelantar una recurrente', () => {
    const s = withTasks([{ title: 'Leer', recurrence: { type: 'daily', interval: 1 } }]);
    const r1 = completeTask(s, s.tasks[0].id, ctx('2026-11-03')).state;
    expect(canComplete(r1.tasks[0], '2026-11-03')).toBe(false);
    const r2 = completeTask(r1, r1.tasks[0].id, ctx('2026-11-03'));
    expect(r2.state).toBe(r1);
  });

  it('completar tarde da menos XP y salta a la siguiente fecha futura', () => {
    const s = withTasks([{ title: 'Gimnasio', recurrence: { type: 'weekly', interval: 1, days: [1] }, difficulty: 'hard', date: '2026-11-02' }], '2026-11-02');
    const { state, events } = completeTask(s, s.tasks[0].id, ctx('2026-11-04'));
    const reward = events.find((e) => e.type === 'reward');
    expect(reward && reward.type === 'reward' && reward.xp).toBe(Math.round(35 * 0.75));
    expect(state.tasks[0].dueDate).toBe('2026-11-09');
  });

  it('la racha da bonus de XP', () => {
    let s = withTasks([{ title: 'Leer', recurrence: { type: 'daily', interval: 1 }, difficulty: 'easy', date: '2026-11-01' }], '2026-11-01');
    let lastXp = 0;
    for (const d of ['2026-11-01', '2026-11-02', '2026-11-03']) {
      const r = completeTask(s, s.tasks[0].id, ctx(d));
      s = r.state;
      const ev = r.events.find((e) => e.type === 'reward');
      if (ev?.type === 'reward') lastXp = ev.xp;
    }
    expect(taskStreak(s.tasks[0], completionDates(s.history, s.tasks[0].id), '2026-11-03')).toBe(3);
    expect(lastXp).toBe(Math.round(10 * 1.1));
  });

  it('la racha no se rompe mientras la ocurrencia de hoy sigue abierta', () => {
    let s = withTasks([{ title: 'Leer', recurrence: { type: 'daily', interval: 1 }, date: '2026-11-01' }], '2026-11-01');
    s = completeTask(s, s.tasks[0].id, ctx('2026-11-01')).state;
    s = completeTask(s, s.tasks[0].id, ctx('2026-11-02')).state;
    expect(taskStreak(s.tasks[0], completionDates(s.history, s.tasks[0].id), '2026-11-03')).toBe(2);
    expect(taskStreak(s.tasks[0], completionDates(s.history, s.tasks[0].id), '2026-11-04')).toBe(0);
  });

  it('deshacer devuelve todo a su sitio (incluido el día perfecto)', () => {
    const s = withTasks([{ title: 'Algo', date: '2026-11-03' }]);
    const done = completeTask(s, s.tasks[0].id, ctx('2026-11-03')).state;
    const entry = done.history.find((h) => h.type === 'complete')!;
    const undone = undoCompletion(done, entry.id, ctx('2026-11-03')).state;
    expect(undone.tasks[0].status).toBe('todo');
    expect(undone.frog.xp).toBe(0);
    expect(undone.frog.coins).toBe(20);
    expect(undone.meta.perfectDays).toEqual([]);
    expect(undone.history).toEqual([]);
  });

  it('marcar en proceso y reabrir', () => {
    const s = withTasks([{ title: 'Informe', date: '2026-11-03' }]);
    const id = s.tasks[0].id;
    const p = setStatus(s, id, 'in_progress', ctx('2026-11-03')).state;
    expect(p.tasks[0].status).toBe('in_progress');
    const d = setStatus(p, id, 'done', ctx('2026-11-03')).state;
    const reopened = setStatus(d, id, 'todo', ctx('2026-11-03')).state;
    expect(reopened.tasks[0].status).toBe('todo');
    expect(reopened.frog.xp).toBe(0);
  });
});

describe('cierre diario y penalizaciones', () => {
  const base = () => withTasks([
    { title: 'Puntual', date: '2026-11-03', difficulty: 'medium', priority: 3 },
    { title: 'Sin fecha' },
  ]);

  it('el primer día de retraso es margen: avisa pero no penaliza', () => {
    const s = { ...base(), frog: { ...base().frog, xp: 500 } };
    const r = rollover(s, ctx('2026-11-04'));
    expect(r.state.frog.xp).toBe(500);
    expect(overdueDays(r.state.tasks[0], '2026-11-04')).toBe(1);
    expect(frogMood(r.state, '2026-11-04')).toBe('worried');
    expect(r.state.meta.lastRolloverDate).toBe('2026-11-04');
  });

  it('a partir del segundo día pierde XP cada día y avisa', () => {
    let s: AppState = { ...base(), frog: { ...base().frog, xp: 520 } };
    s = rollover(s, ctx('2026-11-04')).state;
    const r = rollover(s, ctx('2026-11-05'));
    expect(r.state.frog.xp).toBe(510); // 20 XP * 0,5 * factor de prioridad 1
    expect(r.events.map((e) => e.type)).toEqual(['warning', 'penalty']);
    expect(frogMood(r.state, '2026-11-05')).toBe('sad');
    const r2 = rollover(r.state, ctx('2026-11-06'));
    expect(r2.state.frog.xp).toBe(500);
  });

  it('tras una ausencia larga la penalización tiene tope', () => {
    const s: AppState = { ...base(), frog: { ...base().frog, xp: 500 } };
    const r = rollover(s, ctx('2026-12-03'));
    expect(r.state.frog.xp).toBe(500 - 7 * 10);
  });

  it('modo vacaciones no penaliza', () => {
    const s: AppState = { ...base(), frog: { ...base().frog, xp: 500 }, settings: { ...base().settings, vacationMode: true } };
    const r = rollover(s, ctx('2026-11-10'));
    expect(r.state.frog.xp).toBe(500);
    expect(frogMood(r.state, '2026-11-10')).toBe('sleeping');
  });

  it('la experiencia nunca baja de 0 y se puede perder nivel', () => {
    const s: AppState = { ...base(), frog: { ...base().frog, xp: totalXpForLevel(2) + 2 } };
    const r = rollover(s, ctx('2026-11-06'));
    expect(r.state.frog.xp).toBe(totalXpForLevel(2) + 2 - 20);
    expect(r.events.some((e) => e.type === 'levelDown')).toBe(true);
    const empty = rollover({ ...base(), frog: { ...base().frog, xp: 3 } }, ctx('2026-11-20'));
    expect(empty.state.frog.xp).toBe(0);
  });

  it('la revisión del día muestra lo pendiente desde la última apertura', () => {
    const s = base();
    expect(tasksForReview(s, '2026-11-04').map((t) => t.title)).toEqual(['Puntual']);
    expect(tasksForReview(s, '2026-11-03')).toEqual([]);
  });
});

describe('editar tareas', () => {
  it('cambiar la recurrencia recalcula la próxima fecha', () => {
    const s = withTasks([{ title: 'Correr', recurrence: { type: 'daily', interval: 1 } }]);
    const t = updateTaskFields(s.tasks[0], { recurrence: { type: 'weekly', interval: 1, days: [6] } }, ctx('2026-11-03'));
    expect(t.dueDate).toBe('2026-11-07');
    const once = updateTaskFields(t, { recurrence: { type: 'none' }, date: '2026-11-10' }, ctx('2026-11-03'));
    expect(once.anchorDate).toBeNull();
    expect(once.dueDate).toBe('2026-11-10');
  });
});

describe('tienda', () => {
  it('compra y equipa si hay monedas y nivel', () => {
    const s = withTasks([]);
    const r = buyItem({ ...s, frog: { ...s.frog, coins: 100 } }, 'hat-party', ctx('2026-11-03'));
    expect(r.ok).toBe(true);
    expect(r.state.frog.coins).toBe(60);
    expect(r.state.frog.equipped.hat).toBe('hat-party');
  });

  it('bloquea por nivel, monedas o plan', () => {
    const s = withTasks([]);
    expect(buyItem(s, 'hat-crown', ctx('2026-11-03')).reason).toBe('level');
    expect(buyItem(s, 'hat-party', ctx('2026-11-03')).reason).toBe('coins');
    expect(buyItem({ ...s, frog: { ...s.frog, coins: 9999, xp: 99999 } }, 'bg-space', ctx('2026-11-03')).reason).toBe('premium');
  });
});

describe('orden personalizado', () => {
  const make = () => withTasks([
    { title: 'A', priority: 1 },
    { title: 'B', priority: 4 },
    { title: 'C', priority: 2 },
    { title: 'D', priority: 4 },
  ]).tasks;
  const titles = (ts: ReturnType<typeof make>, sort: 'manual' | 'smart') =>
    [...ts].sort(compareFor(sort)).map((t) => t.title);

  it('reordena un grupo sin mover el resto', () => {
    const ts = make();
    const ids = (names: string[]) => names.map((n) => ts.find((t) => t.title === n)!.id);
    const next = reorderTasks(ts, ids(['C', 'A']), 'manual');
    expect(titles(next, 'manual')).toEqual(['C', 'B', 'A', 'D']);
  });

  it('al arrastrar en modo inteligente se congela el orden visible', () => {
    const ts = make();
    expect(titles(ts, 'smart')).toEqual(['A', 'C', 'B', 'D']);
    const ids = ['B', 'A', 'C', 'D'].map((n) => ts.find((t) => t.title === n)!.id);
    const next = reorderTasks(ts, ids, 'smart');
    expect(titles(next, 'manual')).toEqual(['B', 'A', 'C', 'D']);
  });
});
