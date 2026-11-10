/**
 * Complementos dibujados en coordenadas locales:
 *  - Sombreros: origen = centro de la base del sombrero (apoyado en la cabeza).
 *  - Cuello: origen = centro del cuello.
 *  - Gafas: origen = punto medio entre los ojos; ojos en x = ±36.
 * Cada etapa de la rana define dónde está cada ancla y a qué escala.
 */
const O = '#2a2a33'; // contorno de los complementos

export function Hat({ id }: { id: string }) {
  switch (id) {
    case 'hat-party':
      return (
        <g>
          <path d="M-24 2 L0 -60 L24 2 Z" fill="#ff7aa8" stroke={O} strokeWidth="3" strokeLinejoin="round" />
          <path d="M-15 -22 L15 -22 M-8 -40 L8 -40" stroke="#ffe066" strokeWidth="5" strokeLinecap="round" />
          <circle cx="0" cy="-62" r="7" fill="#ffe066" stroke={O} strokeWidth="3" />
        </g>
      );
    case 'hat-flower':
      return (
        <g transform="translate(-4 -12)">
          <path d="M0 10 Q4 0 2 -6" stroke="#2f7a3d" strokeWidth="3" fill="none" />
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx="0" cy="-16" rx="7" ry="10" fill="#fff2f7" stroke={O} strokeWidth="2.5" transform={`rotate(${a} 0 -6)`} />
          ))}
          <circle cx="0" cy="-6" r="6" fill="#ffc93c" stroke={O} strokeWidth="2.5" />
        </g>
      );
    case 'hat-cap':
      return (
        <g>
          <path d="M-30 2 Q-30 -34 0 -36 Q30 -34 30 2 Z" fill="#e2574c" stroke={O} strokeWidth="3" strokeLinejoin="round" />
          <path d="M8 -2 Q40 -8 56 4 Q34 10 6 6 Z" fill="#b8392f" stroke={O} strokeWidth="3" strokeLinejoin="round" />
          <circle cx="0" cy="-36" r="4" fill="#fff" stroke={O} strokeWidth="2" />
          <path d="M-12 -18 Q0 -26 12 -18" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      );
    case 'hat-beanie':
      return (
        <g>
          <path d="M-32 0 Q-34 -42 0 -44 Q34 -42 32 0 Z" fill="#4a7bd1" stroke={O} strokeWidth="3" strokeLinejoin="round" />
          <rect x="-36" y="-10" width="72" height="16" rx="7" fill="#f0f3fb" stroke={O} strokeWidth="3" />
          {[-24, -12, 0, 12, 24].map((x) => (
            <line key={x} x1={x} y1="-6" x2={x} y2="2" stroke="#b9c6e6" strokeWidth="2.5" />
          ))}
          <circle cx="0" cy="-48" r="10" fill="#f0f3fb" stroke={O} strokeWidth="3" />
        </g>
      );
    case 'hat-beret':
      return (
        <g transform="rotate(-10)">
          <ellipse cx="0" cy="-12" rx="36" ry="14" fill="#2c3e66" stroke={O} strokeWidth="3" />
          <path d="M0 -26 L2 -34" stroke={O} strokeWidth="4" strokeLinecap="round" />
        </g>
      );
    case 'hat-tophat':
      return (
        <g>
          <rect x="-24" y="-60" width="48" height="58" rx="4" fill="#26262e" stroke={O} strokeWidth="3" />
          <rect x="-24" y="-20" width="48" height="10" fill="#d9534a" />
          <rect x="-38" y="-6" width="76" height="9" rx="4.5" fill="#26262e" stroke={O} strokeWidth="3" />
          <path d="M-16 -54 L-16 -28" stroke="#4a4a56" strokeWidth="4" strokeLinecap="round" />
        </g>
      );
    case 'hat-wizard':
      return (
        <g>
          <path d="M-24 -2 L4 -84 Q8 -90 12 -82 L26 -2 Z" fill="#6f4bd1" stroke={O} strokeWidth="3" strokeLinejoin="round" />
          <ellipse cx="0" cy="0" rx="42" ry="9" fill="#5a3bb3" stroke={O} strokeWidth="3" />
          <path d="M0 -40 l3 6 6 1 -5 4 1 6 -5 -3 -5 3 1 -6 -5 -4 6 -1z" fill="#ffe066" />
          <circle cx="12" cy="-20" r="3" fill="#ffe066" />
          <circle cx="-8" cy="-14" r="2" fill="#ffe066" />
        </g>
      );
    case 'hat-crown':
      return (
        <g>
          <path d="M-30 2 L-32 -32 L-16 -16 L0 -40 L16 -16 L32 -32 L30 2 Z" fill="#ffcf33" stroke={O} strokeWidth="3" strokeLinejoin="round" />
          <circle cx="0" cy="-12" r="5" fill="#e2574c" stroke={O} strokeWidth="2" />
          <circle cx="-18" cy="-8" r="3.5" fill="#4f9be0" stroke={O} strokeWidth="2" />
          <circle cx="18" cy="-8" r="3.5" fill="#4f9be0" stroke={O} strokeWidth="2" />
        </g>
      );
    case 'hat-astronaut':
      return (
        <g>
          <path d="M-56 30 Q-60 -64 0 -66 Q60 -64 56 30" fill="rgba(200,230,255,.35)" stroke="#dfe8f2" strokeWidth="7" />
          <path d="M-30 -44 Q-20 -54 -6 -56" stroke="#fff" strokeWidth="5" fill="none" strokeLinecap="round" opacity=".8" />
          <circle cx="0" cy="-70" r="6" fill="#e2574c" stroke={O} strokeWidth="2.5" />
        </g>
      );
    default:
      return null;
  }
}

export function NeckItem({ id }: { id: string }) {
  switch (id) {
    case 'neck-tie':
      return (
        <g>
          <path d="M-8 -2 L8 -2 L6 9 L-6 9 Z" fill="#2f5fb3" stroke={O} strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M-6 9 L6 9 L11 40 L0 50 L-11 40 Z" fill="#3b74d4" stroke={O} strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M-5 20 L6 15 M-8 32 L8 25" stroke="#9fc1f5" strokeWidth="3" />
        </g>
      );
    case 'neck-bowtie':
      return (
        <g>
          <path d="M0 2 L-24 -12 L-24 16 Z" fill="#e2574c" stroke={O} strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M0 2 L24 -12 L24 16 Z" fill="#e2574c" stroke={O} strokeWidth="2.5" strokeLinejoin="round" />
          <circle cx="-14" cy="0" r="2.5" fill="#fff" />
          <circle cx="14" cy="4" r="2.5" fill="#fff" />
          <rect x="-6" y="-4" width="12" height="12" rx="4" fill="#b8392f" stroke={O} strokeWidth="2.5" />
        </g>
      );
    case 'neck-scarf':
      return (
        <g>
          <rect x="16" y="2" width="16" height="40" rx="5" fill="#f2b33d" stroke={O} strokeWidth="2.5" />
          <path d="M18 30 L30 30" stroke="#e2574c" strokeWidth="5" />
          <rect x="-46" y="-9" width="92" height="18" rx="9" fill="#f2b33d" stroke={O} strokeWidth="2.5" />
          <path d="M-30 -8 L-30 8 M-10 -8 L-10 8 M10 -8 L10 8 M30 -8 L30 8" stroke="#e2574c" strokeWidth="5" />
        </g>
      );
    case 'neck-bandana':
      return (
        <g>
          <path d="M-40 -6 L40 -6 L0 32 Z" fill="#d9534a" stroke={O} strokeWidth="2.5" strokeLinejoin="round" />
          <circle cx="-16" cy="2" r="2.5" fill="#fff" /><circle cx="14" cy="4" r="2.5" fill="#fff" />
          <circle cx="0" cy="16" r="2.5" fill="#fff" /><circle cx="0" cy="0" r="2" fill="#fff" />
        </g>
      );
    case 'neck-medal':
      return (
        <g>
          <path d="M-18 -6 L-4 26 M18 -6 L4 26" stroke="#3b74d4" strokeWidth="8" strokeLinecap="round" />
          <circle cx="0" cy="34" r="13" fill="#ffcf33" stroke={O} strokeWidth="2.5" />
          <path d="M0 26 l2.6 5.4 5.9 .8 -4.3 4.1 1 5.9 -5.2 -2.8 -5.2 2.8 1 -5.9 -4.3 -4.1 5.9 -.8z" fill="#f7a400" />
        </g>
      );
    case 'neck-pearls':
      return (
        <g>
          {Array.from({ length: 11 }, (_, i) => {
            const a = Math.PI * (0.1 + (0.8 * i) / 10);
            return <circle key={i} cx={-Math.cos(a) * 42} cy={Math.sin(a) * 18 - 4} r="5.5" fill="#fbf7ee" stroke="#b9ad93" strokeWidth="1.5" />;
          })}
        </g>
      );
    default:
      return null;
  }
}

export function EyesItem({ id }: { id: string }) {
  switch (id) {
    case 'eyes-round':
      return (
        <g fill="rgba(255,255,255,.18)" stroke="#3a2a1e" strokeWidth="4">
          <circle cx="-36" cy="0" r="21" />
          <circle cx="36" cy="0" r="21" />
          <path d="M-15 -2 Q0 -10 15 -2" fill="none" />
        </g>
      );
    case 'eyes-sun':
      return (
        <g stroke={O} strokeWidth="3.5" strokeLinejoin="round">
          <path d="M-60 -10 L-14 -10 L-16 10 Q-36 22 -56 10 Z" fill="#22252e" />
          <path d="M14 -10 L60 -10 L56 10 Q36 22 16 10 Z" fill="#22252e" />
          <path d="M-14 -8 L14 -8" fill="none" />
          <path d="M-48 -4 L-38 -4 M24 -4 L34 -4" stroke="#7d8597" strokeWidth="3" strokeLinecap="round" />
        </g>
      );
    case 'eyes-heart':
      return (
        <g stroke={O} strokeWidth="3" strokeLinejoin="round" fill="#ff6b9a" fillOpacity=".85">
          <path d="M-36 16 L-56 -2 Q-62 -16 -48 -20 Q-40 -21 -36 -12 Q-32 -21 -24 -20 Q-10 -16 -16 -2 Z" />
          <path d="M36 16 L16 -2 Q10 -16 24 -20 Q32 -21 36 -12 Q40 -21 48 -20 Q62 -16 56 -2 Z" />
          <path d="M-16 -6 L16 -6" fill="none" />
        </g>
      );
    case 'eyes-monocle':
      return (
        <g>
          <circle cx="36" cy="0" r="21" fill="rgba(255,255,255,.2)" stroke="#d4a017" strokeWidth="4.5" />
          <path d="M55 8 Q66 40 52 70" stroke="#d4a017" strokeWidth="2.5" fill="none" strokeDasharray="4 3" />
        </g>
      );
    default:
      return null;
  }
}
