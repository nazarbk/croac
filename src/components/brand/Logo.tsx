import { useId } from 'react';
import { cn } from '../../lib/cn';

/**
 * Marca de Croac: cara de rana sobre un nenúfar degradado.
 * Es el mismo dibujo que los iconos de la app (public/icons), así la marca es coherente.
 */
export function LogoMark({ className, title = 'Croac' }: { className?: string; title?: string }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 512 512" className={className} role="img" aria-label={title}>
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#62d283" />
          <stop offset="1" stopColor="#1c8448" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="120" fill={`url(#${id}-bg)`} />
      <g fill="#ecfad6">
        <circle cx="168" cy="196" r="74" />
        <circle cx="344" cy="196" r="74" />
        <ellipse cx="256" cy="304" rx="176" ry="122" />
      </g>
      <g fill="#123a2b">
        <circle cx="176" cy="200" r="36" />
        <circle cx="336" cy="200" r="36" />
      </g>
      <g fill="#fff">
        <circle cx="190" cy="186" r="12" />
        <circle cx="350" cy="186" r="12" />
      </g>
      <g fill="#ff93a3" opacity=".85">
        <ellipse cx="142" cy="320" rx="28" ry="17" />
        <ellipse cx="370" cy="320" rx="28" ry="17" />
      </g>
      <path d="M192 316 Q256 372 320 316" fill="none" stroke="#123a2b" strokeWidth="22" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark className="w-9 h-9 drop-shadow-sm" />
      <span className="font-display text-[1.6rem] leading-none font-extrabold tracking-tight">Croac</span>
    </span>
  );
}
