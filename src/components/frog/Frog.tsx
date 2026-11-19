import { useId } from 'react';
import type { Mood } from '../../domain/engine';
import { stageForLevel, type StageId } from '../../domain/progression';
import { CATALOG } from '../../domain/shop';
import type { Slot } from '../../domain/types';
import { cn } from '../../lib/cn';
import { art, ITEM_ART, STAGE_ART, type AnchorTuple, type Rect } from './art';

/** Pieles con ilustraciones propias (las de las temporadas incluidas). */
const SKINS = new Set(CATALOG.filter((i) => i.slot === 'skin').map((i) => i.id));
const BACKGROUNDS = ['bg-pond', 'bg-sunset', 'bg-night', 'bg-rain', 'bg-space'];

export const frogUrl = (stage: StageId, mood: Mood, skin?: string) =>
  art(`frog/${skin && SKINS.has(skin) ? skin : 'skin-green'}/${stage}-${mood}.webp`);
export const backgroundUrl = (id?: string) => art(`bg/${id && BACKGROUNDS.includes(id) ? id : 'bg-pond'}.webp`);
export const itemUrl = (id: string) => art(`acc/${id}.webp`);

/** Dónde se dibuja un complemento sobre la rana (en la caja de 240). */
function itemRect(id: string, stage: StageId): Rect | null {
  const item = ITEM_ART[id];
  if (!item) return null;
  const s = STAGE_ART[stage];
  const slot = id.split('-')[0] as 'hat' | 'neck' | 'eyes';
  let [x, y, ref]: AnchorTuple = s[slot];
  if (item.center !== undefined) {
    // Cascos y capuchas: centrados en la cara, no apoyados encima.
    x = s.eyes[0];
    y = s.eyes[1] + s.eyes[2] * item.center;
  }
  const w = ref * item.w;
  const h = w * item.ratio;
  x += (item.dx ?? 0) * s.eyes[2];
  return { x: x - w * item.ax, y: y - h * item.ay, w, h };
}

/**
 * Capas para que los complementos parezcan puestos y no pegados encima:
 * - Cuello: el complemento se ve entero, apoyado justo bajo la barbilla. Si alguno lleva
 *   «tuck», la cabeza se pinta encima de su parte alta para esconderla bajo la barbilla.
 * - Sombreros: los ojos (que en las ranas están encima de la cabeza) se pintan encima del
 *   sombrero, que queda apoyado entre ellos.
 */
const TUCK = 2.5; // unidades bajo el ancla del cuello
const EYE_BUMP = 0.43; // radio del ojo respecto a la separación entre ojos

/** La rana encima del nenúfar del fondo: los fondos tienen el nenúfar a ~84 % de alto. */
const ON_PAD = 'translate(120 202) scale(.86) translate(-120 -228)';

export interface FrogProps {
  level: number;
  mood?: Mood;
  equipped?: Partial<Record<Slot, string>>;
  /** Dibuja el fondo (charca, noche…). */
  scene?: boolean;
  /** Cambia este número para que la rana dé un salto. */
  hopKey?: number;
  className?: string;
  title?: string;
  stageOverride?: StageId;
  /** Alinea la rana abajo cuando el contenedor no es cuadrado. */
  align?: 'center' | 'bottom';
}

export function Frog({ level, mood = 'neutral', equipped = {}, scene = false, hopKey = 0, className, title, stageOverride, align = 'center' }: FrogProps) {
  const uid = useId().replace(/:/g, '');
  const stage = stageOverride ?? stageForLevel(level).id;
  const sa = STAGE_ART[stage];
  const body = sa.rect;
  const src = frogUrl(stage, mood, equipped.skin);
  const frogImg = (clip?: string) => <image href={src} x={body.x} y={body.y} width={body.w} height={body.h} clipPath={clip ? `url(#${clip})` : undefined} />;
  const item = (id: string | undefined) => {
    const r = id ? itemRect(id, stage) : null;
    return r ? <image href={itemUrl(id!)} x={r.x} y={r.y} width={r.w} height={r.h} filter={`url(#${uid}-sh)`} /> : null;
  };
  const neck = equipped.neck;
  const hat = equipped.hat;
  const eyes = mood === 'sleeping' ? undefined : equipped.eyes;
  const [ex, ey, span] = sa.eyes;

  return (
    <svg
      viewBox="0 0 240 240" className={className} role="img" aria-label={title ?? 'Tu rana'}
      preserveAspectRatio={align === 'bottom' ? 'xMidYMax meet' : undefined}
    >
      <defs>
        <filter id={`${uid}-sh`} x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="1.2" stdDeviation="1" floodColor="#123b22" floodOpacity="0.28" />
        </filter>
        {neck && ITEM_ART[neck]?.tuck && <clipPath id={`${uid}-head`}><rect x="0" y="0" width="240" height={sa.neck[1] + TUCK} /></clipPath>}
        {hat && !ITEM_ART[hat]?.noEyes && (
          <clipPath id={`${uid}-eyes`}>
            <circle cx={ex - span / 2} cy={ey} r={span * EYE_BUMP} />
            <circle cx={ex + span / 2} cy={ey} r={span * EYE_BUMP} />
          </clipPath>
        )}
      </defs>
      {scene && <image href={backgroundUrl(equipped.background)} width="240" height="240" preserveAspectRatio="xMidYMid slice" />}
      <g transform={scene ? ON_PAD : undefined}>
        <g key={hopKey} className={hopKey ? 'frog-hop' : undefined}>
          <g className="frog-idle">
            {frogImg()}
            {neck && <>{item(neck)}{ITEM_ART[neck]?.tuck && frogImg(`${uid}-head`)}</>}
            {hat && <>{item(hat)}{!ITEM_ART[hat]?.noEyes && frogImg(`${uid}-eyes`)}</>}
            {/* Las gafas siempre por delante de todo, también del sombrero. */}
            {item(eyes)}
          </g>
        </g>
      </g>
    </svg>
  );
}

/**
 * Escena a sangre (el fondo rellena cualquier proporción) con la rana sobre el nenúfar.
 * Úsalo en contenedores no cuadrados.
 */
export function FrogScene({ className, ...props }: FrogProps) {
  return (
    <div className={cn('relative overflow-hidden [container-type:size]', className)}>
      <img src={backgroundUrl(props.equipped?.background)} alt="" className="absolute inset-0 w-full h-full object-cover object-bottom" />
      {/* El nenúfar está al 84 % del alto de la imagen, que se escala al ancho del contenedor. */}
      <div className="absolute inset-x-0 top-[5%]" style={{ bottom: 'calc(16cqw - 1%)' }}>
        <Frog {...props} scene={false} align="bottom" className="w-full h-full" />
      </div>
    </div>
  );
}
