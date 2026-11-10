import { DEFAULT_EQUIPPED, DEFAULT_OWNED } from './shop';
import { INBOX_ID, type TaskInput } from './tasks';
import type { AppState, Settings, TaskList } from './types';

export const STATE_VERSION = 1;

export const LIST_COLORS = ['#3f9d5a', '#2f80c9', '#e0803a', '#c2477a', '#7a5bd1', '#c9a227', '#2aa5a0', '#d2564b'];

export const DEFAULT_LISTS: TaskList[] = [
  { id: INBOX_ID, name: 'Bandeja de entrada', emoji: '📥', color: '#6b7f78', order: 0, system: true },
  { id: 'personal', name: 'Personal', emoji: '🌱', color: '#3f9d5a', order: 1 },
  { id: 'trabajo', name: 'Trabajo', emoji: '💼', color: '#2f80c9', order: 2 },
];

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  graceDays: 1,
  penaltiesEnabled: true,
  vacationMode: false,
  dayStartHour: 0,
  weekStartsOn: 1,
  notifications: false,
  sounds: true,
  taskSort: 'manual',
};

export function createInitialState(now = Date.now()): AppState {
  return {
    version: STATE_VERSION,
    tasks: [],
    lists: DEFAULT_LISTS,
    history: [],
    frog: {
      name: 'Rani',
      xp: 0,
      coins: 20,
      owned: [...DEFAULT_OWNED],
      equipped: { ...DEFAULT_EQUIPPED },
      bestLevel: 1,
    },
    settings: DEFAULT_SETTINGS,
    meta: { lastRolloverDate: null, perfectDays: [], onboarded: false, createdAt: now, plan: 'free' },
    notifications: [],
  };
}

/** Tareas sugeridas en la bienvenida. */
export const STARTER_TASKS: { id: string; label: string; input: TaskInput }[] = [
  { id: 'read', label: 'Leer 20 minutos cada día', input: { title: 'Leer 20 minutos', listId: 'personal', difficulty: 'easy', recurrence: { type: 'daily', interval: 1 } } },
  { id: 'water', label: 'Beber 2 litros de agua', input: { title: 'Beber 2 litros de agua', listId: 'personal', difficulty: 'trivial', recurrence: { type: 'daily', interval: 1 } } },
  { id: 'gym', label: 'Hacer ejercicio lunes, miércoles y viernes', input: { title: 'Hacer ejercicio', listId: 'personal', difficulty: 'hard', recurrence: { type: 'weekly', interval: 1, days: [1, 3, 5] } } },
  { id: 'mail', label: 'Revisar el correo los días laborables', input: { title: 'Revisar el correo', listId: 'trabajo', difficulty: 'easy', recurrence: { type: 'weekly', interval: 1, days: [1, 2, 3, 4, 5] } } },
  { id: 'clean', label: 'Limpiar la casa los sábados', input: { title: 'Limpiar la casa', listId: 'personal', difficulty: 'medium', recurrence: { type: 'weekly', interval: 1, days: [6] } } },
  { id: 'plan', label: 'Planificar la semana los domingos', input: { title: 'Planificar la semana', listId: 'personal', difficulty: 'easy', priority: 2, recurrence: { type: 'weekly', interval: 1, days: [0] } } },
];
