/**
 * Utilidades del lienzo del patio (sin React): relleno con cubo, recorte a la parte
 * dibujada y exportación a imagen. Todo en el propio navegador.
 */

export const CANVAS_SIZE = 512;
const MAX_OUT = 480;

export function hexToRgba(hex: string): [number, number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
}

/**
 * Cubo de pintura: rellena la zona contigua del mismo color (incluido el transparente).
 * Relleno por líneas con pila, para no desbordar la pila de llamadas.
 */
export function floodFill(img: ImageData, x0: number, y0: number, color: [number, number, number, number], tolerance = 48): boolean {
  const { width: W, height: H, data } = img;
  x0 = Math.floor(x0);
  y0 = Math.floor(y0);
  if (x0 < 0 || y0 < 0 || x0 >= W || y0 >= H) return false;
  const at = (x: number, y: number) => (y * W + x) * 4;
  const i0 = at(x0, y0);
  const target = [data[i0], data[i0 + 1], data[i0 + 2], data[i0 + 3]];
  const same = (i: number) => {
    // Lo transparente se compara solo por alfa (su color no importa).
    if (target[3] < 16) return data[i + 3] < 16 + tolerance / 2;
    return Math.abs(data[i] - target[0]) + Math.abs(data[i + 1] - target[1]) + Math.abs(data[i + 2] - target[2]) + Math.abs(data[i + 3] - target[3]) <= tolerance;
  };
  if (target.every((v, k) => Math.abs(v - color[k]) < 2)) return false;
  const seen = new Uint8Array(W * H);
  const stack: number[] = [x0, y0];
  while (stack.length) {
    const y = stack.pop()!;
    let x = stack.pop()!;
    while (x > 0 && !seen[y * W + x - 1] && same(at(x - 1, y))) x--;
    let up = false;
    let down = false;
    for (; x < W && !seen[y * W + x] && same(at(x, y)); x++) {
      const i = at(x, y);
      seen[y * W + x] = 1;
      data[i] = color[0];
      data[i + 1] = color[1];
      data[i + 2] = color[2];
      data[i + 3] = color[3];
      if (y > 0) {
        const s = !seen[(y - 1) * W + x] && same(at(x, y - 1));
        if (s && !up) stack.push(x, y - 1);
        up = s;
      }
      if (y < H - 1) {
        const s = !seen[(y + 1) * W + x] && same(at(x, y + 1));
        if (s && !down) stack.push(x, y + 1);
        down = s;
      }
    }
  }
  return true;
}

/** Rectángulo con algo dibujado (alfa > 8), o null si está vacío. */
export function drawnBounds(img: ImageData): { x: number; y: number; w: number; h: number } | null {
  const { width: W, height: H, data } = img;
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (data[(y * W + x) * 4 + 3] > 8) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/** Recorta lo dibujado (con 2 px de margen) en un lienzo nuevo de como mucho 480 px. */
export function cropDrawing(src: HTMLCanvasElement): { canvas: HTMLCanvasElement; ratio: number } | null {
  const ctx = src.getContext('2d', { willReadFrequently: true })!;
  const b = drawnBounds(ctx.getImageData(0, 0, src.width, src.height));
  if (!b) return null;
  const pad = 2;
  const x = Math.max(0, b.x - pad);
  const y = Math.max(0, b.y - pad);
  const w = Math.min(src.width - x, b.w + pad * 2);
  const h = Math.min(src.height - y, b.h + pad * 2);
  const k = Math.min(1, MAX_OUT / Math.max(w, h));
  const out = document.createElement('canvas');
  out.width = Math.max(1, Math.round(w * k));
  out.height = Math.max(1, Math.round(h * k));
  const octx = out.getContext('2d')!;
  octx.imageSmoothingQuality = 'high';
  octx.drawImage(src, x, y, w, h, 0, 0, out.width, out.height);
  return { canvas: out, ratio: Math.round((out.height / out.width) * 10000) / 10000 };
}

/** WebP si el navegador sabe crearlo (Safari antiguo no): si no, PNG. */
export async function toImageBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  const webp = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', 0.9));
  if (webp && webp.type === 'image/webp') return webp;
  const png = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'));
  if (!png) throw new Error('No se pudo crear la imagen');
  return png;
}
