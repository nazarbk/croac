# Probador de complementos (`#/admin/probador`)

Herramienta para colocar la cara y los complementos sobre la rana en las cinco etapas y para probar diseños nuevos antes de añadirlos a la tienda. Usa **el mismo componente `Frog`** que la tienda, el perfil y el resto de la app, así que lo que ves en el probador es lo que se verá en la app.

## Quién puede abrirlo

- **Administradores**, en la app publicada: entra con tu cuenta y ve a Ajustes → Administración → Probador de complementos (o `https://tu-app/#/admin/probador`).
- **Cualquiera con `npm run dev`** en su ordenador (`http://localhost:5173/#/admin/probador`; también vale `#/dev/wardrobe`).

El resto de usuarios no lo ve: la ruta les abre «Hoy» y su código ni se descarga (va en un archivo aparte que solo se pide si el servidor confirma que eres administrador).

**Hacerte administrador** (una vez): en Supabase → SQL Editor, con el esquema actualizado (`supabase/schema.sql`):

```sql
insert into public.admins (user_id)
select id from auth.users where email = 'tu@correo.com';
```

La lista de administradores solo se puede cambiar desde ahí: ni la app ni el navegador pueden añadir a nadie. Y aunque alguien forzara la pantalla del probador, publicar lo vuelve a comprobar la base de datos (RLS).

## Qué hay en la pantalla

- **Qué probar** (izquierda): etapa (renacuajo → rana sabia), ánimo, «Cara (las 5 expresiones)» o un complemento (los de temporada llevan «T1»; un `•` indica que tiene ajustes), combinación («Solo este» o «Con otros» para elegir qué más lleva puesto), fondo claro/oscuro/cuadros y guías.
- **Lienzo** (centro): la rana grande. Arrastra para mover el complemento seleccionado. Guías opcionales:
  - Anclajes de la etapa: `hat` (naranja), `eyes` (azul), `neck` (morado) con su ancho de referencia.
  - Límites: rectángulo visible del complemento (verde discontinuo), rectángulo del archivo si el PNG trae márgenes (gris punteado), punto de apoyo (punto verde) y pivote de giro (círculo rojo).
  - Ojos medidos: centro y tamaño de cada ojo de la cara tal y como está colocada (para centrar gafas).
  - Cuadrícula cada 10 unidades (la línea roja es el centro).
- **Ajuste** (derecha): X/Y, escala, giro, pivote, orden (z), capa (delante/detrás de la rana), qué parte de la rana se repinta encima (ojos o cabeza) y, en gafas, lentes separadas. Un campo vacío usa el valor heredado (en gris).
  - «Solo <etapa>» edita esa etapa; «Todas las etapas (base)» edita el ajuste común. Lo de la etapa manda sobre la base, campo a campo.
  - Restablecer: como en el proyecto, valores originales (sin ajuste) o todo el complemento.
  - Copiar el ajuste de la etapa actual a **otra** etapa concreta (no a todas).
- **Las cinco etapas**: el complemento en las cinco a la vez (clic para cambiar de etapa).
- **Todos los complementos**: tabla de todos × cinco etapas para revisar de un vistazo.
- **A tamaño real**: tarjeta de la tienda (móvil y ordenador), Hoy (128 px), revisión diaria (80 px), charca (56 px) y perfil con fondo.

### Teclado (con el lienzo enfocado)

| Tecla | Acción |
|---|---|
| Flechas | Mover 0,5 (Mayús: 2 · Alt: 0,1) |
| `+` / `−` | Escala ±0,01 (Mayús: ±0,05) |
| `[` / `]` | Girar ∓1° (Mayús: 5°) |
| Ctrl/Cmd + Z | Deshacer · Ctrl/Cmd + Mayús + Z: rehacer |

Las unidades son las de la caja de 240 × 240 de la rana, no píxeles: el ajuste se mantiene a cualquier tamaño.

## Dónde se guarda lo que haces

La cabecera siempre muestra los cuatro niveles:

| Nivel | Dónde vive | Cómo se crea | Quién lo ve |
|---|---|---|---|
| **Cambios temporales** | Memoria de la pestaña | Al editar | Solo tú, hasta recargar (el navegador avisa) |
| **Borrador local** | `localStorage` de este navegador | «Guardar borrador local» | Solo tú, en este navegador |
| **Proyecto** | `src/components/frog/accessory-fit.json` (en Git) | «Incorporar al proyecto…» (solo con `npm run dev`) o `npm run fit:apply` | Todos, cuando se despliegue |
| **Publicado en la app** | Supabase (tabla `app_config`) | «Publicar en la app…» (solo administradores) | Todos, al abrir la app, sin desplegar |

Si hay algo publicado, manda sobre lo del proyecto. «Retirar de la app…» lo borra y la app vuelve a usar `accessory-fit.json`. Lo recomendable: publicar para verlo ya en la app y, cuando estés contento, «Descargar JSON» + `npm run fit:apply` para que también quede en el código.

```bash
npm run fit:apply -- ~/Descargas/accessory-fit.json          # valida y escribe
npm run fit:apply -- ~/Descargas/accessory-fit.json --check  # solo valida
```

Todo se valida antes de guardarse (botones, script y app): lo que no sea correcto se rechaza y se listan los errores. «Importar JSON» carga un archivo como cambios temporales.

## Probar un PNG nuevo

1. En «Probar un PNG nuevo» elige el hueco (cabeza, cuello o gafas) y el archivo. Se abre **solo en tu navegador** (no se sube a ningún sitio).
2. El probador mide su parte visible (canal alfa) una vez al cargarlo, así que los márgenes transparentes no afectan al tamaño ni a la posición.
3. Ponle el id definitivo (`hat-pirata`, `neck-…`, `eyes-…`) y ajusta «Ancho», «Apoyo x/y» (dibujo base, para que encaje en casi todas las etapas). Después afina cada etapa con los ajustes.
4. Para añadirlo de verdad:
   - Guarda la imagen en `public/art/acc/<id>.webp` (WebP, ~480 px de lado mayor; si no la recortas, deja el `bounds` que da el probador).
   - Pega en `ITEM_ART` (`src/components/frog/art.ts`) la línea de «Para art.ts».
   - Añádelo al catálogo (`src/domain/shop.ts` o a la temporada en `src/domain/seasons.ts`).
   - Incorpora sus ajustes (`npm run fit:apply` o publícalos). Un test comprueba que solo se ajustan complementos que existen.
   - Sube `ART_VERSION` en `art.ts` si cambias una imagen que ya existía.

## Formato de `accessory-fit.json`

```json
{
  "version": 1,
  "items": {
    "face": {
      "stages": { "sage": { "y": -1, "scale": 1.03 } }
    },
    "neck-medal": {
      "base": { "overlay": "head" },
      "stages": {
        "adult": { "y": -20, "scale": 1.3 }
      }
    },
    "eyes-round": {
      "split": [0.45, 0.55],
      "stages": { "adult": { "spread": 3 } }
    }
  }
}
```

| Campo | Unidades | Límites |
|---|---|---|
| `x`, `y` | caja de 240 | −120…120 |
| `scale` | multiplicador (alrededor del punto de apoyo) | 0,2…4 |
| `rotate` | grados (alrededor de `pivot`) | −180…180 |
| `pivot` | `[x, y]` en proporción del rectángulo visible | −1…2 |
| `z` | entero; por defecto cuello 10, cabeza 20, gafas 30 | −50…50 |
| `layer` | `front` / `back` | |
| `overlay` | `auto` / `none` / `eyes` / `head` | |
| `face` (id especial) | la cara: admite `x`, `y`, `scale`, `rotate` y `pivot` | |
| `split` (solo gafas, por complemento) | `[fin lente izq., inicio lente der.]` en proporción del ancho | 0 < a ≤ b < 1 |
| `spread` (solo gafas con `split`) | caja de 240 | −40…40 |

Si el archivo del proyecto no fuera válido, la app lo ignora y usa los anclajes de siempre (y lo avisa en la consola); los tests fallan para que no llegue a publicarse.
