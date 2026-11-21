import type { ItemArt } from '../../components/frog/art';
import type { AccSlot } from '../../components/frog/layout';

/**
 * PNG de prueba cargado desde el ordenador. Se lee con URL.createObjectURL: no sale del
 * navegador ni se sube a ningún servidor. Sus límites visibles se miden una sola vez al
 * cargarlo (no en cada render).
 */
export interface LocalItem {
  id: string;
  name: string;
  href: string;
  size: [number, number];
  art: ItemArt;
}

/** Valores de partida razonables por hueco (luego se ajustan en el probador). */
export const SLOT_DEFAULTS: Record<AccSlot, Pick<ItemArt, 'w' | 'ax' | 'ay'>> = {
  hat: { w: 0.62, ax: 0.5, ay: 0.9 },
  neck: { w: 0.5, ax: 0.5, ay: 0.1 },
  eyes: { w: 1.96, ax: 0.5, ay: 0.5 },
};

/** Lee la imagen y mide la parte visible (alfa > 8 de 255). */
export async function loadLocalImage(file: File, slot: AccSlot, id: string): Promise<LocalItem> {
  const href = URL.createObjectURL(file);
  const img = new Image();
  img.src = href;
  await img.decode();
  const W = img.naturalWidth;
  const H = img.naturalHeight;
  // Para medir basta con una copia de hasta 1024 px de lado.
  const k = Math.min(1, 1024 / Math.max(W, H));
  const w = Math.max(1, Math.round(W * k));
  const h = Math.max(1, Math.round(H * k));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('No se pudo leer la imagen');
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) throw new Error('La imagen es completamente transparente');
  const r4 = (v: number) => Math.round(v * 10000) / 10000;
  const bounds: [number, number, number, number] = [r4(x0 / w), r4(y0 / h), r4((x1 + 1) / w), r4((y1 + 1) / h)];
  const visW = (bounds[2] - bounds[0]) * W;
  const visH = (bounds[3] - bounds[1]) * H;
  const full = bounds[0] === 0 && bounds[1] === 0 && bounds[2] === 1 && bounds[3] === 1;
  return {
    id, name: file.name, href, size: [W, H],
    art: { ratio: r4(visH / visW), ...SLOT_DEFAULTS[slot], ...(full ? {} : { bounds }) },
  };
}

/** Línea lista para pegar en ITEM_ART (src/components/frog/art.ts). */
export function artSnippet(id: string, a: ItemArt): string {
  const parts = [`ratio: ${a.ratio}`, `w: ${a.w}`, `ax: ${a.ax}`, `ay: ${a.ay}`];
  if (a.bounds) parts.push(`bounds: [${a.bounds.join(', ')}]`);
  return `  '${id}': { ${parts.join(', ')} },`;
}
