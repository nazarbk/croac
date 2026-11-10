import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/cn';
import { MOBILE, useMediaQuery } from '../../lib/useMediaQuery';
import { Icon, type IconName } from './Icon';

export function ProgressBar({ value, className, tone = 'lily', label }: { value: number; className?: string; tone?: 'lily' | 'coin' | 'danger' | 'xp'; label?: string }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  const color = tone === 'coin' ? 'bg-coin' : tone === 'danger' ? 'bg-danger' : tone === 'xp' ? 'bg-xp-grad' : 'bg-lily';
  return (
    <div className={cn('h-2 rounded-full bg-line/80 overflow-hidden', className)} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={cn('h-full rounded-full transition-[width] duration-500 ease-out', color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Switch({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3.5">
      <div className="min-w-0">
        <div className="font-medium">{label}</div>
        {description && <div className="text-sm text-muted mt-0.5 leading-snug">{description}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn('relative shrink-0 w-12 h-7 rounded-full transition-colors mt-0.5', checked ? 'bg-lily' : 'bg-line')}
      >
        <span className={cn('absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-sm transition-transform', checked && 'translate-x-5')} />
      </button>
    </div>
  );
}

/** Control segmentado. En pantallas estrechas se desplaza horizontalmente en lugar de romperse. */
export function Segmented<T extends string | number>({ value, onChange, options, className, size = 'md', full }: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode; title?: string }[];
  className?: string;
  size?: 'sm' | 'md';
  /** Ocupa todo el ancho, repartido a partes iguales. */
  full?: boolean;
}) {
  return (
    <div className={cn('max-w-full overflow-x-auto scrollbar-none', full && 'w-full', className)}>
      <div className={cn('inline-flex p-1 rounded-xl bg-surface-2 border border-line gap-1', full && 'flex w-full')} role="radiogroup">
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={o.value === value}
            title={o.title}
            onClick={() => onChange(o.value)}
            className={cn(
              'rounded-lg font-medium transition-colors whitespace-nowrap inline-flex items-center justify-center gap-1.5',
              size === 'sm' ? 'px-3 h-8 text-[13px]' : 'px-3.5 h-9 text-sm',
              full && 'flex-1',
              o.value === value ? 'bg-raised text-ink shadow-card' : 'text-muted hover:text-ink',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Field({ label, children, hint, className }: { label: string; children: ReactNode; hint?: ReactNode; className?: string }) {
  return (
    <div className={cn('block min-w-0', className)}>
      <div className="text-sm font-semibold mb-2">{label}</div>
      {children}
      {hint && <div className="text-[13px] text-muted mt-2 leading-snug">{hint}</div>}
    </div>
  );
}

export const inputClass =
  'w-full h-11 sm:h-10 px-3.5 rounded-xl bg-surface-2 border border-line text-ink placeholder:text-muted/70 focus:outline-none focus:border-lily focus:ring-4 focus:ring-lily/15 transition-shadow';

export function EmptyState({ title, children, action, art }: { title: string; children?: ReactNode; action?: ReactNode; art?: ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center py-10 px-6">
      {art}
      <div className="font-display text-lg font-bold mt-3">{title}</div>
      {children && <p className="text-muted mt-1.5 max-w-sm text-[15px] leading-relaxed">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export interface MenuItem {
  label: string;
  icon?: IconName;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
}

/**
 * Menú contextual. En escritorio, desplegable (se abre hacia arriba si no
 * cabe); en móvil, hoja inferior con botones grandes.
 */
export function Menu({ trigger, items, align = 'right', title }: {
  trigger: (props: { onClick: () => void; 'aria-expanded': boolean; 'aria-haspopup': 'menu' }) => ReactNode;
  items: MenuItem[];
  align?: 'left' | 'right';
  /** Encabezado de la hoja en móvil (p. ej. el título de la tarea). */
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const sheet = useMediaQuery(MOBILE);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!sheet && !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open, sheet]);

  const toggle = () => {
    if (!open && ref.current) {
      const r = ref.current.getBoundingClientRect();
      setUp(window.innerHeight - r.bottom < 60 + items.length * 44);
    }
    setOpen((o) => !o);
  };

  const list = (big: boolean) =>
    items.map((it) => (
      <button
        key={it.label}
        role="menuitem"
        type="button"
        disabled={it.disabled}
        onClick={() => { setOpen(false); it.onSelect(); }}
        className={cn(
          'w-full flex items-center gap-3 text-left hover:bg-surface-2 active:bg-surface-2 disabled:opacity-40 transition-colors',
          big ? 'h-13 px-5 text-base' : 'h-10 px-3.5 text-[15px] rounded-lg',
          it.danger ? 'text-danger' : 'text-ink',
        )}
      >
        {it.icon && <Icon name={it.icon} size={big ? 20 : 17} className={it.danger ? '' : 'text-muted'} />}
        {it.label}
      </button>
    ));

  return (
    <div className="relative" ref={ref}>
      {trigger({ onClick: toggle, 'aria-expanded': open, 'aria-haspopup': 'menu' })}
      {open && !sheet && (
        <div
          role="menu"
          className={cn(
            'absolute z-40 min-w-52 p-1.5 rounded-2xl bg-raised border border-line shadow-float animate-pop-in',
            align === 'right' ? 'right-0' : 'left-0',
            up ? 'bottom-full mb-1.5' : 'top-full mt-1.5',
          )}
        >
          {list(false)}
        </div>
      )}
      {open && sheet && createPortal(
        <div className="fixed inset-0 z-[70] flex items-end">
          <div className="absolute inset-0 bg-[#050b0d]/50 animate-fade-in" onClick={() => setOpen(false)} />
          <div role="menu" className="relative w-full rounded-t-[1.75rem] bg-raised shadow-float animate-pop-in pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-line" aria-hidden="true" />
            {title && <div className="px-5 pt-1 pb-2 text-sm text-muted font-medium truncate">{title}</div>}
            {list(true)}
            <div className="px-4 pt-2">
              <button type="button" onClick={() => setOpen(false)} className="w-full h-12 rounded-2xl bg-surface-2 font-semibold">Cancelar</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
