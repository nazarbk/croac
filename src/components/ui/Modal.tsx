import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/cn';
import { IconButton } from './Button';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** Impide cerrar con Esc o clic fuera (onboarding, revisión diaria). */
  dismissable?: boolean;
  className?: string;
}

const widths = { sm: 'sm:max-w-sm', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl' };

/** Diálogo accesible. En móvil se comporta como hoja inferior. */
export function Modal({ open, onClose, title, children, footer, size = 'md', dismissable = true, className }: ModalProps) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissable) {
        e.stopPropagation();
        onClose();
      }
      if (e.key === 'Tab' && panel.current) {
        const f = panel.current.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey, true);
    const t = setTimeout(() => {
      const target = panel.current?.querySelector<HTMLElement>('[data-autofocus]') ?? panel.current;
      target?.focus();
    }, 10);
    document.body.style.overflow = 'hidden';
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = '';
      prev?.focus?.();
    };
  }, [open, dismissable, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6">
      <div
        className="absolute inset-0 bg-[#04100c]/45 dark:bg-black/65 backdrop-blur-[2px] animate-fade-in"
        onClick={dismissable ? onClose : undefined}
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={cn(
          'relative w-full bg-raised text-ink shadow-float animate-pop-in outline-none border border-line/60',
          'rounded-t-[1.75rem] sm:rounded-[1.75rem] max-h-[92dvh] flex flex-col',
          widths[size], className,
        )}
      >
        {(title || dismissable) && (
          <div className="flex items-start justify-between gap-3 px-5 pt-5 sm:px-6">
            <div className="font-display text-xl font-bold leading-tight pt-1">{title}</div>
            {dismissable && <IconButton icon="x" label="Cerrar" onClick={onClose} className="-mr-2 -mt-1" />}
          </div>
        )}
        <div className="overflow-y-auto px-5 sm:px-6 pb-5 pt-3 flex-1">{children}</div>
        {footer && <div className="px-5 sm:px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-line flex gap-2 justify-end">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
