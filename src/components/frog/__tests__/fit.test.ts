import { describe, expect, it } from 'vitest';
import { CATALOG } from '../../../domain/shop';
import { SEASONS } from '../../../domain/seasons';
import type { StageId } from '../../../domain/progression';
import { ITEM_ART, STAGE_ART, type ItemArt } from '../art';
import type { FitConfig } from '../fit-schema';
import { normalizeFit, stringifyFit, validateFit } from '../fit-schema.js';
import { EMPTY_FIT, layoutFrog, layoutItem, PROJECT_FIT } from '../layout';

const STAGES = Object.keys(STAGE_ART) as StageId[];

/** Cómo se colocaban los complementos antes de los ajustes (versión 1.1.0). */
function legacyRect(id: string, stage: StageId) {
  const item = ITEM_ART[id];
  const s = STAGE_ART[stage];
  const slot = id.split('-')[0] as 'hat' | 'neck' | 'eyes';
  let [x, y, ref] = s[slot];
  if (item.center !== undefined) { x = s.eyes[0]; y = s.eyes[1] + s.eyes[2] * item.center; }
  const w = ref * item.w; const h = w * item.ratio;
  x += (item.dx ?? 0) * s.eyes[2];
  return { x: x - w * item.ax, y: y - h * item.ay, w, h };
}

const fit = (items: FitConfig['items']): FitConfig => ({ version: 1, items });

describe('validateFit', () => {
  it('acepta la configuración vacía y la del proyecto', () => {
    expect(validateFit({ version: 1, items: {} }).ok).toBe(true);
    expect(validateFit(PROJECT_FIT).ok).toBe(true);
  });

  it('acepta un ajuste completo', () => {
    const r = validateFit({
      version: 1,
      items: {
        'eyes-round': { base: { scale: 1.1 }, stages: { adult: { x: 1, y: -2, rotate: 5, pivot: [0.5, 0.5], z: 40, layer: 'front', overlay: 'none', spread: 3 } }, split: [0.45, 0.55] },
        'hat-new-thing': { stages: { tadpole: { y: 4 } } },
      },
    }, { knownIds: ['eyes-round'] });
    expect(r.ok).toBe(true);
    expect(r.warnings).toHaveLength(1); // hat-new-thing no está en el catálogo: aviso, no error
  });

  const bad: [string, unknown][] = [
    ['no es objeto', [1, 2]],
    ['versión', { version: 2, items: {} }],
    ['sin items', { version: 1 }],
    ['campo raíz desconocido', { version: 1, items: {}, extra: 1 }],
    ['id no válido', { version: 1, items: { 'Gorro raro': {} } }],
    ['etapa desconocida', { version: 1, items: { 'hat-cap': { stages: { baby: { x: 1 } } } } }],
    ['campo de ajuste desconocido', { version: 1, items: { 'hat-cap': { base: { size: 2 } } } }],
    ['número como texto', { version: 1, items: { 'hat-cap': { base: { x: '3' } } } }],
    ['fuera de rango', { version: 1, items: { 'hat-cap': { base: { scale: 40 } } } }],
    ['NaN', { version: 1, items: { 'hat-cap': { base: { y: Number.NaN } } } }],
    ['pivote mal', { version: 1, items: { 'hat-cap': { base: { pivot: [0.5] } } } }],
    ['capa desconocida', { version: 1, items: { 'hat-cap': { base: { layer: 'middle' } } } }],
    ['z decimal', { version: 1, items: { 'hat-cap': { base: { z: 1.5 } } } }],
    ['split en un sombrero', { version: 1, items: { 'hat-cap': { split: [0.4, 0.6] } } }],
    ['split al revés', { version: 1, items: { 'eyes-round': { split: [0.6, 0.4] } } }],
  ];
  for (const [name, input] of bad) {
    it(`rechaza: ${name}`, () => {
      const r = validateFit(input);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.errors.length).toBeGreaterThan(0);
    });
  }

  it('normaliza: quita valores neutros, redondea y ordena', () => {
    const n = normalizeFit(fit({
      'neck-tie': { base: { x: 0, scale: 1, overlay: 'auto' }, stages: { adult: { y: 1.23456 } } },
      'hat-cap': { stages: { tadpole: {} } },
    }));
    expect(n).toEqual({ version: 1, items: { 'neck-tie': { stages: { adult: { y: 1.235 } } } } });
    expect(validateFit(JSON.parse(stringifyFit(n))).ok).toBe(true);
  });
});

describe('layoutItem', () => {
  it('sin ajustes coloca todo exactamente como antes', () => {
    for (const id of Object.keys(ITEM_ART)) {
      for (const st of STAGES) {
        const l = layoutItem(id, st, 'neutral', EMPTY_FIT)!;
        const old = legacyRect(id, st);
        for (const k of ['x', 'y', 'w', 'h'] as const) {
          expect(l.img[k]).toBeCloseTo(old[k], 6);
          expect(l.visible[k]).toBeCloseTo(old[k], 6);
        }
        expect(l.rotate).toBe(0);
        expect(l.layer).toBe('front');
      }
    }
  });

  it('los ánimos de las etapas 1-4 no mueven nada', () => {
    for (const st of ['tadpole', 'froglet', 'young', 'adult'] as StageId[]) {
      for (const mood of ['happy', 'sad', 'worried', 'sleeping'] as const) {
        expect(layoutItem('hat-cap', st, mood, EMPTY_FIT)!.img).toEqual(layoutItem('hat-cap', st, 'neutral', EMPTY_FIT)!.img);
      }
    }
  });

  it('la rana sabia triste (dibujada más grande) agranda los complementos con ella', () => {
    const n = layoutItem('hat-cap', 'sage', 'neutral', EMPTY_FIT)!;
    const s = layoutItem('hat-cap', 'sage', 'sad', EMPTY_FIT)!;
    expect(s.visible.w / n.visible.w).toBeCloseTo(1.0517, 3);
    expect(s.support[1]).toBeLessThan(n.support[1]); // la cabeza queda más arriba
  });

  it('ignora complementos desconocidos', () => {
    expect(layoutItem('hat-nope', 'adult')).toBeNull();
    expect(layoutItem('skin-blue', 'adult')).toBeNull();
    expect(layoutFrog('adult', 'happy', ['hat-nope', undefined, 'neck-tie']).front.map((l) => l.id)).toEqual(['neck-tie']);
  });

  it('escala alrededor del punto de apoyo y desplaza en unidades del viewBox', () => {
    const base = layoutItem('neck-medal', 'adult', 'neutral', EMPTY_FIT)!;
    const l = layoutItem('neck-medal', 'adult', 'neutral', fit({ 'neck-medal': { stages: { adult: { scale: 1.5, x: 2, y: -3 } } } }))!;
    expect(l.visible.w).toBeCloseTo(base.visible.w * 1.5, 6);
    expect(l.support[0]).toBeCloseTo(base.support[0] + 2, 6);
    expect(l.support[1]).toBeCloseTo(base.support[1] - 3, 6);
    // El punto de apoyo sigue en la misma proporción del dibujo.
    expect((l.support[1] - l.visible.y) / l.visible.h).toBeCloseTo(ITEM_ART['neck-medal'].ay, 6);
    // Otras etapas no cambian.
    expect(layoutItem('neck-medal', 'young', 'neutral', fit({ 'neck-medal': { stages: { adult: { scale: 1.5 } } } }))!.img)
      .toEqual(layoutItem('neck-medal', 'young', 'neutral', EMPTY_FIT)!.img);
  });

  it('los campos de la etapa sustituyen a los de base', () => {
    const f = fit({ 'hat-cap': { base: { scale: 2, y: 5 }, stages: { tadpole: { scale: 1.2 } } } });
    const t = layoutItem('hat-cap', 'tadpole', 'neutral', f)!;
    const t0 = layoutItem('hat-cap', 'tadpole', 'neutral', EMPTY_FIT)!;
    expect(t.visible.w / t0.visible.w).toBeCloseTo(1.2, 6);
    expect(t.support[1] - t0.support[1]).toBeCloseTo(5, 6);
    const a = layoutItem('hat-cap', 'adult', 'neutral', f)!;
    expect(a.visible.w / layoutItem('hat-cap', 'adult', 'neutral', EMPTY_FIT)!.visible.w).toBeCloseTo(2, 6);
  });

  it('gira alrededor del apoyo por defecto o del pivote indicado', () => {
    const l = layoutItem('hat-beret', 'adult', 'neutral', fit({ 'hat-beret': { base: { rotate: -12 } } }))!;
    expect(l.rotate).toBe(-12);
    expect(l.pivot).toEqual(l.support);
    const p = layoutItem('hat-beret', 'adult', 'neutral', fit({ 'hat-beret': { base: { rotate: 8, pivot: [0, 1] } } }))!;
    expect(p.pivot).toEqual([p.visible.x, p.visible.y + p.visible.h]);
  });

  it('usa los límites visibles: los márgenes transparentes no cambian tamaño ni posición', () => {
    const plain: ItemArt = { ratio: 0.5, w: 0.6, ax: 0.5, ay: 0.9 };
    // Mismo dibujo con un 20 % de margen a cada lado y un 50 % por arriba.
    const padded: ItemArt = { ...plain, bounds: [0.2, 0.5, 0.8, 1] };
    const a = layoutItem('hat-test', 'young', 'neutral', EMPTY_FIT, { 'hat-test': plain })!;
    const b = layoutItem('hat-test', 'young', 'neutral', EMPTY_FIT, { 'hat-test': padded })!;
    expect(b.visible).toEqual(a.visible);
    expect(b.img.w).toBeCloseTo(a.visible.w / 0.6, 6);
    expect(b.img.h).toBeCloseTo(a.visible.h / 0.5, 6);
    expect(b.img.x + b.img.w * 0.2).toBeCloseTo(a.visible.x, 6);
    expect(b.img.y + b.img.h * 0.5).toBeCloseTo(a.visible.y, 6);
  });

  it('gafas partidas: solo con split y spread', () => {
    const f = fit({ 'eyes-round': { split: [0.45, 0.55], stages: { adult: { spread: 4 } } } });
    const l = layoutItem('eyes-round', 'adult', 'neutral', f)!;
    expect(l.split?.spread).toBe(4);
    expect(l.split!.l).toBeCloseTo(l.visible.x + l.visible.w * 0.45, 6);
    expect(layoutItem('eyes-round', 'young', 'neutral', f)!.split).toBeUndefined();
  });
});

describe('layoutFrog', () => {
  it('orden por defecto: cuello, sombrero, gafas; overlay de ojos para sombreros', () => {
    const l = layoutFrog('adult', 'happy', ['eyes-sun', 'hat-cap', 'neck-tie'], EMPTY_FIT);
    expect(l.front.map((i) => i.id)).toEqual(['neck-tie', 'hat-cap', 'eyes-sun']);
    expect(l.front.map((i) => i.overlay)).toEqual(['none', 'eyes', 'none']);
    expect(layoutFrog('adult', 'happy', ['hat-astronaut'], EMPTY_FIT).front[0].overlay).toBe('none');
  });

  it('z y capa trasera configurables', () => {
    const f = fit({ 'neck-scarf': { base: { z: 50 } }, 'hat-wizard': { base: { layer: 'back' } } });
    const l = layoutFrog('young', 'neutral', ['neck-scarf', 'hat-wizard', 'eyes-round'], f);
    expect(l.back.map((i) => i.id)).toEqual(['hat-wizard']);
    expect(l.front.map((i) => i.id)).toEqual(['eyes-round', 'neck-scarf']);
  });
});

describe('accessory-fit.json del proyecto', () => {
  const ids = new Set([...CATALOG, ...SEASONS.flatMap((s) => s.items)].map((i) => i.id));
  it('solo ajusta complementos que existen y tienen dibujo', () => {
    for (const id of Object.keys(PROJECT_FIT.items)) {
      expect(ids.has(id) ? id : `no existe ${id}`).toBe(id);
      expect(ITEM_ART[id] ? id : `sin dibujo ${id}`).toBe(id);
    }
  });
  it('está normalizado (lo que escribe fit:apply)', () => {
    expect(normalizeFit(PROJECT_FIT)).toEqual(PROJECT_FIT);
  });
});
