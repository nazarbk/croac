import type { Mood } from '../../domain/engine';
import type { StageId } from '../../domain/progression';

/**
 * Pieles de la rana.
 *
 * Hoy cada piel es un juego completo de ilustraciones (5 etapas × 5 ánimos) en
 * public/art/frog/<piel>/<etapa>-<ánimo>.webp, con la cara pintada dentro. Así se siguen
 * dibujando todas las pieles actuales.
 *
 * Preparado para el siguiente paso: pieles por capas, para añadir una piel nueva sin
 * volver a producir los 25 dibujos. Composición (de atrás adelante):
 *   1. Complementos traseros
 *   2. Colores de la piel (cuerpo, vientre, manchas) recortados con máscaras de la etapa
 *   3. Marcas decorativas opcionales de la piel (recortadas a la silueta)
 *   4. Sombreado y contorno de la etapa (sin color, en multiplicar) — sin cara
 *   5. Expresión (ojos, boca, mejillas…), una por ánimo y etapa, común a todas las pieles
 *   6. Complementos delanteros
 * Nunca se usa hue-rotate sobre la rana entera: cambiaría ojos, mejillas y detalles.
 *
 * Las capas solo se usan si la etapa tiene TODOS sus recursos (LAYERED_ART) y la piel
 * lo pide (`layered: true`); si falta algo, se dibuja la ilustración completa de siempre.
 * Lista de recursos necesarios: docs/PIELES.md.
 */

export interface SkinColors {
  /** Color base de toda la silueta. */
  body: string;
  belly: string;
  spots: string;
}

export interface SkinModel {
  id: string;
  colors: SkinColors;
  /** Tiene ilustraciones completas propias (public/art/frog/<id>/). */
  sprites: boolean;
  /** Dibujar por capas cuando la etapa tenga los recursos (si no, ilustraciones o la verde). */
  layered?: boolean;
  /** Marcas decorativas por etapa (archivo en public/art/frog/skins/<id>/), recortadas a la silueta. */
  marks?: Partial<Record<StageId, string>>;
}

/** Colores medidos en las ilustraciones actuales (referencia para recrearlas por capas). */
export const SKIN_MODELS: Record<string, SkinModel> = {
  'skin-green': { id: 'skin-green', sprites: true, colors: { body: '#5aae72', belly: '#deeac6', spots: '#42965a' } },
  'skin-blue': { id: 'skin-blue', sprites: true, colors: { body: '#2f63e6', belly: '#aedef6', spots: '#1d46b8' } },
  'skin-pink': { id: 'skin-pink', sprites: true, colors: { body: '#f6aec6', belly: '#fff0dc', spots: '#ea8aa2' } },
  'skin-gold': { id: 'skin-gold', sprites: true, colors: { body: '#f2b836', belly: '#fbf2ba', spots: '#dea21e' } },
  'skin-midnight': { id: 'skin-midnight', sprites: true, colors: { body: '#2a4272', belly: '#badef6', spots: '#1e365a' } },
  'skin-s1-jake': { id: 'skin-s1-jake', sprites: true, colors: { body: '#f6ba12', belly: '#f6ea8a', spots: '#eaa212' } },
  'skin-s1-bmo': { id: 'skin-s1-bmo', sprites: true, colors: { body: '#4ed2ba', belly: '#c6f6de', spots: '#3fb8a2' } },
};

/** Recursos por capas de una etapa (rutas dentro de public/art/). */
export interface LayeredStage {
  /** Sombreado + contorno sin color y sin cara (se multiplica sobre los colores). */
  shade: string;
  /** Máscaras en escala de grises (blanco = zona). `body` es la silueta completa. */
  masks: { body: string; belly: string; spots: string };
  /** Expresiones aisladas, una por ánimo. */
  faces: Partial<Record<Mood, string>>;
  /** Opcional: detrás del cuerpo (p. ej. el brillo dorado de la rana sabia). */
  under?: string;
  /** Opcional: encima del sombreado y debajo de la cara, igual en todas las pieles (p. ej. la barba). */
  over?: string;
  /**
   * Ánimos con cuerpo propio (postura distinta). Si no se indican, se usa el cuerpo neutral
   * con el encaje del ánimo (MOOD_FRAME), que es como varían hoy las ilustraciones.
   */
  postures?: Partial<Record<Mood, Pick<LayeredStage, 'shade' | 'masks'>>>;
}

/**
 * Recursos disponibles. Vacío: todavía no hay cuerpos sin cara, máscaras ni expresiones
 * aisladas (ver docs/PIELES.md). Al añadirlos, se rellena aquí etapa a etapa.
 */
export const LAYERED_ART: Partial<Record<StageId, LayeredStage>> = {};

export const MOODS: Mood[] = ['neutral', 'happy', 'worried', 'sad', 'sleeping'];

/** ¿La etapa tiene todo lo necesario? Si falta una sola expresión, no se usan capas en ninguna. */
export function layeredStageReady(stage: StageId, art = LAYERED_ART): boolean {
  const s = art[stage];
  return !!s && !!s.shade && !!s.masks?.body && !!s.masks.belly && !!s.masks.spots && MOODS.every((m) => !!s.faces[m]);
}

/** Qué dibujar: la ilustración completa (lo de siempre) o la composición por capas. */
export function frogRenderMode(stage: StageId, skin: string | undefined, art = LAYERED_ART): 'sprite' | 'layered' {
  const model = skin ? SKIN_MODELS[skin] : undefined;
  return model?.layered && layeredStageReady(stage, art) ? 'layered' : 'sprite';
}

/** Piel cuyas ilustraciones completas se usan (las pieles sin ellas caen en la verde). */
export const spriteSkin = (skin: string | undefined) => (skin && SKIN_MODELS[skin]?.sprites ? skin : 'skin-green');
