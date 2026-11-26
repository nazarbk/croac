import { describe, expect, it } from 'vitest';
import { createInitialState } from '../../domain/defaults';
import { buyItem, completeTask, rollover, undoCompletion } from '../../domain/engine';
import { buildTask } from '../../domain/tasks';
import type { AppState, Ctx } from '../../domain/types';
import { mergeStates, removedIds, revivedIds, sameData, withTombstones } from '../merge';

const ctx = (today: string, h = 12): Ctx => ({ today, now: Date.parse(`${today}T${String(h).padStart(2, '0')}:00:00`) });

/** Lo que hace la sincronización con cada cambio local: recordar lo borrado. */
const track = (prev: AppState, next: AppState, now: number) => withTombstones(next, removedIds(prev, next), revivedIds(next), now);

/** Estado del lunes: tres tareas diarias, 200 monedas y el día ya cerrado. */
function monday(): AppState {
  const s = createInitialState(0);
  const c = ctx('2026-11-23', 9);
  const tasks = ['Revisar el correo', 'Leer 10 minutos', 'Caminar'].map((title, i) =>
    buildTask({ title, date: '2026-11-23', recurrence: { type: 'daily', interval: 1 } }, c, i),
  );
  return { ...s, tasks, frog: { ...s.frog, coins: 200 }, meta: { ...s.meta, onboarded: true, lastRolloverDate: '2026-11-23' } };
}

/** El móvil: martes y miércoles hace todo y compra la bufanda. */
function phoneUpToWednesday(start: AppState): AppState {
  let s = start;
  for (const day of ['2026-11-24', '2026-11-25']) {
    s = rollover(s, ctx(day, 8)).state;
    for (const t of s.tasks) s = completeTask(s, t.id, ctx(day, 10)).state;
  }
  const r = buyItem(s, 'neck-s1-scarf', ctx('2026-11-25', 20));
  expect(r.ok).toBe(true);
  return r.state;
}

describe('fusión al sincronizar', () => {
  it('un dispositivo viejo ya no borra lo hecho en otro (el fallo del jueves)', () => {
    const base = monday();
    const phone = phoneUpToWednesday(base);
    // El ordenador llevaba desde el lunes sin abrirse: su copia es la del lunes.
    const merged = mergeStates(base, phone, { localDirty: true });
    expect(merged.history.filter((h) => h.type === 'complete')).toHaveLength(6);
    expect(merged.frog.xp).toBe(phone.frog.xp);
    expect(merged.frog.coins).toBe(phone.frog.coins);
    expect(merged.frog.owned).toContain('neck-s1-scarf');
    expect(merged.meta.lastRolloverDate).toBe('2026-11-25');
  });

  it('y si la nube ya estaba pisada, el dispositivo bueno la recupera al combinar', () => {
    const base = monday();
    const phone = phoneUpToWednesday(base);
    const merged = mergeStates(phone, base, { localDirty: false });
    expect(merged.history.filter((h) => h.type === 'complete')).toHaveLength(6);
    expect(merged.frog.xp).toBe(phone.frog.xp);
    expect(merged.frog.coins).toBe(phone.frog.coins);
    expect(merged.frog.owned).toContain('neck-s1-scarf');
    expect(sameData(merged, base)).toBe(false); // hay que subirlo
  });

  it('si no hay nada nuevo, el resultado es igual a la nube (no se sube nada)', () => {
    const phone = phoneUpToWednesday(monday());
    expect(sameData(mergeStates(phone, phone, { localDirty: false }), phone)).toBe(true);
  });

  it('lo hecho a la vez en dos dispositivos se suma', () => {
    const base = monday();
    const day = '2026-11-24';
    const start = rollover(base, ctx(day, 8)).state;
    const a = completeTask(start, start.tasks[0].id, ctx(day, 10)).state;
    const b = completeTask(start, start.tasks[1].id, ctx(day, 11)).state;
    const merged = mergeStates(a, b, { localDirty: true });
    const gainA = a.frog.xp - start.frog.xp;
    const gainB = b.frog.xp - start.frog.xp;
    expect(merged.frog.xp).toBe(start.frog.xp + gainA + gainB);
    expect(merged.history.filter((h) => h.type === 'complete')).toHaveLength(2);
    // Cada tarea, con la versión del dispositivo que la completó.
    expect(merged.tasks.find((t) => t.id === start.tasks[0].id)?.dueDate).toBe(a.tasks[0].dueDate);
    expect(merged.tasks.find((t) => t.id === start.tasks[1].id)?.dueDate).toBe(b.tasks[1].dueDate);
  });

  it('una tarea borrada en un dispositivo no resucita desde otro', () => {
    const base = monday();
    const now = ctx('2026-11-24').now;
    const a = track(base, { ...base, tasks: base.tasks.slice(1) }, now);
    expect(mergeStates(base, a, { localDirty: false }).tasks).toHaveLength(2);
    expect(mergeStates(a, base, { localDirty: true }).tasks).toHaveLength(2);
  });

  it('deshacer una tarea en un dispositivo no la recupera desde otro, ni su experiencia', () => {
    const base = monday();
    const day = '2026-11-24';
    const done = completeTask(rollover(base, ctx(day, 8)).state, base.tasks[0].id, ctx(day, 10)).state;
    const entry = done.history.find((h) => h.type === 'complete')!;
    const undone = track(done, undoCompletion(done, entry.id, ctx(day, 11)).state, ctx(day, 11).now);
    // El otro dispositivo sigue teniendo la tarea hecha.
    const m1 = mergeStates(done, undone, { localDirty: false });
    expect(m1.history.some((h) => h.id === entry.id)).toBe(false);
    expect(m1.frog.xp).toBe(undone.frog.xp);
    // Al revés: lo deshizo este dispositivo y la nube aún lo tenía.
    const m2 = mergeStates(undone, done, { localDirty: true });
    expect(m2.history.some((h) => h.id === entry.id)).toBe(false);
    expect(m2.frog.xp).toBe(undone.frog.xp);
  });

  it('«Deshacer» al borrar una tarea quita la marca de borrado', () => {
    const base = monday();
    const now = ctx('2026-11-24').now;
    const deleted = track(base, { ...base, tasks: base.tasks.slice(1) }, now);
    const restored = track(deleted, { ...deleted, tasks: base.tasks }, now + 1000);
    expect(Object.keys(restored.meta.removed ?? {})).toHaveLength(0);
  });

  it('si los dos dispositivos cerraron el mismo día, la penalización no se duplica', () => {
    const base = monday();
    const day = '2026-11-27'; // tres días después: hay penalización
    const a = rollover(base, ctx(day, 8)).state;
    const b = rollover(base, ctx(day, 9)).state;
    expect(a.history.some((h) => h.type === 'penalty')).toBe(true);
    const merged = mergeStates(a, b, { localDirty: true });
    expect(merged.history.filter((h) => h.type === 'penalty')).toHaveLength(1);
    expect(merged.frog.xp).toBe(b.frog.xp);
  });

  it('los ajustes y la rana puesta son los del dispositivo con cambios sin subir', () => {
    const base = monday();
    const local = { ...base, settings: { ...base.settings, theme: 'dark' as const }, frog: { ...base.frog, name: 'Poly' } };
    const merged = mergeStates(local, base, { localDirty: true });
    expect(merged.settings.theme).toBe('dark');
    expect(merged.frog.name).toBe('Poly');
    expect(mergeStates(local, base, { localDirty: false }).frog.name).toBe(base.frog.name);
  });
});
