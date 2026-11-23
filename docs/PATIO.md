# El patio del complemento (`#/patio`)

Concurso semanal: cada usuario con cuenta puede dibujar **un** complemento por semana, publicarlo en el patio y votar los de los demás. El más votado de la semana entra **gratis en la tienda** para todo el mundo y su autor se lleva monedas y su firma en el artículo.

## Reglas

| Regla | Valor | Dónde se cambia |
|---|---|---|
| Precio del lienzo | **150 monedas** (≈ una semana de tareas normales) | `PATIO.canvasPrice` en `src/domain/patio.ts` |
| Premio del ganador | **200 monedas** + su complemento + «dibujado por @autor» | `PATIO.winPrize` |
| Votos por persona y semana | **3**, no a tu propio dibujo; se pueden quitar y dar a otro | `PATIO.votesPerWeek` + trigger `patio_votes_before_insert` |
| Dibujos por persona y semana | 1 (puede borrarlo y, como recupera el lienzo, volver a publicar) | `unique (user_id, week_start)` |
| Semana | de lunes a domingo, hora de España | `patio_current_week()` |
| Ganador | el de más votos de cada semana cerrada; empate → el que se publicó antes; con 0 votos no hay ganador | `patio_winners()` |
| Denuncias | cualquiera puede denunciar; con **3** se oculta solo; el admin oculta, muestra o borra | trigger `patio_reports_after_insert` |
| Quién lo ve | todos los usuarios (los dibujos se ven al momento, sin moderación previa) | políticas RLS de `patio_entries` |

Huecos que se pueden dibujar: **cabeza** (gorros), **cuello** y **gafas**. El editor muestra una plantilla con la posición de los ojos o del cuello y una vista previa en vivo sobre tu rana.

## Flujo

1. **Comprar lienzo** (150 monedas, se guarda en `meta.patioCanvases` y queda en el historial como compra `patio-canvas`).
2. **Dibujar**: pincel, goma, bote de pintura, 4 grosores, 14 colores + uno libre, deshacer/rehacer (Ctrl+Z). Lienzo de 512 × 512.
3. **Publicar**: se recorta lo dibujado, se sube como WebP (o PNG) al bucket `patio` de Supabase Storage y se crea la entrada. El lienzo se gasta. Si borras tu dibujo esa misma semana, recuperas el lienzo.
4. **Votar** con los corazones (3 por semana) y **denunciar** con la bandera (pide confirmación).
5. El lunes, el más votado aparece en **Tienda → Del patio** gratis para todos. Al autor le salta un aviso, cobra el premio una sola vez (`patio-win:<id>` en el historial) y ya lo tiene en el armario.

Los complementos ganadores se registran en tiempo de ejecución (`setCommunityItems` en `src/domain/shop.ts` y `communityArtStore` en `src/components/frog/community.ts`) con ids `hat-patio-12`, `neck-patio-12`, `eyes-patio-12`. Se guardan en caché local para que se vean sin conexión.

## Base de datos

Al actualizar a la v1.3 hay que **volver a ejecutar `supabase/schema.sql` entero** (se puede repetir; no borra datos). Crea:

| Objeto | Para qué |
|---|---|
| `patio_entries` | Dibujos: autor, semana, hueco, nombre (1–24), ruta de la imagen, proporción, oculto, denuncias |
| `patio_votes` | Un voto por persona y dibujo (máx. 3 por semana, nunca al tuyo, solo la semana en curso) |
| `patio_reports` | Una denuncia por persona y dibujo |
| `patio_week()` | Dibujos de esta semana con votos, si los has votado y si son tuyos |
| `patio_winners()` | Ganador de cada semana cerrada (lo lee también la tienda sin sesión) |
| Bucket `patio` | Imágenes públicas, máx. 300 KB, PNG/WebP; cada usuario solo escribe en su carpeta |

Lo que **decide el servidor** (no se puede falsear desde la consola): autor y semana, una entrada por semana, carpeta propia de la imagen, límite de votos, no votarse a uno mismo, cierre de la votación, auto-ocultado por denuncias y que solo los administradores ocultan/muestran.

Lo que **todavía decide el cliente**: las monedas (comprar el lienzo y cobrar el premio). Es coherente con el resto de la economía de Croac, que vive en el dispositivo; ver P2 en `docs/AUDITORIA.md`.

## Moderación

Los administradores (tabla `admins`, ver `docs/CUENTAS.md`) ven en cada dibujo el número de denuncias y los botones **Ocultar / Mostrar** y **Borrar**. Un dibujo oculto deja de verse en el patio (su autor lo sigue viendo, marcado como «Oculto») y no puede ganar.

## Ideas para más adelante

- Temas semanales («gorros de invierno», «Hora de aventuras») para la temporada.
- Lienzo Pro (más colores, capas) o lienzo extra como ventaja del plan Pro.
- Mover monedas y premios a una función del servidor para que no se puedan falsear.
- Galería histórica con todos los dibujos, no solo los ganadores.
