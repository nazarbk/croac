/**
 * Acciones con feedback de UI (toasts con deshacer, sonido, salto de la rana).
 * Los componentes llaman a estas funciones en lugar de a `actions` directamente
 * cuando quieren la experiencia completa.
 */
import { actions } from '../store/actions';
import { appStore } from '../store/appStore';
import { ui } from '../store/uiStore';

export function deleteWithUndo(id: string) {
  const task = actions.deleteTask(id);
  if (!task) return;
  ui.toast({ message: 'Tarea eliminada', action: { label: 'Deshacer', run: () => actions.restoreTask(task) } });
}

export function completeWithFeedback(id: string) {
  actions.completeTask(id);
}

export function postponeToTomorrow(id: string, tomorrow: string) {
  const prev = appStore.get().tasks.find((t) => t.id === id)?.dueDate ?? null;
  actions.reschedule(id, tomorrow);
  ui.toast({ message: 'Movida a mañana', action: { label: 'Deshacer', run: () => actions.reschedule(id, prev) } });
}
