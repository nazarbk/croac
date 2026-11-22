import type { Mood } from '../../domain/engine';
import type { StageId } from '../../domain/progression';
import { art } from './art';

/**
 * Cómo se dibuja la rana: por capas.
 *
 *   cuerpo de la etapa (sin cara) → expresión del ánimo → complementos
 *
 * - Cuerpos: public/art/frog/body/<etapa>.webp (uno por etapa, igual en todos los ánimos).
 * - Expresiones: public/art/frog/face/<ánimo>.webp, un único juego que sirve para las cinco
 *   etapas; se colocan con STAGE_ART[etapa].face (y el ajuste «face» del probador).
 *
 * Una expresión nueva es UNA imagen (no cinco): ver docs/PIELES.md.
 *
 * Pieles de color: de momento no hay. Las pieles compradas siguen guardadas (no se pierde
 * nada) pero todas se dibujan con el cuerpo verde. Cuando una piel tenga sus propios
 * cuerpos, se añade aquí y solo hacen falta 5 imágenes (las caras son comunes).
 */

/** Pieles con cuerpos propios: public/art/frog/body/<piel>/<etapa>.webp. Ninguna todavía. */
export const SKIN_BODIES = new Set<string>();

export const bodyUrl = (stage: StageId, skin?: string) =>
  art(skin && SKIN_BODIES.has(skin) ? `frog/body/${skin}/${stage}.webp` : `frog/body/${stage}.webp`);

export const faceUrl = (mood: Mood) => art(`frog/face/${mood}.webp`);

export const MOODS: Mood[] = ['neutral', 'happy', 'worried', 'sad', 'sleeping'];
