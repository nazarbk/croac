import { useEffect } from 'react';
import { appStore, getCtx } from '../store/appStore';
import { ui } from '../store/uiStore';

const KEY = 'croac:reminded';

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof Notification === 'undefined') return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  return (await Notification.requestPermission()) === 'granted';
}

export function notify(title: string, body: string) {
  if (!appStore.get().settings.notifications) return;
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, icon: 'icons/icon-192.png', tag: `croac-${title}` });
  } catch {
    /* algunos navegadores móviles solo permiten notificaciones desde el service worker */
  }
}

function loadFired(today: string): Set<string> {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as { date: string; ids: string[] } | null;
    return new Set(raw?.date === today ? raw.ids : []);
  } catch {
    return new Set();
  }
}

function saveFired(today: string, ids: Set<string>) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ date: today, ids: [...ids] }));
  } catch {
    /* sin almacenamiento: puede repetirse algún aviso */
  }
}

/**
 * Recordatorios a la hora de cada tarea mientras la app está abierta.
 * Para avisos con la app cerrada hace falta Web Push con un backend (ver ROADMAP).
 */
export function useReminders() {
  useEffect(() => {
    const check = () => {
      const { today } = getCtx();
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const fired = loadFired(today);
      let changed = false;
      for (const t of appStore.get().tasks) {
        if (t.status === 'done' || t.dueDate !== today || !t.time || t.time > hhmm || fired.has(t.id)) continue;
        fired.add(t.id);
        changed = true;
        ui.toast({ message: `Es la hora: ${t.title}`, duration: 8000 });
        notify('Croac · es la hora', t.title);
      }
      if (changed) saveFired(today, fired);
    };
    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, []);
}
