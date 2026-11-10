import { useEffect } from 'react';
import { navigate } from '../lib/router';
import { ui, uiStore } from '../store/uiStore';

/** Atajos globales: N nueva tarea, / buscar, H hoy, P próximo. */
export function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement;
      if (el.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (uiStore.get().editor.open || document.querySelector('[role="dialog"]')) return;
      switch (e.key.toLowerCase()) {
        case 'n':
          e.preventDefault();
          ui.openEditor(null);
          break;
        case '/':
          e.preventDefault();
          navigate('tareas');
          setTimeout(() => document.getElementById('task-search')?.focus(), 50);
          break;
        case 'h':
          navigate('hoy');
          break;
        case 'p':
          navigate('proximo');
          break;
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
}
