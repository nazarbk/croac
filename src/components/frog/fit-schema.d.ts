import type { StageId } from '../../domain/progression';

/** Qué parte de la rana se vuelve a pintar encima del complemento. */
export type FitOverlay = 'auto' | 'none' | 'eyes' | 'head';
export type FitLayer = 'front' | 'back';

/**
 * Ajuste de un complemento. Todo es opcional: lo que falte usa el valor por defecto
 * (los anclajes de art.ts). Unidades del viewBox de 240 × 240.
 */
export interface FitAdjust {
  /** Desplazamiento del punto de apoyo. */
  x?: number;
  y?: number;
  /** Multiplicador del tamaño (1 = el de siempre). Escala alrededor del punto de apoyo. */
  scale?: number;
  /** Grados, alrededor de `pivot`. */
  rotate?: number;
  /** Centro de giro en proporción (0-1) del rectángulo visible. Por defecto, el punto de apoyo. */
  pivot?: [number, number];
  /** Orden de dibujo (mayor = más delante). Por defecto cuello 10, sombrero 20, gafas 30. */
  z?: number;
  /** `back` lo dibuja detrás de la rana. */
  layer?: FitLayer;
  /** Parte de la rana que se pinta encima: ojos (sombreros), cabeza (meter bajo la barbilla) o nada. */
  overlay?: FitOverlay;
  /** Solo gafas con `split`: separa las lentes (sin deformarlas); el puente se estira. */
  spread?: number;
}

export interface ItemFit {
  /** Para todas las etapas. */
  base?: FitAdjust;
  /** Por etapa: cada campo sustituye al de `base`. */
  stages?: Partial<Record<StageId, FitAdjust>>;
  /** Gafas: dónde acaba la lente izquierda y empieza la derecha (proporción del ancho visible). */
  split?: [number, number];
}

export interface FitConfig {
  version: 1;
  items: Record<string, ItemFit>;
}

export type FitValidation =
  | { ok: true; value: FitConfig; warnings: string[] }
  | { ok: false; errors: string[]; warnings: string[] };

export const FIT_VERSION: 1;
export const FIT_STAGES: StageId[];
export const FIT_LAYERS: FitLayer[];
export const FIT_OVERLAYS: FitOverlay[];
export const ITEM_ID: RegExp;
export const FIT_LIMITS: Record<'x' | 'y' | 'scale' | 'rotate' | 'pivot' | 'z' | 'spread', [number, number]>;
export function validateFit(input: unknown, opts?: { knownIds?: Iterable<string> }): FitValidation;
export function normalizeFit(config: FitConfig): FitConfig;
export function stringifyFit(config: FitConfig): string;
