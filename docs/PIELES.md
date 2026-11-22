# La rana por capas: cuerpos, caras y pieles

## Cómo se dibuja

Desde la v1.2 la rana se compone por capas (`src/components/frog/Frog.tsx`):

1. Complementos traseros (si alguno se pone «detrás de la rana» en el probador)
2. **Cuerpo** de la etapa, sin cara: `public/art/frog/body/<etapa>.webp`
3. **Expresión** del ánimo: `public/art/frog/face/<ánimo>.webp`
4. Complementos delanteros (cuello, sombrero, gafas)

| Etapa | Archivo | Rectángulo en la caja de 240 (`STAGE_ART[etapa].rect`) |
|---|---|---|
| Renacuajo (`tadpole`) | `body/tadpole.webp` (671 × 720) | x 75,14 · y 70 · 126,74 × 136 |
| Renacuajo con patas (`froglet`) | `body/froglet.webp` (657 × 720, el de la cola) | x 69,2 · y 80 · 133,22 × 146 |
| Ranita (`young`) | `body/young.webp` (500 × 720) | x 72,37 · y 88 · 95,83 × 138 |
| Rana (`adult`) | `body/adult.webp` (753 × 720) | x 37,6 · y 70 · 165,24 × 158 |
| Rana sabia (`sage`) | `body/sage.webp` (741 × 720) | x 35,72 · y 66 · 168,78 × 164 |

Cada cuerpo se escaló para que la rana ocupe lo mismo que antes en pantalla (de la cabeza a los pies) y quede centrada por la cabeza.

**Las cinco expresiones (`neutral`, `happy`, `worried`, `sad`, `sleeping`) son las mismas en todas las etapas.** Todas comparten un lienzo de 940 × 540 (guardado a 564 × 324) con la nariz en el centro; cada etapa dice dónde va la nariz y qué ancho tiene la cara (`STAGE_ART[etapa].face`). Los ojos quedan dentro de las protuberancias de la cabeza. Se puede afinar por etapa con el probador (complemento «Cara»), y vale para las cinco expresiones a la vez.

El cuerpo no cambia con el ánimo, así que los complementos tampoco.

## Añadir o cambiar una expresión

Una expresión es **una sola imagen** para las cinco etapas:

1. Genera la cara con el mismo estilo y tamaño que las actuales (fondo transparente, ~1050 × 1500, mejillas a ~730 px una de otra).
2. Prepárala (recorta el lienzo común alineando la nariz):

   ```bash
   python scripts/art/frog_layers.py face happy ~/Descargas/cara-feliz.png
   ```

   Necesita Python con Pillow, numpy y scipy (vienen con Anaconda).
3. Ábrela en el probador (Cara → los cinco ánimos) y comprueba que encaja en las cinco etapas.

Los ánimos que existen los decide la lógica del juego (`domain/engine.ts`): una expresión para un ánimo nuevo también necesita ese cambio.

## Cambiar un cuerpo

```bash
python scripts/art/frog_layers.py body adult ~/Descargas/rana-adulta.png
```

Recorta los márgenes y lo guarda a 720 px de alto. Si cambia la proporción, actualiza `STAGE_ART[etapa].rect` (el ancho = alto × ancho/alto que imprime el script) y revisa en el probador la cara y los complementos de esa etapa.

## Pieles

**Ahora mismo no hay pieles de color.** Las de antes (azul, rosa, dorada, medianoche y las dos de la temporada) eran 25 dibujos completos cada una y no encajan con los cuerpos nuevos, así que están ocultas en la tienda. Quien las compró las sigue teniendo (no se borra nada de sus datos) y, mientras tanto, su rana se dibuja con el cuerpo verde.

Preparado para el futuro: una piel nueva solo necesita **sus 5 cuerpos** (las caras son comunes), en `public/art/frog/body/<piel>/<etapa>.webp`, y añadir su id a `SKIN_BODIES` en `src/components/frog/skins.ts`. Luego se quita `hidden: true` de la piel en `domain/shop.ts`.

Alternativas a generar los cuerpos de cada color (por estudiar):

- **Máscaras de color**: por etapa, el cuerpo en gris + una máscara para el cuerpo, otra para el vientre y otra para las manchas; la app pinta cada zona del color de la piel. Una piel nueva serían 3 colores. Hacen falta 3 máscaras y un sombreado por etapa.
- **Recolorear en el ordenador** a partir del verde (como se hizo con las de antes) y guardar los 5 cuerpos resultantes.

En ningún caso `hue-rotate` sobre la rana entera: cambiaría también ojos, mejillas y barba.
