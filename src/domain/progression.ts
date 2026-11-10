import type { Difficulty, Priority, Task } from './types';

/* ---------- Recompensas ---------- */

export const DIFFICULTIES: Record<Difficulty, { label: string; xp: number; coins: number; hint: string }> = {
  trivial: { label: 'Trivial', xp: 5, coins: 1, hint: 'Menos de 5 minutos' },
  easy: { label: 'Fácil', xp: 10, coins: 3, hint: 'Un rato corto' },
  medium: { label: 'Media', xp: 20, coins: 6, hint: 'Requiere algo de esfuerzo' },
  hard: { label: 'Difícil', xp: 35, coins: 10, hint: 'Una tarea grande' },
};

export const PRIORITIES: Record<Priority, { label: string; short: string; penaltyFactor: number }> = {
  1: { label: 'Urgente', short: 'P1', penaltyFactor: 1.5 },
  2: { label: 'Alta', short: 'P2', penaltyFactor: 1.25 },
  3: { label: 'Media', short: 'P3', penaltyFactor: 1 },
  4: { label: 'Sin prioridad', short: 'P4', penaltyFactor: 0.75 },
};

export const STREAK_BONUS_PER_STEP = 0.05; // +5 % por ocurrencia consecutiva
export const STREAK_BONUS_MAX_STEPS = 10; // hasta +50 %
export const LATE_FACTOR = 0.75; // completar tarde da el 75 %
export const PERFECT_DAY_BONUS = { xp: 25, coins: 10 };
export const PENALTY_FACTOR = 0.5; // la penalización diaria es la mitad de la recompensa base
export const IN_PROGRESS_PENALTY_FACTOR = 0.5; // si está "en proceso" se penaliza la mitad
export const MAX_PENALTY_CATCHUP_DAYS = 7; // al volver tras una ausencia, como mucho 7 días

export function rewardFor(task: Pick<Task, 'difficulty'>, opts: { streak: number; late: boolean }) {
  const base = DIFFICULTIES[task.difficulty];
  const steps = Math.min(Math.max(opts.streak - 1, 0), STREAK_BONUS_MAX_STEPS);
  const mult = (1 + steps * STREAK_BONUS_PER_STEP) * (opts.late ? LATE_FACTOR : 1);
  return {
    xp: Math.max(1, Math.round(base.xp * mult)),
    coins: Math.max(1, Math.round(base.coins * mult)),
  };
}

/** XP que se pierde por cada día que una tarea pasa del margen. */
export function dailyPenaltyFor(task: Pick<Task, 'difficulty' | 'priority' | 'status'>): number {
  const base = DIFFICULTIES[task.difficulty].xp * PENALTY_FACTOR * PRIORITIES[task.priority].penaltyFactor;
  const factor = task.status === 'in_progress' ? IN_PROGRESS_PENALTY_FACTOR : 1;
  return Math.max(1, Math.round(base * factor));
}

/* ---------- Niveles ---------- */

/** XP necesaria para pasar de `level` a `level + 1`. */
export const xpToNext = (level: number) => 50 + (level - 1) * 25;

/** XP total acumulada necesaria para alcanzar `level`. */
export function totalXpForLevel(level: number): number {
  const n = level - 1;
  return 50 * n + (25 * n * (n - 1)) / 2;
}

export function levelInfo(xp: number) {
  let level = 1;
  while (totalXpForLevel(level + 1) <= xp) level++;
  const floor = totalXpForLevel(level);
  const needed = xpToNext(level);
  const into = xp - floor;
  return { level, into, needed, progress: into / needed, toNext: needed - into };
}

/* ---------- Evolución de la rana ---------- */

export type StageId = 'tadpole' | 'froglet' | 'young' | 'adult' | 'sage';

export interface Stage {
  id: StageId;
  name: string;
  minLevel: number;
  description: string;
}

export const STAGES: Stage[] = [
  { id: 'tadpole', name: 'Renacuajo', minLevel: 1, description: 'Acaba de salir del huevo. Cada tarea cuenta.' },
  { id: 'froglet', name: 'Renacuajo con patas', minLevel: 5, description: 'Le han salido patitas. Ya casi sale del agua.' },
  { id: 'young', name: 'Ranita', minLevel: 10, description: 'Pequeña, curiosa y con ganas de saltar.' },
  { id: 'adult', name: 'Rana', minLevel: 20, description: 'Adulta y constante. Domina la charca.' },
  { id: 'sage', name: 'Rana sabia', minLevel: 35, description: 'Años de hábitos la han vuelto legendaria.' },
];

export function stageForLevel(level: number): Stage {
  let s = STAGES[0];
  for (const st of STAGES) if (level >= st.minLevel) s = st;
  return s;
}

export function nextStage(level: number): Stage | null {
  return STAGES.find((s) => s.minLevel > level) ?? null;
}
