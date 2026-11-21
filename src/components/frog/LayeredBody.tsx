import type { Mood } from '../../domain/engine';
import { art as artUrl, type Rect } from './art';
import type { MoodFrame } from './layout';
import type { LayeredStage, SkinModel } from './skins';

/**
 * Rana por capas (ver skins.ts). Solo se usa cuando la etapa tiene todos sus recursos; con
 * los recursos actuales no se activa nunca y se dibuja la ilustración completa.
 *
 * Todas las capas comparten el rectángulo de la ilustración de la etapa (STAGE_ART.rect), así
 * que conservan encuadre, proporciones y posición de ojos, cabeza y cuerpo.
 */

const url = artUrl;

function bodyFor(stage: LayeredStage, mood: Mood) {
  return stage.postures?.[mood] ?? { shade: stage.shade, masks: stage.masks };
}

/** Máscaras: van una sola vez en <defs>; el cuerpo puede pintarse varias veces (repintados). */
export function LayeredDefs({ uid, art, mood, rect }: { uid: string; art: LayeredStage; mood: Mood; rect: Rect }) {
  const { masks } = bodyFor(art, mood);
  return (
    <>
      {(['body', 'belly', 'spots'] as const).map((k) => (
        <mask key={k} id={`${uid}-m-${k}`} maskUnits="userSpaceOnUse" x={rect.x} y={rect.y} width={rect.w} height={rect.h}>
          <image href={url(masks[k])} x={rect.x} y={rect.y} width={rect.w} height={rect.h} preserveAspectRatio="none" />
        </mask>
      ))}
    </>
  );
}

export function LayeredBody({ uid, art, skin, mood, rect, frame, marks }: {
  uid: string; art: LayeredStage; skin: SkinModel; mood: Mood; rect: Rect; frame: MoodFrame; marks?: string;
}) {
  const { shade } = bodyFor(art, mood);
  const face = art.faces[mood]!;
  const r = { x: rect.x, y: rect.y, width: rect.w, height: rect.h };
  // Sin cuerpo propio para el ánimo: el neutral con el encaje del ánimo (como las ilustraciones).
  const t = art.postures?.[mood] || (frame.s === 1 && !frame.dx && !frame.dy)
    ? undefined
    : `translate(${frame.c[0] + frame.dx} ${frame.c[1] + frame.dy}) scale(${frame.s}) translate(${-frame.c[0]} ${-frame.c[1]})`;
  return (
    <g transform={t} style={{ isolation: 'isolate' }}>
      {art.under && <image href={url(art.under)} {...r} />}
      <rect {...r} fill={skin.colors.body} mask={`url(#${uid}-m-body)`} />
      <rect {...r} fill={skin.colors.belly} mask={`url(#${uid}-m-belly)`} />
      <rect {...r} fill={skin.colors.spots} mask={`url(#${uid}-m-spots)`} />
      {marks && <image href={url(marks)} {...r} mask={`url(#${uid}-m-body)`} />}
      <image href={url(shade)} {...r} style={{ mixBlendMode: 'multiply' }} />
      {art.over && <image href={url(art.over)} {...r} />}
      <image href={url(face)} {...r} />
    </g>
  );
}
