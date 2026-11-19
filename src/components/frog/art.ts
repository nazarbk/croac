/* Generado a partir de las ilustraciones (docs/IMAGENES.md). Coordenadas en una caja de 240 × 240. */
import type { StageId } from '../../domain/progression';

/** Súbelo cuando cambies las imágenes de public/art para invalidar la caché. */
export const ART_VERSION = 2;
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

export interface ItemArt {
  ratio: number;
  /** Ancho respecto a la referencia del ancla (cabeza, separación de ojos o cuello). */
  w: number;
  /** Punto del dibujo (0-1) que cae en el ancla. */
  ax: number;
  ay: number;
  /** Desplazamiento horizontal en separaciones de ojos (p. ej. el monóculo). */
  dx?: number;
  /** Centrado en la cara en vez de apoyado encima: desplazamiento vertical desde los ojos. */
  center?: number;
  /** No pintar los ojos por encima (cascos y capuchas que rodean la cabeza). */
  noEyes?: boolean;
  /** Esconder la parte de arriba bajo la barbilla (ninguno lo usa: se ven enteros). */
  tuck?: boolean;
}
export const ITEM_ART: Record<string, ItemArt> = {
  'neck-tie': { ratio: 2.0831, w: 0.26, ax: 0.5, ay: 0.04 },
  'neck-bandana': { ratio: 0.6763, w: 0.78, ax: 0.5, ay: 0.1 },
  'neck-pearls': { ratio: 0.3874, w: 0.74, ax: 0.5, ay: 0.3 },
  'neck-scarf': { ratio: 0.7011, w: 0.8, ax: 0.5, ay: 0.1 },
  'neck-bowtie': { ratio: 0.4838, w: 0.44, ax: 0.5, ay: 0.3 },
  'eyes-sun': { ratio: 0.365, w: 1.92, ax: 0.5, ay: 0.5 },
  'eyes-round': { ratio: 0.4146, w: 1.96, ax: 0.5, ay: 0.5 },
  'eyes-heart': { ratio: 0.4179, w: 2.0, ax: 0.5, ay: 0.5 },
  'neck-medal': { ratio: 1.0956, w: 0.46, ax: 0.5, ay: 0.05 },
  'eyes-monocle': { ratio: 1.4711, w: 0.64, ax: 0.4, ay: 0.29, dx: 0.5 },
  'hat-party': { ratio: 1.5182, w: 0.4, ax: 0.5, ay: 0.95 },
  'hat-beanie': { ratio: 0.9624, w: 0.64, ax: 0.5, ay: 0.82 },
  'hat-beret': { ratio: 0.5813, w: 0.66, ax: 0.5, ay: 0.8 },
  'hat-flower': { ratio: 0.6112, w: 0.5, ax: 0.5, ay: 0.82 },
  'hat-tophat': { ratio: 0.6637, w: 0.62, ax: 0.5, ay: 0.94 },
  'hat-cap': { ratio: 0.8133, w: 0.62, ax: 0.5, ay: 0.88 },
  'hat-wizard': { ratio: 0.8596, w: 0.72, ax: 0.5, ay: 0.92 },
  'hat-crown': { ratio: 0.5692, w: 0.58, ax: 0.5, ay: 0.92 },
  'hat-astronaut': { ratio: 0.8838, w: 1.08, ax: 0.5, ay: 0.5, center: 0.3, noEyes: true },
  'neck-s1-scarf': { ratio: 0.6731, w: 0.8, ax: 0.5, ay: 0.1 },
  'neck-s1-axe': { ratio: 1.513, w: 0.46, ax: 0.5, ay: 0.06 },
  'eyes-s1-candy': { ratio: 0.6919, w: 2.0, ax: 0.5, ay: 0.64 },
  'hat-s1-bear': { ratio: 0.7789, w: 1.1, ax: 0.5, ay: 0.5, center: -0.06, noEyes: true },
  'eyes-s1-cloud': { ratio: 0.4689, w: 2.06, ax: 0.5, ay: 0.6 },
  'hat-s1-icecrown': { ratio: 0.8589, w: 0.6, ax: 0.5, ay: 0.95 },
};
