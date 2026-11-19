import { cn } from '../../lib/cn';

/** Marca de Croac: el mismo dibujo que el icono de la app (public/icons). */
export function LogoMark({ className, title = 'Croac' }: { className?: string; title?: string }) {
  return <img src={`${import.meta.env.BASE_URL}icons/icon-192.png`} alt={title} draggable={false} className={cn('rounded-[24%] object-cover', className)} />;
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark className="w-9 h-9 shadow-sm" />
      <span className="font-display text-[1.6rem] leading-none font-extrabold tracking-tight">Croac</span>
    </span>
  );
}
