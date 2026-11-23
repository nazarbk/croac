import { describe, expect, it } from 'vitest';
import { createInitialState } from '../defaults';
import { buyItem, completeTask, toggleEquip, undoCompletion } from '../engine';
import { buyCanvas, canvasesLeft, claimPatioPrize, PATIO, patioItemId, patioShopItem, spendCanvas } from '../patio';
import { itemById, setCommunityItems } from '../shop';
import { buildTask } from '../tasks';
import type { Ctx } from '../types';

const ctx = (today = '2026-11-23'): Ctx => ({ today, now: Date.parse(`${today}T12:00:00`) });
const rich = (coins: number) => {
  const s = createInitialState(0);
  return { ...s, frog: { ...s.frog, coins } };
};

describe('patio', () => {
  it('el lienzo cuesta lo previsto y se gasta al publicar', () => {
    expect(buyCanvas(rich(PATIO.canvasPrice - 1), ctx()).ok).toBe(false);
    const r = buyCanvas(rich(PATIO.canvasPrice + 10), ctx());
    expect(r.ok).toBe(true);
    expect(r.state.frog.coins).toBe(10);
    expect(canvasesLeft(r.state)).toBe(1);
    expect(r.state.history.at(-1)?.ref).toBe('patio-canvas');
    const used = spendCanvas(r.state);
    expect(canvasesLeft(used)).toBe(0);
    expect(canvasesLeft(spendCanvas(used))).toBe(0); // nunca negativo
  });

  it('un lienzo es más o menos una semana de tareas (no se rompe la economía)', () => {
    expect(PATIO.canvasPrice).toBeGreaterThan(100);
    expect(PATIO.canvasPrice).toBeLessThan(200);
    expect(PATIO.winPrize).toBeGreaterThan(PATIO.canvasPrice);
  });

  it('el premio del ganador se cobra una sola vez y le da su complemento', () => {
    const win = { id: 7, slot: 'hat' as const, name: 'Gorro pirata' };
    const a = claimPatioPrize(rich(0), win, ctx());
    expect(a.claimed).toBe(true);
    expect(a.state.frog.coins).toBe(PATIO.winPrize);
    expect(a.state.frog.owned).toContain('hat-patio-7');
    const b = claimPatioPrize(a.state, win, ctx('2026-11-24'));
    expect(b.claimed).toBe(false);
    expect(b.state.frog.coins).toBe(PATIO.winPrize);
  });

  it('los ganadores se compran gratis y se ponen como cualquier complemento', () => {
    const item = patioShopItem({ id: 12, slot: 'eyes', name: 'Gafas raras', author: 'ana', week_start: '2026-11-16' });
    expect(item.id).toBe(patioItemId('eyes', 12));
    expect(item.price).toBe(0);
    setCommunityItems([item]);
    try {
      expect(itemById('eyes-patio-12')?.name).toBe('Gafas raras');
      const r = buyItem(rich(0), 'eyes-patio-12', ctx());
      expect(r.ok).toBe(true);
      expect(r.state.frog.equipped.eyes).toBe('eyes-patio-12');
      expect(toggleEquip(r.state, 'eyes-patio-12').frog.equipped.eyes).toBeUndefined();
    } finally {
      setCommunityItems([]);
    }
  });

  it('deshacer un día perfecto no se lleva el premio del patio', () => {
    let s = rich(0);
    s = { ...s, tasks: [buildTask({ title: 'Leer', date: '2026-11-23' }, ctx(), 0)], meta: { ...s.meta, lastRolloverDate: '2026-11-23', onboarded: true } };
    s = claimPatioPrize(s, { id: 3, slot: 'neck', name: 'Collar' }, ctx()).state;
    const done = completeTask(s, s.tasks[0].id, ctx());
    expect(done.state.history.some((h) => h.title === 'Día perfecto')).toBe(true);
    const complete = done.state.history.find((h) => h.type === 'complete')!;
    const undone = undoCompletion(done.state, complete.id, ctx());
    expect(undone.state.history.some((h) => h.ref === 'patio-win:3')).toBe(true);
    expect(undone.state.history.some((h) => h.title === 'Día perfecto')).toBe(false);
    expect(undone.state.frog.coins).toBe(PATIO.winPrize);
  });
});
