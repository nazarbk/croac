import type { DateStr } from '../domain/dates';
import type { GameEvent } from '../domain/types';
import { uid } from '../domain/id';
import { createStore, useStore } from './createStore';
import type { IconName } from '../components/ui/Icon';

export interface Toast {
  id: string;
  message: string;
  tone?: 'default' | 'reward' | 'warning' | 'danger';
  xp?: number;
  coins?: number;
  action?: { label: string; run: () => void; icon?: IconName };
  duration?: number;
}

export type Celebration =
  | { kind: 'level'; level: number; evolvedTo?: string }
  | { kind: 'perfect' };

export interface EditorState {
  open: boolean;
  taskId: string | null;
  defaults?: { date?: DateStr | null; listId?: string };
}

interface UiState {
  toasts: Toast[];
  celebrations: Celebration[];
  editor: EditorState;
  notificationsOpen: boolean;
  /** Se incrementa en cada tarea completada para animar a la rana. */
  hop: number;
  /** Tareas con las subtareas plegadas (preferencia de vista, se guarda en el navegador). */
  collapsed: string[];
  quickAddOpen: boolean;
}

const COLLAPSED_KEY = 'croac:collapsed';
function loadCollapsed(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(COLLAPSED_KEY) ?? '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export const uiStore = createStore<UiState>({
  toasts: [],
  celebrations: [],
  editor: { open: false, taskId: null },
  notificationsOpen: false,
  hop: 0,
  collapsed: loadCollapsed(),
  quickAddOpen: false,
});

export const useUi = <U,>(selector: (s: UiState) => U) => useStore(uiStore, selector);

export const ui = {
  toast(t: Omit<Toast, 'id'>) {
    const toast = { ...t, id: uid('toast') };
    uiStore.set((s) => ({ ...s, toasts: [...s.toasts.slice(-2), toast] }));
    return toast.id;
  },
  dismissToast(id: string) {
    uiStore.set((s) => ({ ...s, toasts: s.toasts.filter((t) => t.id !== id) }));
  },
  celebrate(c: Celebration) {
    uiStore.set((s) => ({ ...s, celebrations: [...s.celebrations, c] }));
  },
  closeCelebration() {
    uiStore.set((s) => ({ ...s, celebrations: s.celebrations.slice(1) }));
  },
  openEditor(taskId: string | null = null, defaults?: EditorState['defaults']) {
    uiStore.set((s) => ({ ...s, editor: { open: true, taskId, defaults } }));
  },
  closeEditor() {
    uiStore.set((s) => ({ ...s, editor: { open: false, taskId: null } }));
  },
  setNotificationsOpen(open: boolean) {
    uiStore.set((s) => ({ ...s, notificationsOpen: open }));
  },
  hop() {
    uiStore.set((s) => ({ ...s, hop: s.hop + 1 }));
  },
  toggleCollapsed(taskId: string) {
    uiStore.set((s) => {
      const collapsed = s.collapsed.includes(taskId) ? s.collapsed.filter((x) => x !== taskId) : [...s.collapsed, taskId].slice(-300);
      try {
        localStorage.setItem(COLLAPSED_KEY, JSON.stringify(collapsed));
      } catch {
        /* preferencia no persistente */
      }
      return { ...s, collapsed };
    });
  },
  setQuickAdd(open: boolean) {
    uiStore.set((s) => ({ ...s, quickAddOpen: open }));
  },
};

/* ---------- Bus de eventos del juego ---------- */

type Listener = (events: GameEvent[]) => void;
const gameListeners = new Set<Listener>();

export function emitGameEvents(events: GameEvent[]) {
  if (events.length) gameListeners.forEach((l) => l(events));
}

export function onGameEvents(l: Listener) {
  gameListeners.add(l);
  return () => gameListeners.delete(l);
}
