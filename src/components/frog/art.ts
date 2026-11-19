/* Generado a partir de las ilustraciones (docs/IMAGENES.md). Coordenadas en una caja de 240 × 240. */
import type { StageId } from '../../domain/progression';

/** Súbelo cuando cambies las imágenes de public/art para invalidar la caché. */
export const ART_VERSION = 1;
export const art = (path: string) => `${import.meta.env.BASE_URL}art/${path}?v=${ART_VERSION}`;

export interface Rect { x: number; y: number; w: number; h: number }
/** x, y del ancla y ancho de referencia (cabeza, separación de ojos o cuello). */
export type AnchorTuple = [number, number, number];
export interface StageArt { rect: Rect; hat: AnchorTuple; eyes: AnchorTuple; neck: AnchorTuple }

export const STAGE_ART: Record<StageId, StageArt> = {
  tadpole: { rect: { x: 58.63, y: 54.48, w: 122.74, h: 152.08 }, hat: [120.0, 74.53, 123.31], eyes: [120.0, 91.76, 58.03], neck: [120.0, 164.29, 87.04] },
  froglet: { rect: { x: 59.58, y: 52.48, w: 120.69, h: 174.16 }, hat: [120.0, 85.28, 119.61], eyes: [119.12, 104.63, 58.05], neck: [120.0, 153.88, 91.47] },
  young: { rect: { x: 57.25, y: 62.83, w: 125.67, h: 163.83 }, hat: [120.0, 91.49, 122.28], eyes: [120.0, 113.33, 56.77], neck: [120.0, 165.73, 94.33] },
  adult: { rect: { x: 34.92, y: 33.71, w: 170.15, h: 194.64 }, hat: [120.0, 76.95, 130.22], eyes: [120.0, 98.65, 60.77], neck: [120.0, 154.21, 114.59] },
  sage: { rect: { x: 28.68, y: 40.52, w: 182.64, h: 193.24 }, hat: [120.0, 83.26, 126.88], eyes: [120.0, 99.66, 58.69], neck: [120.0, 163.54, 107.03] },
};

export interface ItemArt { ratio: number; w: number; ax: number; ay: number; dx?: number; center?: boolean }
export const ITEM_ART: Record<string, ItemArt> = {
  'hat-party': { ratio: 1.4271, w: 0.42, ax: 0.5, ay: 0.95 },
  'hat-cap': { ratio: 0.9066, w: 0.62, ax: 0.5, ay: 0.74 },
  'hat-tophat': { ratio: 0.7511, w: 0.62, ax: 0.5, ay: 0.9 },
  'hat-beanie': { ratio: 1.0011, w: 0.62, ax: 0.5, ay: 0.74 },
  'hat-wizard': { ratio: 0.7529, w: 0.68, ax: 0.5, ay: 0.86 },
  'hat-flower': { ratio: 0.6237, w: 0.42, ax: 0.5, ay: 0.8 },
  'hat-crown': { ratio: 0.6105, w: 0.56, ax: 0.5, ay: 0.92 },
  'hat-astronaut': { ratio: 0.8383, w: 1.22, ax: 0.5, ay: 0.5, center: true },
  'hat-beret': { ratio: 0.6321, w: 0.62, ax: 0.5, ay: 0.85 },
  'neck-bandana': { ratio: 0.6131, w: 0.8, ax: 0.5, ay: 0.18 },
  'neck-tie': { ratio: 1.1042, w: 0.52, ax: 0.5, ay: 0.1 },
  'neck-bowtie': { ratio: 0.5005, w: 0.5, ax: 0.5, ay: 0.45 },
  'neck-scarf': { ratio: 0.937, w: 0.68, ax: 0.5, ay: 0.16 },
  'neck-pearls': { ratio: 0.4819, w: 0.82, ax: 0.5, ay: 0.25 },
  'neck-medal': { ratio: 1.088, w: 0.55, ax: 0.5, ay: 0.08 },
  'eyes-round': { ratio: 0.4223, w: 1.95, ax: 0.5, ay: 0.5 },
  'eyes-sun': { ratio: 0.3817, w: 2.0, ax: 0.5, ay: 0.5 },
  'eyes-monocle': { ratio: 0.9774, w: 0.7, ax: 0.4, ay: 0.4, dx: 0.5 },
  'eyes-heart': { ratio: 0.4148, w: 2.0, ax: 0.5, ay: 0.5 },
};
