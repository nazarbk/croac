# Croac · ilustraciones

Desde la v1.0 la app usa ilustraciones en lugar de los dibujos SVG hechos en código. Las originales (PNG de 1254 px, ~60 MB) se guardan fuera de Git en `design/originales/`. La app carga versiones optimizadas en WebP desde `public/art/` (~7 MB en total, y cada pantalla solo descarga lo que muestra).

## Dónde está cada cosa

| Carpeta | Contenido | Tamaño máx. |
|---|---|---|
| `public/art/frog/<piel>/<etapa>-<ánimo>.webp` | La rana: 5 pieles × 5 etapas × 5 ánimos = 125 imágenes | 720 px |
| `public/art/acc/<id>.webp` | 19 complementos (9 sombreros, 6 de cuello, 4 gafas) | 480 px |
| `public/art/bg/<id>.webp` | 5 fondos de la escena de la rana | 1254 px |
| `public/art/pond/{day,night}-{square,wide}.webp` | La charca de amigos: de día / de noche, para móvil / escritorio | 1600 px |
| `public/art/ui/*.webp` | Moneda, gota de XP, trofeo e ilustraciones de estados vacíos | 128–480 px |
| `public/icons/`, `public/favicon*`, `public/splash/`, `public/og.jpg` | Icono de la app, favicon, pantallas de arranque de iPhone e imagen al compartir el enlace | — |

- **Etapas** (`stage`): `tadpole` (renacuajo, nivel 1), `froglet` (con patas, 5), `young` (ranita, 10), `adult` (rana, 20), `sage` (rana sabia, 35).
- **Ánimos** (`mood`): `neutral`, `happy` (día perfecto), `worried` (tareas de ayer sin hacer), `sad` (perdiendo XP), `sleeping` (modo vacaciones).
- **Pieles**: `skin-green`, `skin-blue`, `skin-pink`, `skin-gold`, `skin-midnight`. Solo había arte de cada piel en la rana adulta neutral; el resto se generó recoloreando la rana verde (manteniendo ojos, mejillas, contorno y la barba de la rana sabia).
- La **rana adulta neutral verde** no venía en el lote: se obtuvo recoloreando la rosa.

## Cómo encajan los complementos

Todas las ranas de una misma etapa comparten encuadre, así que cada complemento se coloca con unos puntos de anclaje por etapa (cabeza, ojos y cuello) y unos ajustes por artículo (tamaño y punto de apoyo). Están en `src/components/frog/art.ts`:

- `STAGE_ART[etapa]`: dónde se dibuja la rana en una caja de 240 × 240 y los anclajes `hat`, `eyes`, `neck` como `[x, y, ancho de referencia]`.
- `ITEM_ART[id]`: `w` (ancho relativo), `ax`/`ay` (qué punto del dibujo cae en el ancla), `dx` (desplazamiento, p. ej. el monóculo en un ojo) y `center` (el casco va centrado en la cabeza).

Las gafas se ocultan cuando la rana duerme.

## Cambiar o añadir ilustraciones

1. Mantén el **mismo encuadre** que la imagen que sustituyes (misma pose y tamaño en el lienzo), o habrá que reajustar los anclajes.
2. Exporta en WebP (calidad ~80) con el mismo nombre en `public/art/...`.
3. Sube `ART_VERSION` en `src/components/frog/art.ts` para que los móviles no usen la versión en caché.
4. Para un complemento nuevo: añádelo al catálogo (`src/domain/shop.ts`), su imagen en `public/art/acc/` y su entrada en `ITEM_ART`.

## Origen de cada imagen

| Uso | Original (número final del nombre del archivo) |
|---|---|
| Renacuajo: neutral, feliz, preocupado, triste, dormido | 4, 21, 23, 24, 22 |
| Con patas | 3, 14, 13, 16, 20 |
| Ranita | 2, 12, 7, 9, 11 |
| Rana adulta | (48 recoloreada), 8, 10, 6, 5 |
| Rana sabia | 1, 15, 17, 19, 18 |
| Pieles (adulta neutral) | azul 44, medianoche 47, rosa 48, dorada 49 |
| Sombreros | fiesta 25, gorra 26, chistera 27, lana 28, mago 29, flor 30, corona 31, casco 33, boina 34 |
| Cuello | pañuelo 32, corbata 35, pajarita 36, bufanda 37, perlas 38 (solo la mitad inferior), medalla 40 |
| Gafas | redondas 39, sol 41, corazón 43, monóculo 66 |
| Fondos | charca 46, atardecer 52, noche 51, lluvia 53, espacio 55 |
| Charca de amigos | día 45 / 54, noche 50 / 67 |
| Interfaz | moneda 56, XP 60, trofeo 68, vacíos 59, 65, 69 |
| Iconos y arranque | icono 70, favicon 75, notificaciones 72, arranque 71 (oscuro) y 74 (claro) |

No se usan: 57 (trofeo con restos de fondo), 42 (monóculo con fondo de cuadros pintado), 58, 62, 63, 73, 76.
