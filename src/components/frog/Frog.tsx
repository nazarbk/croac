import type { Mood } from '../../domain/engine';
import { stageForLevel, type StageId } from '../../domain/progression';
import type { Slot } from '../../domain/types';
import { cn } from '../../lib/cn';
import { art, ITEM_ART, STAGE_ART, type AnchorTuple, type Rect } from './art';

const SKINS = ['skin-green', 'skin-blue', 'skin-pink', 'skin-gold', 'skin-midnight'];
const BACKGROUNDS = ['bg-pond', 'bg-sunset', 'bg-night', 'bg-rain', 'bg-space'];

export const frogUrl = (stage: StageId, mood: Mood, skin?: string) =>
  art(`frog/${skin && SKINS.includes(skin) ? skin : 'skin-green'}/${stage}-${mood}.webp`);
export const backgroundUrl = (id?: string) => art(`bg/${id && BACKGROUNDS.includes(id) ? id : 'bg-pond'}.webp`);
export const itemUrl = (id: string) => art(`acc/${id}.webp`);

/** Dónde se dibuja un complemento sobre la rana (en la caja de 240). */
function itemRect(id: string, stage: StageId): Rect | null {
  const item = ITEM_ART[id];
  if (!item) return null;
  const s = STAGE_ART[stage];
  const slot = id.split('-')[0] as 'hat' | 'neck' | 'eyes';
  let [x, y, ref]: AnchorTuple = s[slot];
  if (item.center) {
    // El casco va centrado en la cabeza, no apoyado encima.
    x = s.eyes[0];
    y = s.eyes[1] + s.eyes[2] * 0.12;
  }
  const w = ref * item.w;
  const h = w * item.ratio;
  x += (item.dx ?? 0) * s.eyes[2];
  return { x: x - w * item.ax, y: y - h * item.ay, w, h };
}

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
  const stage = stageOverride ?? stageForLevel(level).id;
  const body = STAGE_ART[stage].rect;
  const slots: ['neck' | 'eyes' | 'hat', string | undefined][] = [
    ['neck', equipped.neck],
    ['eyes', mood === 'sleeping' ? undefined : equipped.eyes],
    ['hat', equipped.hat],
  ];

  return (
    <svg
      viewBox="0 0 240 240" className={className} role="img" aria-label={title ?? 'Tu rana'}
      preserveAspectRatio={align === 'bottom' ? 'xMidYMax meet' : undefined}
    >
      {scene && <image href={backgroundUrl(equipped.background)} width="240" height="240" preserveAspectRatio="xMidYMid slice" />}
      <g transform={scene ? ON_PAD : undefined}>
        <g key={hopKey} className={hopKey ? 'frog-hop' : undefined}>
          <g className="frog-idle">
            <image href={frogUrl(stage, mood, equipped.skin)} x={body.x} y={body.y} width={body.w} height={body.h} />
            {slots.map(([slot, id]) => {
              const r = id ? itemRect(id, stage) : null;
              return r ? <image key={slot} href={itemUrl(id!)} x={r.x} y={r.y} width={r.w} height={r.h} /> : null;
            })}
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
