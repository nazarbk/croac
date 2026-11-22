"""
Prepara las capas de la rana (cuerpos sin cara y expresiones) para public/art/frog/.

  python scripts/art/frog_layers.py body  <etapa> <imagen.png>
  python scripts/art/frog_layers.py face  <ánimo> <imagen.png>

Necesita Python 3 con Pillow, numpy y scipy (vienen con Anaconda).

- Cuerpo: recorta los márgenes transparentes y lo guarda a 720 px de alto en
  public/art/frog/body/<etapa>.webp. Imprime su proporción (alto/ancho) para BODY_ART.
- Cara: localiza la nariz (los dos puntos oscuros del centro) y recorta un lienzo común de
  940 × 540 px con la nariz siempre en el mismo sitio (470, 270). Así todas las
  expresiones encajan en las cinco etapas con el mismo ajuste (FACE_ART), y una expresión
  nueva solo necesita este paso. Se guarda en public/art/frog/face/<ánimo>.webp.

La imagen de la cara debe ser del mismo estilo y tamaño que las actuales (mejillas a ~730 px
una de otra en un lienzo de ~1050 × 1500): si no, ajusta FACE_SCALE.
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public' / 'art' / 'frog'
STAGES = ['tadpole', 'froglet', 'young', 'adult', 'sage']
FACE_BOX = (940, 540)      # lienzo común de las caras
NOSE_AT = (470, 270)       # dónde queda el centro de la nariz
FACE_SCALE = 0.6           # tamaño final (0.6 → 564 × 324 px)


def body(stage: str, src: str) -> None:
    assert stage in STAGES, f'etapa desconocida: {stage}'
    im = Image.open(src).convert('RGBA')
    a = np.asarray(im)[..., 3]
    ys, xs = np.nonzero(a > 8)
    im = im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    h = 720
    w = round(im.width * h / im.height)
    im = im.resize((w, h), Image.LANCZOS)
    (OUT / 'body').mkdir(parents=True, exist_ok=True)
    dst = OUT / 'body' / f'{stage}.webp'
    im.save(dst, 'WEBP', quality=90, method=6)
    print(f'{dst.relative_to(ROOT)}: {w} × {h} px · alto/ancho {h / w:.4f}')


def nose(im: np.ndarray) -> tuple[float, float]:
    rgb = im[..., :3].astype(int)
    dark = (im[..., 3] > 128) & (rgb.sum(-1) < 200)
    lab, k = ndimage.label(dark)
    W = im.shape[1]
    dots = []
    for i in range(1, k + 1):
        ys, xs = np.nonzero(lab == i)
        if 100 < len(xs) < 2500 and abs(xs.mean() - W / 2) < 150 and np.ptp(xs) < 60 and np.ptp(ys) < 60:
            dots.append((xs.mean(), ys.mean()))
    if len(dots) < 2:
        raise SystemExit('No encuentro la nariz (dos puntos oscuros en el centro).')
    dots.sort(key=lambda d: abs(d[0] - W / 2))
    (x1, y1), (x2, y2) = dots[:2]
    return (x1 + x2) / 2, (y1 + y2) / 2


def face(mood: str, src: str) -> None:
    im = Image.open(src).convert('RGBA')
    nx, ny = nose(np.asarray(im))
    left = round(nx - NOSE_AT[0])
    top = round(ny - NOSE_AT[1])
    canvas = im.crop((left, top, left + FACE_BOX[0], top + FACE_BOX[1]))  # fuera del original: transparente
    out = canvas.resize((round(FACE_BOX[0] * FACE_SCALE), round(FACE_BOX[1] * FACE_SCALE)), Image.LANCZOS)
    # Lo que se salga del lienzo común se perdería: avísalo.
    a = np.asarray(im)[..., 3] > 8
    inside = a[max(top, 0):top + FACE_BOX[1], max(left, 0):left + FACE_BOX[0]].sum()
    if inside < a.sum() * 0.995:
        print(f'⚠ parte de la expresión queda fuera del lienzo común ({100 - inside / a.sum() * 100:.1f} %)')
    (OUT / 'face').mkdir(parents=True, exist_ok=True)
    dst = OUT / 'face' / f'{mood}.webp'
    out.save(dst, 'WEBP', quality=92, method=6)
    print(f'{dst.relative_to(ROOT)}: nariz en ({nx:.0f}, {ny:.0f}) del original → {out.width} × {out.height} px')


if __name__ == '__main__':
    if len(sys.argv) != 4 or sys.argv[1] not in ('body', 'face'):
        raise SystemExit(__doc__)
    (body if sys.argv[1] == 'body' else face)(sys.argv[2], sys.argv[3])
