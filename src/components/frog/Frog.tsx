import { useId } from 'react';
import type { Mood } from '../../domain/engine';
import { stageForLevel, type StageId } from '../../domain/progression';
import type { Slot } from '../../domain/types';
import { EyesItem, Hat, NeckItem } from './Accessories';
import { Scene } from './Scenes';
import { skinFor, type SkinColors } from './skins';

interface Anchor { x: number; y: number; s: number }
interface Anchors { hat: Anchor; eyes: Anchor; neck: Anchor }

const ADULT_ANCHORS: Anchors = {
  hat: { x: 120, y: 62, s: 0.95 },
  eyes: { x: 120, y: 76, s: 1 },
  neck: { x: 120, y: 152, s: 1 },
};

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
  const id = useId().replace(/:/g, '');
  const stage = stageOverride ?? stageForLevel(level).id;
  const c = skinFor(equipped.skin);

  let body: React.ReactNode;
  let anchors: Anchors;
  let wrap: string | undefined;
  switch (stage) {
    case 'tadpole':
      body = <Tadpole c={c} mood={mood} />;
      anchors = { hat: { x: 110, y: 86, s: 0.66 }, eyes: { x: 110, y: 116, s: 0.56 }, neck: { x: 108, y: 176, s: 0.55 } };
      break;
    case 'froglet':
      body = <Froglet c={c} mood={mood} />;
      anchors = { hat: { x: 115, y: 82, s: 0.78 }, eyes: { x: 115, y: 90, s: 0.7 }, neck: { x: 115, y: 156, s: 0.75 } };
      break;
    case 'young':
      body = <Adult c={c} mood={mood} spots={false} />;
      anchors = ADULT_ANCHORS;
      wrap = 'translate(120 222) scale(.8) translate(-120 -222)';
      break;
    case 'sage':
      body = <Adult c={c} mood={mood} spots sage gid={id} />;
      anchors = ADULT_ANCHORS;
      wrap = 'translate(120 222) scale(1.04) translate(-120 -222)';
      break;
    default:
      body = <Adult c={c} mood={mood} spots />;
      anchors = ADULT_ANCHORS;
  }

  const place = (a: Anchor) => `translate(${a.x} ${a.y}) scale(${a.s})`;

  return (
    <svg viewBox="0 0 240 240" className={className} role="img" aria-label={title ?? 'Tu rana'} preserveAspectRatio={align === 'bottom' ? 'xMidYMax meet' : undefined}>
      {scene && <Scene id={equipped.background ?? 'bg-pond'} uid={id} />}
      <g key={hopKey} className={hopKey ? 'frog-hop' : undefined}>
        <g className="frog-idle">
          <g transform={wrap}>
            {body}
            {equipped.neck && <g transform={place(anchors.neck)}><NeckItem id={equipped.neck} /></g>}
            {equipped.eyes && mood !== 'sleeping' && <g transform={place(anchors.eyes)}><EyesItem id={equipped.eyes} /></g>}
            {equipped.hat && <g transform={place(anchors.hat)}><Hat id={equipped.hat} /></g>}
          </g>
        </g>
      </g>
      {mood === 'sleeping' && (
        <g className="zzz" fill="#5e746c" fontFamily="var(--font-display)" fontWeight="700">
          <text x="176" y="70" fontSize="18">z</text>
          <text x="190" y="50" fontSize="24">Z</text>
        </g>
      )}
    </svg>
  );
}

/* ---------- Cara ---------- */

function Eyes({ xs, y, r, mood, c }: { xs: [number, number]; y: number; r: number; mood: Mood; c: SkinColors }) {
  if (mood === 'happy' || mood === 'sleeping') {
    return (
      <g stroke={c.outline} strokeWidth={r * 0.28} strokeLinecap="round" fill="none">
        {xs.map((x) =>
          mood === 'happy' ? (
            <path key={x} d={`M${x - r * 0.7} ${y + r * 0.2} Q${x} ${y - r * 0.9} ${x + r * 0.7} ${y + r * 0.2}`} />
          ) : (
            <path key={x} d={`M${x - r * 0.7} ${y} Q${x} ${y + r * 0.6} ${x + r * 0.7} ${y}`} />
          ),
        )}
      </g>
    );
  }
  const pr = mood === 'worried' ? r * 0.42 : r * 0.52;
  const dy = mood === 'sad' ? r * 0.3 : r * 0.08;
  return (
    <g>
      <g className="frog-blink">
        {xs.map((x) => (
          <g key={x}>
            <circle cx={x} cy={y} r={r} fill="#fff" stroke={c.outline} strokeWidth={r * 0.16} />
            <circle cx={x + r * 0.08} cy={y + dy} r={pr} fill="#1d2b24" />
            <circle cx={x + r * 0.3} cy={y + dy - pr * 0.45} r={pr * 0.36} fill="#fff" />
          </g>
        ))}
      </g>
      {(mood === 'sad' || mood === 'worried') && (
        <g stroke={c.outline} strokeWidth={r * 0.2} strokeLinecap="round">
          <path d={`M${xs[0] - r * 0.8} ${y - r * 1.05} L${xs[0] + r * 0.6} ${y - r * (mood === 'sad' ? 1.5 : 1.3)}`} />
          <path d={`M${xs[1] + r * 0.8} ${y - r * 1.05} L${xs[1] - r * 0.6} ${y - r * (mood === 'sad' ? 1.5 : 1.3)}`} />
        </g>
      )}
      {mood === 'sad' && (
        <path d={`M${xs[0] - r * 0.6} ${y + r * 1.1} q-${r * 0.35} ${r * 0.6} 0 ${r * 0.85} q${r * 0.35} -${r * 0.25} 0 -${r * 0.85}z`} fill="#7cc7f2" className="tear" />
      )}
    </g>
  );
}

function Mouth({ x, y, w, mood, c }: { x: number; y: number; w: number; mood: Mood; c: SkinColors }) {
  const sw = Math.max(2.5, w * 0.16);
  switch (mood) {
    case 'happy':
      return (
        <g>
          <path d={`M${x - w} ${y} Q${x} ${y + w * 1.5} ${x + w} ${y} Z`} fill="#8b2e3b" stroke={c.outline} strokeWidth={sw} strokeLinejoin="round" />
          <ellipse cx={x} cy={y + w * 0.55} rx={w * 0.45} ry={w * 0.2} fill="#f08a9a" />
        </g>
      );
    case 'sad':
      return <path d={`M${x - w * 0.7} ${y + w * 0.45} Q${x} ${y - w * 0.25} ${x + w * 0.7} ${y + w * 0.45}`} fill="none" stroke={c.outline} strokeWidth={sw} strokeLinecap="round" />;
    case 'worried':
      return <path d={`M${x - w * 0.7} ${y + 2} q${w * 0.35} -${w * 0.3} ${w * 0.7} 0 t${w * 0.7} 0`} fill="none" stroke={c.outline} strokeWidth={sw} strokeLinecap="round" />;
    case 'sleeping':
      return <ellipse cx={x} cy={y + w * 0.2} rx={w * 0.22} ry={w * 0.28} fill="#8b2e3b" stroke={c.outline} strokeWidth={sw * 0.8} />;
    default:
      return <path d={`M${x - w} ${y} Q${x} ${y + w * 0.9} ${x + w} ${y}`} fill="none" stroke={c.outline} strokeWidth={sw} strokeLinecap="round" />;
  }
}

function Cheeks({ xs, y, rx, c }: { xs: [number, number]; y: number; rx: number; c: SkinColors }) {
  return (
    <g fill={c.cheek} opacity=".7">
      {xs.map((x) => <ellipse key={x} cx={x} cy={y} rx={rx} ry={rx * 0.62} />)}
    </g>
  );
}

/* ---------- Etapas ---------- */

function Tadpole({ c, mood }: { c: SkinColors; mood: Mood }) {
  return (
    <g>
      <g className="bubbles" fill="none" stroke="#ffffff" strokeWidth="2" opacity=".9">
        <circle cx="58" cy="72" r="6" /><circle cx="70" cy="50" r="3.5" /><circle cx="54" cy="36" r="2.5" />
      </g>
      <g className="tail">
        <path d="M150 124 C178 100 198 150 228 118 C216 162 182 164 148 154 Z" fill={c.dark} stroke={c.outline} strokeWidth="3" strokeLinejoin="round" />
      </g>
      <ellipse cx="110" cy="132" rx="54" ry="48" fill={c.main} stroke={c.outline} strokeWidth="3" />
      <ellipse cx="104" cy="150" rx="34" ry="22" fill={c.belly} />
      <Eyes xs={[90, 130]} y={114} r={13} mood={mood} c={c} />
      <Cheeks xs={[74, 146]} y={138} rx={8} c={c} />
      <Mouth x={110} y={142} w={9} mood={mood} c={c} />
    </g>
  );
}

function Froglet({ c, mood }: { c: SkinColors; mood: Mood }) {
  return (
    <g>
      <g className="tail">
        <path d="M150 176 C176 166 194 186 214 168 C206 196 176 200 146 194 Z" fill={c.dark} stroke={c.outline} strokeWidth="3" strokeLinejoin="round" />
      </g>
      <ellipse cx="84" cy="204" rx="17" ry="10" fill={c.main} stroke={c.outline} strokeWidth="3" />
      <ellipse cx="146" cy="204" rx="17" ry="10" fill={c.main} stroke={c.outline} strokeWidth="3" />
      <ellipse cx="115" cy="172" rx="46" ry="34" fill={c.main} stroke={c.outline} strokeWidth="3" />
      <ellipse cx="115" cy="180" rx="28" ry="20" fill={c.belly} />
      <ellipse cx="115" cy="124" rx="58" ry="40" fill={c.main} stroke={c.outline} strokeWidth="3" />
      <circle cx="90" cy="92" r="20" fill={c.main} stroke={c.outline} strokeWidth="3" />
      <circle cx="140" cy="92" r="20" fill={c.main} stroke={c.outline} strokeWidth="3" />
      <ellipse cx="115" cy="114" rx="50" ry="22" fill={c.main} />
      <Eyes xs={[90, 140]} y={92} r={13} mood={mood} c={c} />
      <circle cx="110" cy="114" r="1.8" fill={c.outline} /><circle cx="120" cy="114" r="1.8" fill={c.outline} />
      <Cheeks xs={[76, 154]} y={130} rx={9} c={c} />
      <Mouth x={115} y={130} w={13} mood={mood} c={c} />
    </g>
  );
}

function Adult({ c, mood, spots, sage, gid }: { c: SkinColors; mood: Mood; spots?: boolean; sage?: boolean; gid?: string }) {
  return (
    <g>
      {sage && (
        <g>
          <defs>
            <radialGradient id={`${gid}-aura`}>
              <stop offset="0" stopColor="#fff2a8" stopOpacity=".9" />
              <stop offset="1" stopColor="#fff2a8" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="120" cy="140" r="110" fill={`url(#${gid}-aura)`} />
          <g fill="#ffd84a" className="twinkle-group">
            <path d="M34 70 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4z" className="twinkle" />
            <path d="M206 96 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z" className="twinkle" style={{ animationDelay: '.8s' }} />
            <path d="M196 30 l2.5 6 6 2.5 -6 2.5 -2.5 6 -2.5 -6 -6 -2.5 6 -2.5z" className="twinkle" style={{ animationDelay: '1.6s' }} />
          </g>
        </g>
      )}
      {/* patas traseras */}
      <ellipse cx="64" cy="198" rx="28" ry="18" fill={c.main} stroke={c.outline} strokeWidth="3" />
      <ellipse cx="176" cy="198" rx="28" ry="18" fill={c.main} stroke={c.outline} strokeWidth="3" />
      <ellipse cx="52" cy="214" rx="20" ry="7" fill={c.dark} stroke={c.outline} strokeWidth="3" />
      <ellipse cx="188" cy="214" rx="20" ry="7" fill={c.dark} stroke={c.outline} strokeWidth="3" />
      {/* cuerpo */}
      <ellipse cx="120" cy="170" rx="58" ry="44" fill={c.main} stroke={c.outline} strokeWidth="3" />
      {spots && (
        <g fill={c.spots} opacity=".7">
          <circle cx="80" cy="160" r="6" /><circle cx="162" cy="168" r="5" /><circle cx="156" cy="150" r="3.5" /><circle cx="72" cy="178" r="3" />
        </g>
      )}
      <ellipse cx="120" cy="182" rx="38" ry="27" fill={c.belly} />
      {/* brazos */}
      <ellipse cx="98" cy="208" rx="13" ry="9" fill={c.main} stroke={c.outline} strokeWidth="3" />
      <ellipse cx="142" cy="208" rx="13" ry="9" fill={c.main} stroke={c.outline} strokeWidth="3" />
      {/* cabeza */}
      <ellipse cx="120" cy="114" rx="72" ry="48" fill={c.main} stroke={c.outline} strokeWidth="3" />
      <circle cx="84" cy="76" r="26" fill={c.main} stroke={c.outline} strokeWidth="3" />
      <circle cx="156" cy="76" r="26" fill={c.main} stroke={c.outline} strokeWidth="3" />
      <ellipse cx="120" cy="104" rx="62" ry="30" fill={c.main} />
      <Eyes xs={[84, 156]} y={76} r={17} mood={mood} c={c} />
      <circle cx="113" cy="104" r="2.2" fill={c.outline} /><circle cx="127" cy="104" r="2.2" fill={c.outline} />
      <Cheeks xs={[68, 172]} y={122} rx={11} c={c} />
      <Mouth x={120} y={122} w={20} mood={mood} c={c} />
    </g>
  );
}

/**
 * Escena a sangre (el fondo rellena cualquier proporción) con la rana encima.
 * Úsalo en contenedores no cuadrados.
 */
export function FrogScene({ className, ...props }: FrogProps) {
  const id = useId().replace(/:/g, '');
  return (
    <div className={`relative overflow-hidden ${className ?? ''}`}>
      <svg viewBox="0 0 240 240" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 w-full h-full" aria-hidden="true">
        <Scene id={props.equipped?.background ?? 'bg-pond'} uid={`s${id}`} />
      </svg>
      <Frog {...props} scene={false} align="bottom" className="absolute inset-x-0 bottom-[4%] top-[6%] w-full h-[90%]" />
    </div>
  );
}
