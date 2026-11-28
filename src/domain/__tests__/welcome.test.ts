import { describe, expect, it } from 'vitest';
import { mergeStates } from '../../services/merge';
import { createInitialState } from '../defaults';
import type { Ctx } from '../types';
import { claimWelcome, WELCOME, welcomeClaimed, welcomeOptions } from '../welcome';

const ctx: Ctx = { today: '2026-11-28', now: Date.parse('2026-11-28T12:00:00') };
const fresh = () => {
  const s = createInitialState(0);
  return { ...s, meta: { ...s.meta, onboarded: true } };
};

describe('regalo de bienvenida', () => {
  it('un complemento: gratis, en el armario y puesto', () => {
    const s = claimWelcome(fresh(), 'neck-bowtie', ctx);
    expect(s.frog.owned).toContain('neck-bowtie');
    expect(s.frog.equipped.neck).toBe('neck-bowtie');
    expect(s.frog.coins).toBe(fresh().frog.coins);
    expect(welcomeClaimed(s)).toBe(true);
  });

  it('o las monedas', () => {
    const s = claimWelcome(fresh(), 'coins', ctx);
    expect(s.frog.coins).toBe(fresh().frog.coins + WELCOME.coins);
  });

  it('solo una vez', () => {
    const s = claimWelcome(claimWelcome(fresh(), 'coins', ctx), 'coins', ctx);
    expect(s.frog.coins).toBe(fresh().frog.coins + WELCOME.coins);
    expect(claimWelcome(s, 'hat-party', ctx).frog.owned).not.toContain('hat-party');
  });

  it('no ofrece lo que ya tienes', () => {
    const s = fresh();
    const owned = { ...s, frog: { ...s.frog, owned: [...s.frog.owned, 'hat-party'] } };
    expect(welcomeOptions(owned)).not.toContain('hat-party');
    expect(welcomeOptions(owned)).toContain('coins');
  });

  it('si se cobra en dos dispositivos a la vez, las monedas no se duplican', () => {
    const a = claimWelcome(fresh(), 'coins', ctx);
    const b = claimWelcome(fresh(), 'coins', { ...ctx, now: ctx.now + 1000 });
    const m = mergeStates(a, b, { localDirty: true });
    expect(m.frog.coins).toBe(fresh().frog.coins + WELCOME.coins);
  });
});
