import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Frog } from '../../components/frog/Frog';
import { patioArt } from '../../components/frog/community';
import { Button } from '../../components/ui/Button';
import { Icon, type IconName } from '../../components/ui/Icon';
import { PATIO, type PatioSlot } from '../../domain/patio';
import { cn } from '../../lib/cn';
import { CANVAS_SIZE, cropDrawing, floodFill, hexToRgba, toImageBlob } from './drawing';

/**
 * Lienzo del patio: pincel, goma y cubo; tamaños y colores; deshacer. A la derecha (o
 * debajo, en el móvil) la rana lleva el dibujo mientras lo haces, tal y como se verá.
 */

type Tool = 'brush' | 'eraser' | 'fill';
const SIZES = [4, 9, 16, 28];
const COLORS = [
  '#1f2937', '#ffffff', '#ef4444', '#f97316', '#facc15', '#84cc16', '#22c55e', '#14b8a6',
  '#0ea5e9', '#3b82f6', '#8b5cf6', '#ec4899', '#a16207', '#94a3b8',
];
const SLOTS: { id: PatioSlot; label: string; hint: string }[] = [
  { id: 'hat', label: 'Cabeza', hint: 'Dibuja el gorro con su base abajo: se apoya entre los ojos de la rana.' },
  { id: 'neck', label: 'Cuello', hint: 'Dibuja lo que cuelga del cuello con la parte de arriba en la barbilla.' },
  { id: 'eyes', label: 'Gafas', hint: 'Dibuja las gafas alrededor de los dos ojos de la plantilla, de lado a lado.' },
];
const UNDO_MAX = 20;

export interface DrawingResult { slot: PatioSlot; name: string; ratio: number; image: Blob }

export function DrawingEditor({ level, onCancel, onPublish }: {
  level: number;
  onCancel: () => void;
  onPublish: (r: DrawingResult) => Promise<void>;
}) {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const [slot, setSlot] = useState<PatioSlot>('hat');
  const [tool, setTool] = useState<Tool>('brush');
  const [size, setSize] = useState(SIZES[1]);
  const [color, setColor] = useState(COLORS[2]);
  const [name, setName] = useState('');
  const [preview, setPreview] = useState<{ href: string; ratio: number } | null>(null);
  const [undo, setUndo] = useState<ImageData[]>([]);
  const [redo, setRedo] = useState<ImageData[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stroke = useRef<{ last: [number, number] } | null>(null);

  const ctx = () => canvas.current!.getContext('2d', { willReadFrequently: true })!;
  const snapshot = () => ctx().getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  const pushUndo = () => {
    setUndo((u) => [...u.slice(-(UNDO_MAX - 1)), snapshot()]);
    setRedo([]);
  };
  /** Al terminar cada trazo: la rana de la derecha se pone el dibujo. */
  const refresh = () => {
    const c = cropDrawing(canvas.current!);
    setPreview(c ? { href: c.canvas.toDataURL('image/png'), ratio: c.ratio } : null);
  };

  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault();
    const el = canvas.current;
    el?.addEventListener('touchmove', prevent, { passive: false });
    return () => el?.removeEventListener('touchmove', prevent);
  }, []);

  const toCanvas = (e: { clientX: number; clientY: number }): [number, number] => {
    const r = canvas.current!.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * CANVAS_SIZE, ((e.clientY - r.top) / r.height) * CANVAS_SIZE];
  };

  const line = (a: [number, number], b: [number, number]) => {
    const c = ctx();
    c.save();
    c.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    c.strokeStyle = color;
    c.fillStyle = color;
    c.lineWidth = size;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.beginPath();
    c.moveTo(a[0], a[1]);
    c.lineTo(b[0], b[1]);
    c.stroke();
    c.restore();
  };

  const onDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = toCanvas(e);
    pushUndo();
    if (tool === 'fill') {
      const img = snapshot();
      if (floodFill(img, p[0], p[1], hexToRgba(color))) ctx().putImageData(img, 0, 0);
      refresh();
      return;
    }
    stroke.current = { last: p };
    line(p, [p[0] + 0.01, p[1]]);
  };
  const onMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const s = stroke.current;
    if (!s) return;
    const events = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent];
    for (const ev of events) {
      const p = toCanvas(ev);
      line(s.last, p);
      s.last = p;
    }
  };
  const onUp = () => {
    if (!stroke.current) return;
    stroke.current = null;
    refresh();
  };

  const doUndo = () => {
    const prev = undo[undo.length - 1];
    if (!prev) return;
    setRedo((r) => [...r, snapshot()]);
    setUndo((u) => u.slice(0, -1));
    ctx().putImageData(prev, 0, 0);
    refresh();
  };
  const doRedo = () => {
    const next = redo[redo.length - 1];
    if (!next) return;
    setUndo((u) => [...u, snapshot()]);
    setRedo((r) => r.slice(0, -1));
    ctx().putImageData(next, 0, 0);
    refresh();
  };
  const clear = () => {
    pushUndo();
    ctx().clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    refresh();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input')) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) doRedo();
        else doUndo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const publish = async () => {
    const c = cropDrawing(canvas.current!);
    if (!c || c.canvas.width < 16 || c.canvas.height < 8) {
      setError('Dibuja algo un poco más grande antes de publicar.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onPublish({ slot, name: name.trim(), ratio: c.ratio, image: await toImageBlob(c.canvas) });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  const previewId = `${slot}-borrador`;
  const hint = SLOTS.find((s) => s.id === slot)!.hint;
  const canPublish = !!preview && name.trim().length > 0 && !busy;

  return (
    <div className="fixed inset-0 z-50 bg-bg flex flex-col" role="dialog" aria-modal="true" aria-label="Dibujar un complemento">
      <header className="flex items-center gap-3 px-4 h-14 border-b border-line bg-surface shrink-0">
        <button type="button" onClick={onCancel} className="text-sm font-semibold text-muted hover:text-ink">Cancelar</button>
        <h2 className="font-display font-bold text-lg flex-1 text-center truncate">Tu complemento</h2>
        <Button size="sm" onClick={() => void publish()} disabled={!canPublish}>{busy ? 'Publicando…' : 'Publicar'}</Button>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Dónde se pone">
              {SLOTS.map((s) => (
                <button key={s.id} type="button" role="radio" aria-checked={slot === s.id} onClick={() => setSlot(s.id)}
                  className={cn('h-9 px-3.5 rounded-xl text-sm font-semibold border', slot === s.id ? 'bg-lily text-on-lily border-lily' : 'bg-surface border-line text-muted hover:text-ink')}>
                  {s.label}
                </button>
              ))}
            </div>
            <p className="text-[13px] text-muted mt-2">{hint}</p>

            <div className="relative mt-3 w-full max-w-[520px] aspect-square rounded-2xl border border-line overflow-hidden bg-[conic-gradient(#eef2ee_25%,#fff_0_50%,#eef2ee_0_75%,#fff_0)] bg-[length:24px_24px] dark:bg-[conic-gradient(#1d2a26_25%,#16211e_0_50%,#1d2a26_0_75%,#16211e_0)]">
              <Template slot={slot} />
              <canvas
                ref={canvas} width={CANVAS_SIZE} height={CANVAS_SIZE}
                className={cn('absolute inset-0 w-full h-full touch-none', tool === 'fill' ? 'cursor-cell' : 'cursor-crosshair')}
                onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onPointerLeave={onUp}
                aria-label="Lienzo de dibujo"
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <ToolButton icon="brush" label="Pincel" on={tool === 'brush'} onClick={() => setTool('brush')} />
              <ToolButton icon="eraser" label="Goma" on={tool === 'eraser'} onClick={() => setTool('eraser')} />
              <ToolButton icon="bucket" label="Rellenar" on={tool === 'fill'} onClick={() => setTool('fill')} />
              <span className="w-px h-7 bg-line mx-1" aria-hidden />
              {SIZES.map((s) => (
                <button key={s} type="button" onClick={() => setSize(s)} aria-label={`Grosor ${s}`} aria-pressed={size === s}
                  className={cn('w-9 h-9 rounded-xl border grid place-items-center', size === s ? 'border-lily bg-lily-soft' : 'border-line bg-surface')}>
                  <span className="rounded-full bg-ink" style={{ width: 4 + s / 2.2, height: 4 + s / 2.2 }} />
                </button>
              ))}
              <span className="w-px h-7 bg-line mx-1" aria-hidden />
              <ToolButton icon="undo" label="Deshacer" onClick={doUndo} disabled={!undo.length} />
              <ToolButton icon="redo" label="Rehacer" onClick={doRedo} disabled={!redo.length} />
              <ToolButton icon="trash" label="Borrar todo" onClick={clear} disabled={!preview} />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Color">
              {COLORS.map((c) => (
                <button key={c} type="button" role="radio" aria-checked={color === c} aria-label={c} onClick={() => { setColor(c); if (tool === 'eraser') setTool('brush'); }}
                  className={cn('w-8 h-8 rounded-full border-2', color === c ? 'border-lily ring-2 ring-lily/30' : 'border-black/10')} style={{ background: c }} />
              ))}
              <label className="w-8 h-8 rounded-full border-2 border-dashed border-line grid place-items-center cursor-pointer relative overflow-hidden" title="Otro color">
                <Icon name="plus" size={14} />
                <input type="color" value={color} onChange={(e) => { setColor(e.target.value); if (tool === 'eraser') setTool('brush'); }} className="absolute inset-0 opacity-0 cursor-pointer" />
              </label>
            </div>
          </div>

          <aside className="space-y-3">
            <div className="rounded-2xl border border-line bg-surface p-3">
              <div className="text-sm font-semibold mb-2">Así queda</div>
              <div className="aspect-square rounded-xl bg-surface-2 overflow-hidden">
                <Frog level={level} mood="happy" className="w-full h-full"
                  equipped={preview ? { [slot]: previewId } : {}}
                  itemArt={preview ? { [previewId]: patioArt(slot, preview.ratio) } : undefined}
                  itemHref={preview ? { [previewId]: preview.href } : undefined} />
              </div>
            </div>
            <label className="block">
              <span className="text-sm font-semibold">Nombre</span>
              <input value={name} maxLength={PATIO.nameMax} onChange={(e) => setName(e.target.value)} placeholder="Gorro de pirata"
                className="mt-1.5 w-full h-11 px-3.5 rounded-xl bg-surface border border-line focus:outline-none focus:border-lily" />
            </label>
            <p className="text-[13px] text-muted leading-snug">
              Al publicar se usa tu lienzo y el dibujo aparece en el patio para que todos lo voten hasta el domingo. Dibuja algo tuyo y apto para todo el mundo: se puede denunciar y ocultar.
            </p>
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button className="w-full" onClick={() => void publish()} disabled={!canPublish}>{busy ? 'Publicando…' : 'Publicar en el patio'}</Button>
          </aside>
        </div>
      </div>
    </div>
  );
}

function ToolButton({ icon, label, on, onClick, disabled }: { icon: IconName; label: string; on?: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label} aria-pressed={on}
      className={cn('w-10 h-10 rounded-xl border grid place-items-center disabled:opacity-35', on ? 'bg-lily text-on-lily border-lily' : 'bg-surface border-line hover:border-lily/50')}>
      <Icon name={icon} size={19} />
    </button>
  );
}

/** Plantilla tenue (no se guarda): dónde queda la rana respecto a lo que dibujas. */
function Template({ slot }: { slot: PatioSlot }) {
  const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 3, strokeDasharray: '10 8' };
  return (
    <svg viewBox="0 0 512 512" className="absolute inset-0 w-full h-full text-lily/40 pointer-events-none" aria-hidden>
      {slot === 'hat' && <>
        {/* Si el gorro ocupa todo el ancho, los ojos de la rana quedan así, abajo en las esquinas. */}
        <circle cx="40" cy="560" r="110" {...stroke} />
        <circle cx="472" cy="560" r="110" {...stroke} />
      </>}
      {slot === 'neck' && <path d="M40 -10 Q256 90 472 -10" {...stroke} />}
      {slot === 'eyes' && <>
        <circle cx="125" cy="256" r="62" {...stroke} />
        <circle cx="387" cy="256" r="62" {...stroke} />
      </>}
    </svg>
  );
}
