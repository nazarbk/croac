# Pieles por capas: estado y recursos necesarios

## Cómo se dibuja la rana hoy

- Solo **ilustraciones rasterizadas** (WebP): `public/art/frog/<piel>/<etapa>-<ánimo>.webp`, 7 pieles × 5 etapas × 5 ánimos = 175 archivos. No hay partes SVG reutilizables: la rana de código SVG se eliminó en la v1.0.
- **La cara va pintada dentro** de cada ilustración. No se puede extraer limpiamente (bajo los ojos y la boca no hay cuerpo dibujado), así que no se superponen caras nuevas sobre las actuales ni se tapan con rectángulos.
- Pieles: se generaron recoloreando la rana verde a mano (zona a zona, conservando ojos, mejillas, contorno y barba). Nunca con `hue-rotate` sobre la rana entera.
- **Posturas por ánimo** (medido sobre la silueta de cada ilustración):
  - Renacuajo, ranita y rana: la silueta es la misma en todos los ánimos (coincidencia > 99 %); solo cambia la cara (y aparece el «Zzz» al dormir).
  - Renacuajo con patas: igual, salvo pequeñas diferencias en la punta de la cola (coincidencia 98,4–99 %).
  - Rana sabia: el cuerpo es el mismo pero está dibujado algo más grande en algunos ánimos (contenta +1,3 %, preocupada +2,9 %, triste +5,2 %, dormida +1,9 %). Ya está registrado en `MOOD_FRAME` (`art.ts`) y los complementos lo siguen.

## Qué está operativo

| Parte | Estado |
|---|---|
| Modelo de piel (`src/components/frog/skins.ts`): colores de cuerpo, vientre y manchas + marcas decorativas opcionales por etapa | ✅ Hecho. Las 7 pieles actuales tienen sus colores medidos |
| Composición por capas (`LayeredBody.tsx`): colores recortados con máscaras → marcas → sombreado (multiplicar) → extras → expresión, con los complementos delante y detrás | ✅ Implementada; **inactiva** porque faltan los recursos |
| Comprobación de recursos completos por etapa (`layeredStageReady`): si falta una sola pieza, se usa la ilustración completa | ✅ Hecho y probado |
| Encaje por ánimo de la rana sabia aplicado a las capas | ✅ Hecho (`MOOD_FRAME`) |
| Pieles actuales | Siguen con sus ilustraciones completas: nada cambia de aspecto |
| Estado en el probador | Sección «Pieles por capas» de `#/dev/wardrobe` |

Para activar una piel nueva por capas: añade sus colores a `SKIN_MODELS` con `sprites: false, layered: true`, rellena `LAYERED_ART` con las rutas de la etapa y comprueba en el probador. Mientras una etapa no esté completa, esa piel se verá verde en esa etapa: no la pongas a la venta (`hidden: true` en el catálogo) hasta que lo estén las cinco.

> No se ha podido comprobar visualmente la composición por capas porque no existen todavía los recursos (y no se han fabricado imágenes de prueba).

## Recursos que faltan (preparación artística)

Todos los archivos de una etapa deben tener **exactamente el mismo lienzo** que su ilustración actual (`public/art/frog/skin-green/<etapa>-neutral.webp`), para superponerse píxel a píxel sin tocar `STAGE_ART`:

| Etapa | Lienzo (px) | Rectángulo en la caja de 240 |
|---|---|---|
| `tadpole` | 581 × 720 | x 58,63 · y 54,48 · 122,74 × 152,08 |
| `froglet` | 499 × 720 | x 59,58 · y 52,48 · 120,69 × 174,16 |
| `young` | 552 × 720 | x 57,25 · y 62,83 · 125,67 × 163,83 |
| `adult` | 629 × 720 | x 34,92 · y 33,71 · 170,15 × 194,64 |
| `sage` | 680 × 720 | x 28,68 · y 40,52 · 182,64 × 193,24 |

Alineación: el cuerpo en la misma posición y tamaño que en la ilustración **neutral** de la etapa (ojos, cabeza y pies en los mismos píxeles). Lo más fiable es dibujarlas como capas del mismo archivo de origen que la ilustración.

Por cada etapa, en `public/art/frog/layers/<etapa>/` (WebP con alfa, o PNG):

| Archivo | Contenido |
|---|---|
| `shade.webp` | Cuerpo **sin cara y sin color**: contorno y sombreado en grises (blanco = sin sombra). Alfa = silueta completa (con las protuberancias de los ojos, sin «Zzz»). Se multiplica sobre los colores |
| `mask-body.webp` | Escala de grises: blanco = silueta completa, negro = fuera. Bordes suavizados |
| `mask-belly.webp` | Blanco = vientre y garganta (la zona clara) |
| `mask-spots.webp` | Blanco = manchas (puntos de cabeza, patas…). Negro entero si la etapa no tiene manchas |
| `face-neutral.webp`, `face-happy.webp`, `face-worried.webp`, `face-sad.webp`, `face-sleeping.webp` | Solo la expresión, en su color final y transparente en lo demás: blanco de los ojos, pupilas, brillos, párpados, boca, lengua, mejillas, lágrimas, y el «Zzz» en `sleeping`. En `sage`, también las cejas (cambian con el ánimo) |

Además:

- `sage`: `under.webp` (el brillo dorado alrededor, detrás del cuerpo) y `over.webp` (la barba, igual en todas las pieles).
- `sage`: las caras de los ánimos se dibujan sobre el cuerpo **neutral**; el tamaño mayor de algunos ánimos lo aplica la app (`MOOD_FRAME`). Si se prefiere otra postura, añade `shade-<ánimo>.webp` + `mask-*-<ánimo>.webp` y declárala en `postures`.
- `froglet`: con un solo `shade.webp` la cola será igual en todos los ánimos (diferencia mínima). Para conservarla, `shade-<ánimo>.webp` y máscaras por ánimo.
- Marcas decorativas de una piel (opcional): `public/art/frog/skins/<piel>/<etapa>-marks.webp`, mismo lienzo, en color; se recortan a la silueta. Ejemplo: los botones de la barriga de la piel consola en la rana adulta.

Total para las cinco etapas: 5 × (1 sombreado + 3 máscaras + 5 caras) = **45 archivos**, más 2 de la rana sabia (y los opcionales). Después, cada piel nueva solo necesita sus 3 colores (y, si quiere, sus marcas), en lugar de 25 ilustraciones.

## Complementos que no se arreglan solo con posición y escala

| Complemento | Problema | Qué haría falta |
|---|---|---|
| Colgante bajo-hacha | La cadena es muy larga para su anchura: si se ve entera, la guitarra cae a la altura de los pies; ahora se esconde su parte alta bajo la barbilla (`overlay: head`) y en el renacuajo y el renacuajo con patas casi no se ve la cadena | Editar el recurso: cadena más corta (o en una capa aparte) |
| Bufandas (rayas y perruna) en el renacuajo | El renacuajo no tiene cuello: las puntas cuelgan por debajo del cuerpo, sobre la cola | Editar el recurso: una versión corta para el renacuajo, o separar las puntas en capa trasera |
| Sombreros en la rana sabia | Las cejas blancas se repintan por encima del ala del sombrero junto con los ojos (efecto «ojos por delante») | Máscara propia de ojos sin cejas para la rana sabia (o cejas en capa aparte, ver arriba) |
| Casco espacial y gorro de oso | Funcionan con su tamaño propio, pero el cristal y la capucha no tapan nada de la rana por detrás | Para un casco «de verdad» (cabeza dentro): dividir en capa trasera (aro) y delantera (cristal con brillo) |
