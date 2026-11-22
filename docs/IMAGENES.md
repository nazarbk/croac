# Croac · ilustraciones

Desde la v1.0 la app usa ilustraciones en lugar de los dibujos SVG hechos en código. Las originales (PNG de 1254 px, ~60 MB) se guardan fuera de Git en `design/originales/`. La app carga versiones optimizadas en WebP desde `public/art/` (~7 MB en total, y cada pantalla solo descarga lo que muestra).

## Dónde está cada cosa

| Carpeta | Contenido | Tamaño máx. |
|---|---|---|
| `public/art/frog/body/<etapa>.webp` | Cuerpo de la rana sin cara, uno por etapa (5) | 720 px de alto |
| `public/art/frog/face/<ánimo>.webp` | Expresiones, una por ánimo (5), comunes a las cinco etapas. Lienzo 940 × 540 con la nariz en el centro | 564 × 324 px |
| `public/art/acc/<id>.webp` | 25 complementos (11 de cabeza, 8 de cuello, 6 gafas), recortados a su parte visible | 480 px |
| `public/art/bg/<id>.webp` | 7 fondos de la escena de la rana (2 de la Temporada 1) | 1254 px |
| `public/art/season/<id>-banner.webp` | Cartel de cada temporada en la tienda (~4:1) | 1024 px |
| `public/art/pond/{day,night}-{square,wide}.webp` | La charca de amigos: de día / de noche, para móvil / escritorio | 1600 px |
| `public/art/ui/*.webp` | Moneda, gota de XP, trofeo e ilustraciones de estados vacíos | 128–480 px |
| `public/icons/`, `public/favicon*`, `public/splash/`, `public/og.jpg` | Icono de la app, favicon, pantallas de arranque de iPhone e imagen al compartir el enlace | — |

- **Etapas** (`stage`): `tadpole` (renacuajo, nivel 1), `froglet` (con patas, 5), `young` (ranita, 10), `adult` (rana, 20), `sage` (rana sabia, 35).
- **Ánimos** (`mood`): `neutral`, `happy` (día perfecto), `worried` (tareas de ayer sin hacer), `sad` (perdiendo XP), `sleeping` (modo vacaciones).
- **La rana por capas**: cuerpo de la etapa + expresión del ánimo + complementos. Una expresión nueva es una sola imagen (sirve para las cinco etapas); se prepara con `python scripts/art/frog_layers.py face <ánimo> imagen.png` y se coloca por etapa con `STAGE_ART[etapa].face` (o el ajuste «Cara» del probador). Ver `docs/PIELES.md`.
- **Pieles de color**: ocultas por ahora (las ranas se dibujan todas con el cuerpo verde). Quien las compró las conserva.

## Cómo encajan los complementos

El cuerpo de cada etapa es el mismo en todos los ánimos, así que cada complemento se coloca con unos puntos de anclaje por etapa y, encima, unos ajustes finos por complemento y etapa. Todo en unidades de la caja de 240 × 240 de la rana (el `viewBox`), nunca en píxeles: se ve igual a cualquier tamaño.

1. **Anclajes y dibujo base** (`src/components/frog/art.ts`, valores por defecto):
   - `STAGE_ART[etapa]`: dónde se dibuja el cuerpo (`rect`), dónde va la cara (`face`: nariz y ancho) y los anclajes `hat`, `eyes`, `neck` como `[x, y, ancho de referencia]`.
   - `ITEM_ART[id]`: `ratio` (alto/ancho de la parte visible), `w` (ancho relativo), `ax`/`ay` (**punto de apoyo**: qué punto del dibujo cae en el ancla), `dx`, `center` (cascos y capuchas centrados en la cara), `noEyes`, `tuck` y `bounds` (parte visible del archivo según su canal alfa; sin él se asume que el archivo ya está recortado, como todos los actuales).
   - `FACE_EYES`: dónde están los ojos dentro del lienzo de las caras (para la guía del probador y para pintar los ojos por encima de los sombreros).
2. **Ajustes por complemento y etapa** (`src/components/frog/accessory-fit.json`): desplazamiento `x`/`y`, `scale` (alrededor del punto de apoyo), `rotate` y `pivot`, orden `z`, `layer` (`front` o `back`, detrás de la rana), `overlay` (qué parte de la rana se repinta encima: `eyes` para sombreros entre los ojos, `head` para meter un colgante o bufanda bajo la barbilla) y, en gafas, `split` + `spread` (separar lentes sin deformarlas; solo se estira el puente). Un complemento sin ajustes se dibuja con los valores por defecto.
3. **Cálculo** (`src/components/frog/layout.ts`): funciones puras, sin analizar imágenes; las usa el componente `Frog` en todas las pantallas (tienda, perfil, charca, amigos, revisión diaria…) y el probador.

Los ajustes se editan con el **probador** (`#/admin/probador`, solo administradores o `npm run dev`): ver `docs/PROBADOR.md`. Lo que un administrador publica desde ahí manda sobre `accessory-fit.json` sin desplegar.

Las gafas se ocultan cuando la rana duerme.

## Temporadas

Los complementos de temporada siguen el mismo sistema: imagen en `public/art/acc/<id>.webp` (ids con el número de temporada, p. ej. `hat-s1-bear`) y su encaje en `ITEM_ART`. Las pieles de temporada se generan recoloreando la rana verde a partir de una sola ilustración de la rana adulta neutral (`public/art/frog/skin-s1-*`).

Temporada 1 «Hora de aventuras» (originales en `design/originales/temporada-1/`): gorro de oso, bufanda perruna, gafas de caramelo, gafas de nube, colgante bajo-hacha, corona helada, piel perruna y piel consola (a la rana adulta se le añaden los botones de la barriga).

## Cambiar o añadir ilustraciones

1. Mantén el **mismo encuadre** que la imagen que sustituyes (misma pose y tamaño en el lienzo), o habrá que reajustar los anclajes.
2. Exporta en WebP (calidad ~80) con el mismo nombre en `public/art/...`.
3. Sube `ART_VERSION` en `src/components/frog/art.ts` para que los móviles no usen la versión en caché.
4. Para un complemento nuevo: pruébalo antes en el probador con su PNG (`docs/PROBADOR.md`); luego añádelo al catálogo (`src/domain/shop.ts`), su imagen en `public/art/acc/`, la línea de `ITEM_ART` que te da el probador y sus ajustes (`npm run fit:apply`).
5. Pieles nuevas por capas (sin dibujar 25 ilustraciones): ver `docs/PIELES.md`.

## Origen de cada imagen

| Uso | Original (número final del nombre del archivo) |
|---|---|
| Renacuajo: neutral, feliz, preocupado, triste, dormido | 4, 21, 23, 24, 22 |
| Con patas | 3, 14, 13, 16, 20 |
| Ranita | 2, 12, 7, 9, 11 |
| Rana adulta | (48 recoloreada), 8, 10, 6, 5 |
| Rana sabia | 1, 15, 17, 19, 18 |
| Pieles (adulta neutral) | azul 44, medianoche 47, rosa 48, dorada 49 |
| Complementos (v1.1, rediseñados) | `design/originales/temporada-1/`: corbata 1, pañuelo 2, perlas 3, bufanda 4, pajarita 5, gafas de sol 6, redondas 7, corazón 8, medalla 9, monóculo 11, fiesta 12, lana 13, boina 14, flor 15, chistera 16, gorra 17, mago 18, corona 20, visor espacial 22 |
| Fondos | charca 46, atardecer 52, noche 51, lluvia 53, espacio 55 |
| Charca de amigos | día 45 / 54, noche 50 / 67 |
| Interfaz | moneda 56, XP 60, trofeo 68, vacíos 59, 65, 69 |
| Iconos y arranque | icono 70, favicon 75, notificaciones 72, arranque 71 (oscuro) y 74 (claro) |

No se usan: 57 (trofeo con restos de fondo), 42 (monóculo con fondo de cuadros pintado), 58, 62, 63, 73, 76.
