/* Medido sobre las ilustraciones (docs/IMAGENES.md). Coordenadas en una caja de 240 × 240. */
import type { StageId } from '../../domain/progression';

/** Súbelo cuando cambies las imágenes de public/art para invalidar la caché. */
export const ART_VERSION = 3;
export const art = (path: string) => `${import.meta.env.BASE_URL}art/${path}?v=${ART_VERSION}`;

export interface Rect { x: number; y: number; w: number; h: number }
/** x, y del ancla y ancho de referencia (cabeza, separación de ojos o cuello). */
export type AnchorTuple = [number, number, number];
/**
 * `rect`: dónde se dibuja el cuerpo (public/art/frog/body/<etapa>.webp).
 * `face`: dónde va la expresión (public/art/frog/face/<ánimo>.webp): centro de la nariz y
 * ancho del lienzo común de las caras (940 × 540, con la nariz en el centro).
 * Anclajes de complementos: `hat` (entre los ojos, sobre la cabeza), `eyes` (centro y
 * separación de los ojos) y `neck` (barbilla y ancho de referencia).
 */
export interface StageArt { rect: Rect; face: AnchorTuple; hat: AnchorTuple; eyes: AnchorTuple; neck: AnchorTuple }

/** Proporción alto/ancho del lienzo común de las caras. */
export const FACE_RATIO = 540 / 940;

export const STAGE_ART: Record<StageId, StageArt> = {
  tadpole: { rect: { x: 75.14, y: 70, w: 126.74, h: 136 }, face: [120, 91.22, 79.28], hat: [120, 81.4, 89.3], eyes: [119.5, 82.05, 45.2], neck: [120, 136.8, 80.4] },
  froglet: { rect: { x: 69.2, y: 80, w: 133.22, h: 146 }, face: [120, 104.42, 90.48], hat: [120, 92.1, 99.0], eyes: [119.4, 93.96, 51.6], neck: [120, 151.4, 89.1] },
  young: { rect: { x: 72.37, y: 88, w: 95.83, h: 138 }, face: [120, 110.99, 85.18], hat: [120, 100.0, 93.2], eyes: [119.45, 101.14, 48.4], neck: [120, 156.0, 83.9] },
  adult: { rect: { x: 37.6, y: 70, w: 165.24, h: 158 }, face: [120, 96.52, 99.08], hat: [120, 83.2, 108.2], eyes: [119.35, 85.06, 56.5], neck: [120, 131.5, 97.4] },
  sage: { rect: { x: 35.72, y: 66, w: 168.78, h: 164 }, face: [120, 93.53, 102.03], hat: [120, 79.2, 111.2], eyes: [119.35, 81.73, 58.1], neck: [120, 134.9, 100.1] },
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
  /**
   * Parte visible del archivo según su canal alfa: [x0, y0, x1, y1] en proporción (0-1).
   * Se mide una vez al preparar la imagen (no en cada render). Sin él se asume que el
   * archivo ya está recortado (todos los de public/art/acc lo están). `ratio`, `w`, `ax` y
   * `ay` se refieren siempre a la parte visible, no al archivo con sus márgenes.
   */
  bounds?: [number, number, number, number];
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

/**
 * Ojos de las caras (iguales en todas): centro de cada ojo respecto a la nariz y diámetro,
 * en proporción del ancho del lienzo de la cara. Medido sobre la cara neutral.
 */
export const FACE_EYES = { l: [-274 / 940, -108.7 / 940], r: [261.6 / 940, -108.3 / 940], d: 272 / 940 } as const;
