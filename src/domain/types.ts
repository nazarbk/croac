import type { DateStr } from './dates';
import type { Recurrence } from './recurrence';

/** 1 = urgente … 4 = sin prioridad (mismo criterio que Todoist). */
export type Priority = 1 | 2 | 3 | 4;
export type Difficulty = 'trivial' | 'easy' | 'medium' | 'hard';
export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  notes: string;
  listId: string;
  tags: string[];
  priority: Priority;
  difficulty: Difficulty;
  /** Estado de la ocurrencia actual. Las recurrentes vuelven a 'todo' al completarse. */
  status: TaskStatus;
  recurrence: Recurrence;
  /** Fecha de inicio de la serie (solo recurrentes). */
  anchorDate: DateStr | null;
  /** Fecha de la ocurrencia pendiente. null = "algún día" (sin fecha, sin penalización). */
  dueDate: DateStr | null;
  /** Hora opcional "HH:mm" para el recordatorio. */
  time: string | null;
  subtasks: Subtask[];
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
  /** Posición en el orden personalizado (menor = antes). */
  order: number;
}

export interface TaskList {
  id: string;
  name: string;
  emoji: string;
  color: string;
  order: number;
  /** La bandeja de entrada no se puede borrar. */
  system?: boolean;
}

export type Slot = 'hat' | 'neck' | 'eyes' | 'background' | 'skin';

export interface FrogState {
  name: string;
  xp: number;
  coins: number;
  owned: string[];
  equipped: Partial<Record<Slot, string>>;
  bestLevel: number;
}

export interface Settings {
  theme: 'system' | 'light' | 'dark';
  /** Días que una tarea puede ir atrasada sin penalización. */
  graceDays: number;
  penaltiesEnabled: boolean;
  /** Congela penalizaciones (vacaciones, enfermedad…). */
  vacationMode: boolean;
  /** Hora a la que empieza el "día" (0–6). */
  dayStartHour: number;
  weekStartsOn: 0 | 1;
  notifications: boolean;
  sounds: boolean;
  /** 'manual': el orden que eliges arrastrando. 'smart': en proceso, prioridad y hora. */
  taskSort: TaskSort;
}

export type TaskSort = 'manual' | 'smart';

export type Plan = 'free' | 'pro';

export interface Meta {
  /** Último día para el que se procesó el cierre diario. */
  lastRolloverDate: DateStr | null;
  perfectDays: DateStr[];
  onboarded: boolean;
  createdAt: number;
  plan: Plan;
}

export type HistoryType = 'complete' | 'penalty' | 'bonus' | 'purchase';

export interface PenaltyDetail {
  taskId: string;
  title: string;
  days: number;
  xp: number;
}

export interface HistoryEntry {
  id: string;
  type: HistoryType;
  /** Día lógico en el que ocurrió. */
  date: DateStr;
  at: number;
  /** Positivo = ganado, negativo = perdido. */
  xp: number;
  coins: number;
  title: string;
  taskId?: string;
  listId?: string;
  /** Para deshacer una compleción. */
  prev?: { dueDate: DateStr | null; status: TaskStatus; subtasks: Subtask[]; completedAt: number | null };
  details?: PenaltyDetail[];
}

export interface AppNotification {
  id: string;
  kind: 'warning' | 'penalty' | 'level' | 'reward' | 'info';
  title: string;
  body: string;
  at: number;
  read: boolean;
}

export interface AppState {
  version: number;
  tasks: Task[];
  lists: TaskList[];
  history: HistoryEntry[];
  frog: FrogState;
  settings: Settings;
  meta: Meta;
  notifications: AppNotification[];
}

/** Contexto temporal que se inyecta en la lógica (facilita los tests). */
export interface Ctx {
  today: DateStr;
  now: number;
}

export type GameEvent =
  | { type: 'reward'; taskId: string; title: string; xp: number; coins: number; entryId: string; streak: number }
  | { type: 'levelUp'; level: number }
  | { type: 'levelDown'; level: number }
  | { type: 'evolve'; stage: string }
  | { type: 'devolve'; stage: string }
  | { type: 'perfectDay'; xp: number; coins: number }
  | { type: 'penalty'; xp: number; details: PenaltyDetail[] }
  | { type: 'warning'; titles: string[] };

export interface EngineResult {
  state: AppState;
  events: GameEvent[];
}
