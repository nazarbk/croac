# Temporadas de la tienda

Cada temporada es una colección de complementos y fondos que solo se puede comprar durante sus fechas (lo comprado es para siempre). Se definen en `src/domain/seasons.ts`.

- **Duración**: dos semanas, de jueves a miércoles (la Temporada 1 duró una).
- **Último día**: cada tarea y el día perfecto dan **el doble de experiencia** (`LAST_DAY_BOOST` en `seasons.ts`; para dar también monedas dobles, `coins: 2`). Se avisa con una franja en «Hoy», en la tienda y en el aviso de cada tarea. Solo cuenta lo que se completa ese día, no lo que se marca con fecha de días anteriores.

| Temporada | Nombre | Fechas |
|---|---|---|
| 1 | Hora de aventuras | 19 → 25 de noviembre de 2026 |
| 2 | Más allá del jardín | 26 de noviembre → 9 de diciembre de 2026 |

## Preparar la siguiente sin que nadie la vea

Una temporada se puede subir **antes** de su estreno: la tienda solo la enseña desde su `start`. Hasta entonces:

- **Usuarios**: no ven nada (ni cartel, ni artículos, ni la entrada de Novedades).
- **Administradores** (y `npm run dev`): en la tienda aparece una franja «Solo administradores» con **Vista previa**, que enseña la tienda tal y como quedará el día del estreno (los botones dicen «Desde el jue 26 nov» y no se puede comprar). En el **probador** (`#/admin/probador`) los complementos nuevos salen con «(T2)» para ajustarlos y publicar el ajuste; como nadie los tiene todavía, publicarlo no cambia nada para los demás.
- El día del estreno sale sola, sin desplegar: cartel nuevo en la tienda y la ventana de Novedades (su entrada en `src/content/changelog.ts` lleva `date` = día de estreno y no se enseña antes).

## Pasos

1. **Imágenes** (originales PNG con fondo transparente para los complementos):

   ```bash
   python scripts/art/season_art.py acc    hat-s3-algo    gorro.png
   python scripts/art/season_art.py acc    neck-s3-algo   colgante.png
   python scripts/art/season_art.py acc    eyes-s3-algo   gafas.png
   python scripts/art/season_art.py bg     bg-s3-algo     fondo.png
   python scripts/art/season_art.py banner s3             cartel.png
   ```

   Limpia los restos semitransparentes, recorta, reduce y guarda en WebP. Para cada complemento imprime su línea de `ITEM_ART`.
2. **Encaje base** en `src/components/frog/art.ts` (`ITEM_ART`): pega la línea y ajusta `w` (ancho respecto a la cabeza, el cuello o los ojos) y `ay` (qué altura del dibujo cae en el ancla: ~0,95 en gorros, ~0,02 en colgantes con cordón, el centro de las lentes en gafas). Colgantes con cordón: añade `{"base": {"overlay": "head"}}` en `accessory-fit.json` para que el cordón quede bajo la barbilla.
3. **Catálogo**: añade la temporada al final de `SEASONS` con fechas que no se solapen y **14 días** de duración (hay un test), `banner` y `bannerPosition` (qué parte del cartel se ve al recortarlo). Precios: que los 3 más baratos sumen ≤ 200 (una semana de tareas); hay un test que lo comprueba.
4. **Novedades**: entrada en `src/content/changelog.ts` con la versión nueva (súbela también en `package.json`) y `date` = día de estreno.
5. **Comprobar**: `npm test` (verifica que cada artículo tiene su imagen y su encaje) y la vista previa de la tienda.
6. Sube a GitHub cuando quieras: hasta el estreno solo lo ven los administradores. Afina luego en el probador y publica el ajuste desde ahí, sin desplegar.
