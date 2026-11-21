import type { Mood } from '../../domain/engine';
import type { StageId } from '../../domain/progression';
import bundledFit from './accessory-fit.json';
import { ITEM_ART, MOOD_FRAME, STAGE_ART, type ItemArt, type Rect } from './art';
import type { FitAdjust, FitConfig, FitLayer } from './fit-schema';
import { validateFit } from './fit-schema.js';

/**
 * Dónde y cómo se dibuja cada complemento sobre la rana. Funciones puras, sin React ni
 * imágenes: solo aritmética sobre los anclajes de art.ts y los ajustes de
 * accessory-fit.json. Las usan el componente Frog (tienda, perfil, charca…) y el probador,
 * así que todos ven exactamente lo mismo.
 *
 * Orden de cálculo de un complemento:
 *   1. Ancla de la etapa (sombrero, ojos o cuello) y tamaño por defecto (ItemArt).
 *   2. Ajuste del complemento para esa etapa: escala alrededor del punto de apoyo y
 *      desplazamiento x/y.
 *   3. Encuadre del ánimo (solo la rana sabia cambia algo de tamaño según el ánimo).
 *   4. Rectángulo visible → rectángulo del archivo (por si el PNG trae márgenes).
 *   5. Giro alrededor del pivote.
 */

export type AccSlot = 'hat' | 'neck' | 'eyes';
export const ACC_SLOTS: AccSlot[] = ['neck', 'hat', 'eyes'];
/** Orden de dibujo por defecto: las gafas siempre por delante, también del sombrero. */
export const DEFAULT_Z: Record<AccSlot, number> = { neck: 10, hat: 20, eyes: 30 };

/** Radio del ojo respecto a la separación entre ojos (ojos pintados encima del sombrero). */
export const EYE_BUMP = 0.43;
/** Unidades bajo el ancla del cuello que tapa la cabeza al «meter» un complemento. */
export const TUCK = 2.5;

export const EMPTY_FIT: FitConfig = { version: 1, items: {} };

function loadProjectFit(): FitConfig {
  const r = validateFit(bundledFit);
  if (r.ok) return r.value;
  // Nunca rompe la rana: si el JSON está mal, se ignora y se usan los anclajes de siempre.
  console.warn('[croac] accessory-fit.json no es válido, se ignora:', r.errors);
  return EMPTY_FIT;
}

/** Ajustes incorporados al proyecto (src/components/frog/accessory-fit.json). Se validan una vez. */
export const PROJECT_FIT: FitConfig = loadProjectFit();

export const slotOf = (id: string): AccSlot | null => {
  const s = id.split('-')[0];
  return s === 'hat' || s === 'neck' || s === 'eyes' ? s : null;
};

/** Ajuste efectivo de un complemento en una etapa: los campos de la etapa sustituyen a los de `base`. */
export function resolveAdjust(fit: FitConfig, id: string, stage: StageId): FitAdjust {
  const it = fit.items[id];
  if (!it) return {};
  return { ...it.base, ...it.stages?.[stage] };
}

export interface MoodFrame { s: number; dx: number; dy: number; c: [number, number] }
const IDENTITY: MoodFrame = { s: 1, dx: 0, dy: 0, c: [120, 120] };

export function moodFrame(stage: StageId, mood: Mood): MoodFrame {
  const f = MOOD_FRAME[stage];
  const m = f && mood !== 'neutral' ? f[mood] : undefined;
  return m ? { s: m[0], dx: m[1], dy: m[2], c: f!.c } : IDENTITY;
}

export const mapPoint = (f: MoodFrame, x: number, y: number): [number, number] =>
  [f.c[0] + (x - f.c[0]) * f.s + f.dx, f.c[1] + (y - f.c[1]) * f.s + f.dy];

export interface ItemLayout {
  id: string;
  slot: AccSlot;
  /** Rectángulo del elemento <image> (incluye los márgenes transparentes, si los hay). */
  img: Rect;
  /** Parte visible del complemento. */
  visible: Rect;
  /** Punto de apoyo: el punto del dibujo que cae en el ancla. */
  support: [number, number];
  /** Centro de giro. */
  pivot: [number, number];
  rotate: number;
  z: number;
  layer: FitLayer;
  /** Parte de la rana que se pinta encima de este complemento. */
  overlay: 'none' | 'eyes' | 'head';
  /** Gafas partidas: x de fin de lente izquierda e inicio de la derecha, y separación extra. */
  split?: { l: number; r: number; spread: number };
}

/**
 * Coloca un complemento. Devuelve null si no se conoce su dibujo (nunca rompe la rana).
 * `art` permite al probador usar un PNG local sin tocar el catálogo.
 */
export function layoutItem(
  id: string, stage: StageId, mood: Mood = 'neutral',
  fit: FitConfig = PROJECT_FIT, art: Record<string, ItemArt> = ITEM_ART,
): ItemLayout | null {
  const item = art[id];
  const slot = slotOf(id);
  if (!item || !slot) return null;
  const s = STAGE_ART[stage];
  const a = resolveAdjust(fit, id, stage);

  // 1. Ancla y tamaño por defecto (igual que siempre).
  let [x, y, ref] = s[slot];
  if (item.center !== undefined) {
    // Cascos y capuchas: centrados en la cara, no apoyados encima.
    x = s.eyes[0];
    y = s.eyes[1] + s.eyes[2] * item.center;
  }
  x += (item.dx ?? 0) * s.eyes[2];
  let w = ref * item.w;
  let h = w * item.ratio;

  // 2. Ajuste propio.
  const k = a.scale ?? 1;
  w *= k; h *= k;
  x += a.x ?? 0;
  y += a.y ?? 0;

  // 3. Encuadre del ánimo.
  const f = moodFrame(stage, mood);
  [x, y] = mapPoint(f, x, y);
  w *= f.s; h *= f.s;

  // 4. Visible → archivo.
  const visible = { x: x - w * item.ax, y: y - h * item.ay, w, h };
  const [b0, b1, b2, b3] = item.bounds ?? [0, 0, 1, 1];
  const iw = w / (b2 - b0);
  const ih = h / (b3 - b1);
  const img = { x: visible.x - b0 * iw, y: visible.y - b1 * ih, w: iw, h: ih };

  // 5. Giro.
  const [px, py] = a.pivot ?? [item.ax, item.ay];
  const pivot: [number, number] = [visible.x + w * px, visible.y + h * py];

  const auto = slot === 'hat' ? (item.noEyes ? 'none' : 'eyes') : slot === 'neck' && item.tuck ? 'head' : 'none';
  const overlay = !a.overlay || a.overlay === 'auto' ? auto : a.overlay;
  const sp = fit.items[id]?.split;

  return {
    id, slot, img, visible, support: [x, y], pivot,
    rotate: a.rotate ?? 0,
    z: a.z ?? DEFAULT_Z[slot],
    layer: a.layer ?? 'front',
    overlay,
    split: sp && slot === 'eyes' && a.spread
      ? { l: visible.x + w * sp[0], r: visible.x + w * sp[1], spread: a.spread * f.s }
      : undefined,
  };
}

export interface FrogLayout {
  frame: MoodFrame;
  /** Complementos de detrás de la rana y de delante, ya ordenados. */
  back: ItemLayout[];
  front: ItemLayout[];
  /** Ojos que se pintan encima de los sombreros. */
  eyeClip: { cx: number; cy: number; r: number }[];
  /** Altura bajo la que se esconde un complemento «metido» bajo la barbilla. */
  headClipY: number;
}

export function layoutFrog(
  stage: StageId, mood: Mood, ids: (string | undefined)[],
  fit: FitConfig = PROJECT_FIT, art: Record<string, ItemArt> = ITEM_ART,
): FrogLayout {
  const items = ids
    .map((id) => (id ? layoutItem(id, stage, mood, fit, art) : null))
    .filter((l): l is ItemLayout => !!l)
    // Orden estable: z y, a igualdad, cuello < sombrero < gafas.
    .sort((p, q) => p.z - q.z || ACC_SLOTS.indexOf(p.slot) - ACC_SLOTS.indexOf(q.slot));
  const frame = moodFrame(stage, mood);
  const [ex, ey, span] = STAGE_ART[stage].eyes;
  const eyeClip = [-1, 1].map((side) => {
    const [cx, cy] = mapPoint(frame, ex + (side * span) / 2, ey);
    return { cx, cy, r: span * EYE_BUMP * frame.s };
  });
  return {
    frame,
    back: items.filter((l) => l.layer === 'back'),
    front: items.filter((l) => l.layer !== 'back'),
    eyeClip,
    headClipY: mapPoint(frame, 120, STAGE_ART[stage].neck[1] + TUCK)[1],
  };
}
