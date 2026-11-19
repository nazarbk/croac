import { describe, expect, it } from 'vitest';
import { isNewer } from '../../content/changelog';
import { daysLeft, inSeason, type Season } from '../seasons';
import { canBuy } from '../shop';

const season: Season = {
  id: 'test', number: 9, name: 'Prueba', tagline: '', start: '2026-11-19', end: '2026-11-25', colors: ['#000', '#fff'], items: [],
};

describe('temporadas', () => {
  it('los artículos normales siempre están disponibles', () => {
    expect(inSeason({}, '2030-01-01')).toBe(true);
  });

  it('un artículo de una temporada desconocida no se puede comprar', () => {
    expect(inSeason({ season: 'no-existe' }, '2026-11-20')).toBe(false);
  });

  it('cuenta los días que quedan incluyendo hoy', () => {
    expect(daysLeft(season, '2026-11-19')).toBe(7);
    expect(daysLeft(season, '2026-11-25')).toBe(1);
  });

  it('canBuy rechaza artículos fuera de temporada', () => {
    const item = { id: 'x', slot: 'hat' as const, name: 'X', price: 10, minLevel: 1, description: '', season: 'no-existe' };
    const r = canBuy(item, { coins: 100, level: 1, owned: [], isPro: false, today: '2026-11-20' });
    expect(r).toEqual({ ok: false, reason: 'season' });
  });
});

describe('versiones del tablón de novedades', () => {
  it('compara versiones por números, no por texto', () => {
    expect(isNewer('1.10.0', '1.9.0')).toBe(true);
    expect(isNewer('1.1.0', '1.1.0')).toBe(false);
    expect(isNewer('1.0.0', '1.1.0')).toBe(false);
  });
});

describe('catálogo', () => {
  it('no hay ids repetidos y cada complemento tiene su encaje', async () => {
    const { CATALOG } = await import('../shop');
    const { ITEM_ART } = await import('../../components/frog/art');
    const ids = CATALOG.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const i of CATALOG) {
      if (i.slot === 'hat' || i.slot === 'neck' || i.slot === 'eyes') expect(ITEM_ART[i.id] ? i.id : `falta ${i.id}`).toBe(i.id);
    }
  });

  it('una semana de tareas da para los 3 artículos más baratos de cada temporada', async () => {
    const { SEASONS } = await import('../seasons');
    for (const s of SEASONS) {
      const cheapest = s.items.map((i) => i.price).sort((a, b) => a - b).slice(0, 3);
      expect(cheapest.reduce((a, b) => a + b, 0) <= 200).toBe(true);
    }
  });
});
