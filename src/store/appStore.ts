import { logicalToday, type DateStr } from '../domain/dates';
import { createInitialState } from '../domain/defaults';
import type { AppState, Ctx } from '../domain/types';
import { createStore, useStore } from './createStore';
import { localStorageAdapter, migrate } from './persistence';

const STORAGE_KEY = 'croac:state';
export const storage = localStorageAdapter(STORAGE_KEY);

export const appStore = createStore<AppState>(migrate(storage.load()) ?? createInitialState());

/* Guardado con debounce + al cerrar la pestaña. */
let saveTimer: ReturnType<typeof setTimeout> | undefined;
const flush = () => {
  clearTimeout(saveTimer);
  storage.save(appStore.get());
};
appStore.subscribe(() => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 200);
});
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flush);
  // Sincroniza varias pestañas abiertas.
  window.addEventListener('storage', (e) => {
    if (e.key !== STORAGE_KEY || !e.newValue) return;
    try {
      const next = migrate(JSON.parse(e.newValue));
      if (next) appStore.set(next);
    } catch {
      /* ignorar datos corruptos */
    }
  });
}

export const useApp = <U,>(selector: (s: AppState) => U) => useStore(appStore, selector);

/* ---------- Reloj: "hoy" lógico, reactivo ---------- */

const computeToday = () => logicalToday(new Date(), appStore.get().settings.dayStartHour);
export const clockStore = createStore<{ today: DateStr }>({ today: computeToday() });

export function tickClock() {
  const today = computeToday();
  if (today !== clockStore.get().today) clockStore.set({ today });
}
appStore.subscribe(tickClock); // por si cambia la hora de inicio del día

export const useToday = () => useStore(clockStore, (s) => s.today);

export function getCtx(): Ctx {
  return { today: computeToday(), now: Date.now() };
}
