/** Fondos de 240×240 detrás de la rana. Todos dejan el "suelo" en y≈218. */
export function Scene({ id, uid }: { id: string; uid: string }) {
  const g = (name: string) => `${uid}-${name}`;
  switch (id) {
    case 'bg-sunset':
      return (
        <g>
          <defs>
            <linearGradient id={g('sky')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffb36b" /><stop offset="1" stopColor="#f47d7d" />
            </linearGradient>
          </defs>
          <rect width="240" height="240" fill={`url(#${g('sky')})`} />
          <circle cx="170" cy="150" r="44" fill="#ffe08a" opacity=".9" />
          <rect y="168" width="240" height="72" fill="#6a7fc4" />
          <path d="M0 180 H240 M20 196 H110 M140 206 H230" stroke="#ffd29a" strokeWidth="3" opacity=".6" />
          <Reeds color="#3d4a7a" />
          <LilyPad color="#4e9b58" />
        </g>
      );
    case 'bg-night':
      return (
        <g>
          <rect width="240" height="240" fill="#1f2b5c" />
          {[[30, 30], [70, 60], [200, 40], [150, 24], [110, 80], [210, 100], [40, 110], [180, 70]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 2.2 : 1.4} fill="#fff8d6" className="twinkle" style={{ animationDelay: `${i * 0.4}s` }} />
          ))}
          <circle cx="184" cy="54" r="22" fill="#fff4c4" />
          <circle cx="194" cy="48" r="20" fill="#1f2b5c" />
          <rect y="168" width="240" height="72" fill="#22406a" />
          <path d="M150 190 H220" stroke="#fff4c4" strokeWidth="3" opacity=".35" />
          <Reeds color="#13234a" />
          <LilyPad color="#3c7d4c" />
        </g>
      );
    case 'bg-rain':
      return (
        <g>
          <rect width="240" height="240" fill="#a9bccb" />
          <ellipse cx="60" cy="40" rx="50" ry="20" fill="#d6e0e8" />
          <ellipse cx="180" cy="30" rx="56" ry="22" fill="#d6e0e8" />
          <g className="rain" stroke="#eef5fb" strokeWidth="2" strokeLinecap="round" opacity=".8">
            {Array.from({ length: 14 }, (_, i) => (
              <line key={i} x1={10 + i * 17} y1={70 + (i % 4) * 22} x2={4 + i * 17} y2={84 + (i % 4) * 22} />
            ))}
          </g>
          <rect y="168" width="240" height="72" fill="#7fa6b8" />
          <ellipse cx="50" cy="196" rx="14" ry="4" fill="none" stroke="#d6e6ee" strokeWidth="2" />
          <ellipse cx="200" cy="206" rx="18" ry="5" fill="none" stroke="#d6e6ee" strokeWidth="2" />
          <Reeds color="#4f7366" />
          <LilyPad color="#5aa063" />
        </g>
      );
    case 'bg-space':
      return (
        <g>
          <rect width="240" height="240" fill="#1b1340" />
          {Array.from({ length: 22 }, (_, i) => (
            <circle key={i} cx={(i * 53) % 240} cy={(i * 37) % 170} r={i % 4 === 0 ? 1.8 : 1} fill="#fff" className="twinkle" style={{ animationDelay: `${i * 0.25}s` }} />
          ))}
          <circle cx="44" cy="54" r="18" fill="#f08a5d" />
          <ellipse cx="44" cy="54" rx="30" ry="6" fill="none" stroke="#ffd0a8" strokeWidth="3" transform="rotate(-20 44 54)" />
          <ellipse cx="120" cy="250" rx="150" ry="52" fill="#8e7cc3" />
          <circle cx="70" cy="214" r="8" fill="#7a68ad" /><circle cx="170" cy="222" r="6" fill="#7a68ad" />
        </g>
      );
    case 'bg-pond':
    default:
      // Sigue el tema: de día en modo claro, de noche en modo oscuro.
      return (
        <g>
          <defs>
            <linearGradient id={g('sky')} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={{ stopColor: 'var(--scene-sky-1)' }} />
              <stop offset="1" style={{ stopColor: 'var(--scene-sky-2)' }} />
            </linearGradient>
          </defs>
          <rect width="240" height="240" fill={`url(#${g('sky')})`} />
          <g className="scene-night">
            {[[28, 30], [70, 58], [150, 22], [112, 74], [212, 96], [40, 104], [176, 68], [96, 36]].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.8 : 1.1} fill="#fff8d6" className="twinkle" style={{ animationDelay: `${i * 0.35}s` }} />
            ))}
            <circle cx="196" cy="44" r="17" style={{ fill: 'var(--scene-sun)' }} />
            <circle cx="205" cy="38" r="15" style={{ fill: 'var(--scene-sky-1)' }} />
          </g>
          <circle cx="196" cy="44" r="18" className="scene-day" style={{ fill: 'var(--scene-sun)' }} />
          <rect y="168" width="240" height="72" style={{ fill: 'var(--scene-water)' }} />
          <path d="M14 184 H80 M150 194 H226 M40 214 H96" style={{ stroke: 'var(--scene-ripple)' }} strokeWidth="3" strokeLinecap="round" />
          <Reeds color="var(--scene-reeds)" />
          <LilyPad color="var(--scene-pad)" />
        </g>
      );
  }
}

function LilyPad({ color }: { color: string }) {
  return (
    <g>
      <path d="M30 218 A90 17 0 1 0 210 218 A90 17 0 0 0 150 203 L120 218 L104 202 A90 17 0 0 0 30 218 Z" style={{ fill: color }} />
      <path d="M120 218 L80 228 M120 218 L160 229 M120 218 L190 216" stroke="rgba(0,0,0,.12)" strokeWidth="2" />
    </g>
  );
}

function Reeds({ color }: { color: string }) {
  return (
    <g style={{ stroke: color }} strokeWidth="4" strokeLinecap="round" fill="none">
      <path d="M14 176 Q10 130 20 96" /><path d="M24 176 Q26 140 34 116" /><path d="M6 176 Q0 150 4 128" />
      <rect x="15" y="92" width="9" height="24" rx="4.5" fill="#8a5a3b" stroke="none" transform="rotate(10 19 104)" />
      <path d="M226 176 Q232 136 222 108" /><path d="M216 176 Q212 146 206 130" />
    </g>
  );
}
