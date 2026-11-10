import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';

/** Props que se esparcen sobre el "asa" de arrastre de cada elemento. */
export interface DragHandleProps {
  onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void;
  onKeyDown: (e: ReactKeyboardEvent<HTMLElement>) => void;
  'aria-label': string;
  'aria-roledescription': string;
}

interface DragState {
  id: string;
  from: number;
  to: number;
  dy: number;
}

interface Measure {
  startPageY: number;
  tops: number[];
  heights: number[];
  gap: number;
  lastClientY: number;
}

interface SortableListProps<T> {
  items: T[];
  getId: (item: T) => string;
  onReorder: (ids: string[]) => void;
  children: (item: T, handle: DragHandleProps | undefined, state: { dragging: boolean }) => ReactNode;
  /** Etiqueta accesible del asa, p. ej. el título de la tarea. */
  getLabel?: (item: T) => string;
  disabled?: boolean;
  className?: string;
}

const EDGE = 96; // px desde el borde de la ventana en los que se hace scroll automático
const BOTTOM_BAR = 80; // barra inferior en móvil

function move<T>(arr: T[], from: number, to: number): T[] {
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/**
 * Lista vertical reordenable con ratón, dedo (asa con touch-action: none) y
 * teclado (flechas arriba/abajo sobre el asa). Sin dependencias.
 */
export function SortableList<T>({ items, getId, onReorder, children, getLabel, disabled, className }: SortableListProps<T>) {
  const ids = items.map(getId);
  const nodes = useRef(new Map<string, HTMLElement>());
  const [drag, setDrag] = useState<DragState | null>(null);
  const [settling, setSettling] = useState(false);
  const measure = useRef<Measure | null>(null);
  const live = useRef<{ drag: DragState | null; ids: string[] }>({ drag: null, ids });
  live.current.ids = ids;
  live.current.drag = drag;

  useEffect(() => {
    if (!drag) return;
    let raf = 0;

    const compute = () => {
      const m = measure.current;
      const d = live.current.drag;
      if (!m || !d) return;
      const dy = m.lastClientY + window.scrollY - m.startPageY;
      const center = m.tops[d.from] + dy + m.heights[d.from] / 2;
      let to = d.from;
      for (let i = d.from + 1; i < m.tops.length; i++) if (center > m.tops[i] + m.heights[i] / 2) to = i;
      for (let i = d.from - 1; i >= 0; i--) if (center < m.tops[i] + m.heights[i] / 2) to = i;
      if (dy !== d.dy || to !== d.to) setDrag({ ...d, dy, to });
    };

    const loop = () => {
      const m = measure.current;
      if (m) {
        const bottomLimit = window.innerHeight - (window.innerWidth < 1024 ? BOTTOM_BAR : 0);
        if (m.lastClientY < EDGE) window.scrollBy(0, -Math.ceil((EDGE - m.lastClientY) / 6));
        else if (m.lastClientY > bottomLimit - EDGE) window.scrollBy(0, Math.ceil((m.lastClientY - bottomLimit + EDGE) / 6));
        compute();
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onMove = (e: PointerEvent) => {
      if (measure.current) measure.current.lastClientY = e.clientY;
      compute();
    };
    const finish = (commit: boolean) => {
      const d = live.current.drag;
      measure.current = null;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      setSettling(true);
      setDrag(null);
      if (commit && d && d.to !== d.from) onReorder(move(live.current.ids, d.from, d.to));
      requestAnimationFrame(() => requestAnimationFrame(() => setSettling(false)));
    };
    const onUp = () => finish(true);
    const onCancel = () => finish(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && finish(false);

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    window.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('keydown', onKey);
    };
    // Solo al empezar/terminar un arrastre.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag?.id]);

  const start = (id: string, e: ReactPointerEvent<HTMLElement>) => {
    if (disabled || e.button !== 0 || items.length < 2) return;
    e.preventDefault();
    const rects = ids.map((i) => nodes.current.get(i)!.getBoundingClientRect());
    const from = ids.indexOf(id);
    measure.current = {
      startPageY: e.clientY + window.scrollY,
      tops: rects.map((r) => r.top + window.scrollY),
      heights: rects.map((r) => r.height),
      gap: rects.length > 1 ? Math.max(0, rects[1].top - rects[0].bottom) : 0,
      lastClientY: e.clientY,
    };
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';
    setDrag({ id, from, to: from, dy: 0 });
  };

  const onKeyDown = (id: string, e: ReactKeyboardEvent<HTMLElement>) => {
    if (disabled || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
    e.preventDefault();
    const from = ids.indexOf(id);
    const to = e.key === 'ArrowUp' ? from - 1 : from + 1;
    if (to < 0 || to >= ids.length) return;
    onReorder(move(ids, from, to));
  };

  const m = measure.current;
  const shift = drag && m ? m.heights[drag.from] + m.gap : 0;

  return (
    <div className={className} role="list">
      {items.map((item, i) => {
        const id = ids[i];
        const isDragged = drag?.id === id;
        let ty = 0;
        if (drag && !isDragged) {
          if (drag.from < drag.to && i > drag.from && i <= drag.to) ty = -shift;
          if (drag.from > drag.to && i >= drag.to && i < drag.from) ty = shift;
        }
        return (
          <div
            key={id}
            role="listitem"
            ref={(el) => {
              if (el) nodes.current.set(id, el);
              else nodes.current.delete(id);
            }}
            style={{
              transform: isDragged ? `translate3d(0, ${drag!.dy}px, 0)` : ty ? `translate3d(0, ${ty}px, 0)` : undefined,
              transition: isDragged || settling ? 'none' : 'transform 200ms cubic-bezier(.2,.8,.3,1)',
              position: 'relative',
              zIndex: isDragged ? 30 : undefined,
            }}
          >
            {children(
              item,
              disabled
                ? undefined
                : {
                    onPointerDown: (e) => start(id, e),
                    onKeyDown: (e) => onKeyDown(id, e),
                    'aria-label': `Mover ${getLabel ? `"${getLabel(item)}"` : 'elemento'} (flechas arriba y abajo)`,
                    'aria-roledescription': 'asa para reordenar',
                  },
              { dragging: isDragged },
            )}
          </div>
        );
      })}
    </div>
  );
}
