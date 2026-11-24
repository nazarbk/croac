"""
Prepara las ilustraciones de una temporada para public/art/.

  python scripts/art/season_art.py acc    <id> <imagen.png>   # complemento: hat-s2-x, neck-s2-x, eyes-s2-x
  python scripts/art/season_art.py bg     <id> <imagen.png>   # fondo: bg-s2-x
  python scripts/art/season_art.py banner <id> <imagen.png>   # cartel: s2 → season/s2-banner.webp

Necesita Python 3 con Pillow, numpy y scipy (vienen con Anaconda).

- Complemento: limpia el «polvo» semitransparente que dejan los generadores alrededor del
  dibujo (solo conserva lo que toca a las manchas grandes), recorta los márgenes y lo guarda a
  480 px como máximo en public/art/acc/<id>.webp. Imprime la línea para ITEM_ART con su
  proporción (alto/ancho); el ancho y el apoyo se ajustan luego en el probador.
- Fondo: cuadrado de 1254 px en public/art/bg/<id>.webp.
- Cartel: 1024 px de ancho en public/art/season/<id>-banner.webp (la tienda lo recorta a ~4:1
  por el centro; deja lo importante en la franja central).
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / 'public' / 'art'


def clean_alpha(im: Image.Image) -> Image.Image:
    rgba = np.asarray(im.convert('RGBA')).copy()
    a = rgba[..., 3]
    solid = a > 60
    labels, n = ndimage.label(solid)
    if n:
        sizes = ndimage.sum(solid, labels, range(1, n + 1))
        keep = np.isin(labels, 1 + np.nonzero(sizes >= sizes.max() * 0.004)[0])
        # El borde antialias de lo que se queda (3 px) sí se conserva.
        keep = ndimage.binary_dilation(keep, iterations=3)
        rgba[..., 3] = np.where(keep, a, 0)
    return Image.fromarray(rgba)


def acc(item_id: str, src: str) -> None:
    im = clean_alpha(Image.open(src))
    im = im.crop(im.getbbox())
    im.thumbnail((480, 480), Image.LANCZOS)
    out = ART / 'acc' / f'{item_id}.webp'
    im.save(out, 'WEBP', quality=82, method=6)
    print(f"{out.relative_to(ROOT)}  {im.width}×{im.height}")
    print(f"  '{item_id}': {{ ratio: {im.height / im.width:.4f}, w: 1, ax: 0.5, ay: 0.5 }},")


def bg(item_id: str, src: str) -> None:
    im = Image.open(src).convert('RGB')
    side = min(im.size)
    im = im.crop(((im.width - side) // 2, (im.height - side) // 2, (im.width + side) // 2, (im.height + side) // 2))
    im = im.resize((1254, 1254), Image.LANCZOS) if side != 1254 else im
    out = ART / 'bg' / f'{item_id}.webp'
    im.save(out, 'WEBP', quality=80, method=6)
    print(out.relative_to(ROOT))


def banner(season_id: str, src: str) -> None:
    im = Image.open(src).convert('RGB')
    if im.width > 1024:
        im = im.resize((1024, round(im.height * 1024 / im.width)), Image.LANCZOS)
    out = ART / 'season' / f'{season_id}-banner.webp'
    im.save(out, 'WEBP', quality=82, method=6)
    print(out.relative_to(ROOT), f'{im.width}×{im.height}')


if __name__ == '__main__':
    if len(sys.argv) != 4 or sys.argv[1] not in ('acc', 'bg', 'banner'):
        sys.exit(__doc__)
    {'acc': acc, 'bg': bg, 'banner': banner}[sys.argv[1]](sys.argv[2], sys.argv[3])
