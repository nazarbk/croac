import { Fragment, useId } from 'react';
import type { Mood } from '../../domain/engine';
import { stageForLevel, type StageId } from '../../domain/progression';
import type { Slot } from '../../domain/types';
import { cn } from '../../lib/cn';
import { art, ITEM_ART, STAGE_ART, type ItemArt } from './art';
import type { FitConfig } from './fit-schema';
import { useCommunityArt, type CommunityArt } from './community';
import { useActiveFit } from './fitStore';
import { layoutFrog, type ItemLayout } from './layout';
import { bodyUrl, faceUrl } from './skins';

const BACKGROUNDS = ['bg-pond', 'bg-sunset', 'bg-night', 'bg-rain', 'bg-space', 'bg-s1-candy', 'bg-s1-treehouse'];

export const backgroundUrl = (id?: string) => art(`bg/${id && BACKGROUNDS.includes(id) ? id : 'bg-pond'}.webp`);
export const itemUrl = (id: string) => art(`acc/${id}.webp`);

/** Dibujos del catálogo + ganadores del patio + los del probador. */
function artFor(community: Record<string, CommunityArt>, extra?: Record<string, ItemArt>): Record<string, ItemArt> {
  const ids = Object.keys(community);
  if (!ids.length && !extra) return ITEM_ART;
  const out: Record<string, ItemArt> = { ...ITEM_ART };
  for (const id of ids) out[id] = community[id].art;
  return extra ? Object.assign(out, extra) : out;
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
  /** Solo el probador: ajustes sin guardar en vez de los de la app. */
  fit?: FitConfig;
  /** Solo el probador: dibujos y direcciones de complementos que aún no están en el catálogo. */
  itemArt?: Record<string, ItemArt>;
  itemHref?: Record<string, string>;
}

/**
 * Capas, de atrás adelante:
 *   complementos traseros → cuerpo de la etapa → expresión → complementos delanteros
 *   (cuello, sombrero, gafas).
 * Tras cada complemento se repinta, si hace falta, una parte de la rana encima:
 * - Sombreros: los ojos (que en las ranas están encima de la cabeza), para que el sombrero
 *   quede apoyado entre ellos. Los cascos y capuchas que rodean la cabeza no lo necesitan.
 * - Cuello (opcional): la cabeza, para esconder la parte alta bajo la barbilla.
 */
export function Frog({
  level, mood = 'neutral', equipped = {}, scene = false, hopKey = 0, className, title, stageOverride, align = 'center',
  fit, itemArt, itemHref,
}: FrogProps) {
  const uid = useId().replace(/:/g, '');
  const active = useActiveFit();
  const community = useCommunityArt();
  const stage = stageOverride ?? stageForLevel(level).id;
  const body = STAGE_ART[stage].rect;
  // Aritmética sobre datos ya medidos: nada de analizar imágenes al renderizar.
  const layout = layoutFrog(
    stage,
    [equipped.neck, equipped.hat, mood === 'sleeping' ? undefined : equipped.eyes],
    fit ?? active, artFor(community, itemArt),
  );
  const { face } = layout;
  const all = [...layout.back, ...layout.front];
  const needs = (o: ItemLayout['overlay']) => layout.front.some((l) => l.overlay === o);
  const frogImg = (clip?: string) => (
    <g clipPath={clip ? `url(#${clip})` : undefined}>
      <image href={bodyUrl(stage, equipped.skin)} x={body.x} y={body.y} width={body.w} height={body.h} />
      <image href={faceUrl(mood)} x={face.img.x} y={face.img.y} width={face.img.w} height={face.img.h}
        transform={face.rotate ? `rotate(${face.rotate} ${face.pivot[0]} ${face.pivot[1]})` : undefined} />
    </g>
  );
  const draw = (l: ItemLayout) => (
    <ItemImage key={l.id} l={l} href={itemHref?.[l.id] ?? community[l.id]?.href ?? itemUrl(l.id)} uid={uid} />
  );

  return (
    <svg
      viewBox="0 0 240 240" className={className} role="img" aria-label={title ?? 'Tu rana'}
      preserveAspectRatio={align === 'bottom' ? 'xMidYMax meet' : undefined}
    >
      <defs>
        {all.length > 0 && (
          <filter id={`${uid}-sh`} x="-10%" y="-10%" width="120%" height="130%">
            <feDropShadow dx="0" dy="1.2" stdDeviation="1" floodColor="#123b22" floodOpacity="0.28" />
          </filter>
        )}
        {needs('head') && <clipPath id={`${uid}-head`}><rect x="0" y="0" width="240" height={layout.headClipY} /></clipPath>}
        {needs('eyes') && (
          <clipPath id={`${uid}-eyes`}>
            {layout.eyeClip.map((c, i) => <circle key={i} cx={c.cx} cy={c.cy} r={c.r} />)}
          </clipPath>
        )}
      </defs>
      {scene && <image href={backgroundUrl(equipped.background)} width="240" height="240" preserveAspectRatio="xMidYMid slice" />}
      <g transform={scene ? ON_PAD : undefined}>
        <g key={hopKey} className={hopKey ? 'frog-hop' : undefined}>
          <g className="frog-idle">
            {layout.back.map(draw)}
            {frogImg()}
            {layout.front.map((l) => (
              <Fragment key={l.id}>
                {draw(l)}
                {l.overlay !== 'none' && frogImg(`${uid}-${l.overlay}`)}
              </Fragment>
            ))}
          </g>
        </g>
      </g>
    </svg>
  );
}

/** Un complemento. Las gafas con `split` se dibujan en tres trozos del mismo archivo. */
function ItemImage({ l, href, uid }: { l: ItemLayout; href: string; uid: string }) {
  const { img } = l;
  const transform = l.rotate ? `rotate(${l.rotate} ${l.pivot[0]} ${l.pivot[1]})` : undefined;
  const image = (clip?: string, t?: string) => (
    <image href={href} x={img.x} y={img.y} width={img.w} height={img.h}
      clipPath={clip ? `url(#${clip})` : undefined} transform={t} />
  );
  if (!l.split) return <g transform={transform} filter={`url(#${uid}-sh)`}>{image()}</g>;
  // Lentes enteras desplazadas (sin deformarlas) y el puente estirado entre ellas.
  const { l: xl, r: xr, spread } = l.split;
  const id = `${uid}-${l.id}`;
  const half = spread / 2;
  const bw = xr - xl;
  const cx = (xl + xr) / 2;
  const top = img.y - 1;
  const hh = img.h + 2;
  return (
    <g transform={transform} filter={`url(#${uid}-sh)`}>
      <clipPath id={`${id}-l`}><rect x={img.x - 1} y={top} width={xl - img.x + 1} height={hh} /></clipPath>
      <clipPath id={`${id}-r`}><rect x={xr} y={top} width={img.x + img.w - xr + 1} height={hh} /></clipPath>
      {bw > 0.5 && <clipPath id={`${id}-b`}><rect x={xl - 0.2} y={top} width={bw + 0.4} height={hh} /></clipPath>}
      {bw > 0.5 && image(`${id}-b`, `translate(${cx} 0) scale(${(bw + spread) / bw} 1) translate(${-cx} 0)`)}
      {image(`${id}-l`, `translate(${-half} 0)`)}
      {image(`${id}-r`, `translate(${half} 0)`)}
    </g>
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
