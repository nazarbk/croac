# Croac · lista de imágenes para generar con IA

> Hoy todas las ilustraciones de la app se dibujan con SVG en código (`src/components/frog/`). Esta lista sirve para encargarlas a una herramienta de IA de imagen y sustituirlas. Al final hay notas de cómo integrarlas.

## Estilo común (pegar al principio de cada prompt)

> Ilustración para app móvil, estilo cartoon vectorial plano con sombreado suave, contornos redondeados de grosor medio en verde oscuro (#1f3d2b), colores saturados pero amables, personaje adorable tipo kawaii, rana verde (#4caf6e, vientre #d9f2c4, mejillas rosadas), ojos grandes brillantes. Fondo transparente. Vista frontal, centrado, sin texto, sin marcas de agua.

Formato: **PNG con transparencia** (o SVG si la herramienta lo permite), lienzo **cuadrado 1024×1024**, el personaje ocupando el 80 % inferior y centrado. Para accesorios, lienzo 1024×1024 con el objeto centrado y sin personaje.

## 1. Marca e instalación

| Archivo | Tamaño | Descripción / prompt |
|---|---|---|
| `public/logo.svg` (o `logo.png`) | 1024×1024 | Cabeza de rana sonriente, minimalista, legible a 32 px, fondo transparente |
| `public/icons/icon-512.png`, `icon-192.png` | 512 / 192 | Icono de app: cabeza de rana sobre fondo degradado verde (#2f9a55 → verde lima claro), esquinas NO redondeadas (lo hace el sistema) |
| `public/icons/icon-maskable-512.png`, `-192.png` | 512 / 192 | Igual, con la rana dentro del 80 % central (zona segura) y el fondo llenando todo |
| `public/icons/apple-touch-icon.png` | 180×180 | Igual que el icono, sin transparencia |
| `public/icons/badge-96.png` | 96×96 | Silueta blanca monocroma de la rana para notificaciones Android |
| `public/favicon.svg`, `favicon.ico` | 32/48 | Versión simplificada del logo |
| `public/splash/splash-{light,dark}-WxH.png` | 9 tamaños iPhone × 2 temas | Logo centrado (≈25 % del ancho) con «Croac» debajo; fondo #eef4ef (claro) / verde muy oscuro del tema (oscuro) |
| `public/screenshots/*.png` | 1080×1920, 1920×1080 | Capturas reales de la app (no generar con IA) |

## 2. La rana: 5 etapas × 5 ánimos = 25 imágenes

Nombre de archivo sugerido: `frog-{etapa}-{ánimo}.png`.

| Etapa (id) | Nivel | Prompt |
|---|---|---|
| `tadpole` · Renacuajo | 1–4 | Renacuajo bebé verde con cola ondulada, cuerpo redondo, nadando de frente |
| `froglet` · Renacuajo con patas | 5–9 | Renacuajo con dos patitas traseras y cola más corta, medio fuera del agua |
| `young` · Ranita | 10–19 | Rana pequeña y joven, cabeza grande, sentada, aspecto curioso |
| `adult` · Rana | 20–34 | Rana adulta sentada, con manchas suaves en la espalda, segura de sí misma |
| `sage` · Rana sabia | 35+ | Rana anciana y sabia, cejas pobladas, pequeña barba blanca, aura dorada sutil |

| Ánimo (id) | Cuándo | Expresión |
|---|---|---|
| `happy` | Todo al día, día perfecto | Ojos cerrados en arco sonriendo, boca abierta feliz |
| `neutral` | Normal | Ojos abiertos, sonrisa suave |
| `worried` | Hay tareas atrasadas | Cejas inclinadas, pupilas pequeñas, boca ondulada |
| `sad` | Lleva días perdiendo XP | Cejas caídas, lágrima, boca hacia abajo |
| `sleeping` | Modo vacaciones | Ojos cerrados, «Zzz», postura relajada |

**Importante**: los accesorios se colocan encima, así que las 25 imágenes deben mantener **la misma posición de cabeza y cuello por etapa** (genera primero la de `neutral` y pide las demás "con la misma pose y encuadre").

## 3. Pieles (5)

| id | Nombre | Colores |
|---|---|---|
| `skin-green` | Verde charca | #4caf6e / vientre #d9f2c4 |
| `skin-blue` | Azul dardo | Azul cobalto con manchas negras (rana dardo) |
| `skin-pink` | Rosa chicle | Rosa pastel, vientre crema |
| `skin-gold` | Dorada | Dorado metálico con brillos |
| `skin-midnight` | Medianoche | Azul marino con pecas que brillan como estrellas |

Opción barata: generar la rana solo en verde y aplicar el color con un filtro (`hue-rotate`) o capa de color en CSS. Opción buena: 5 pieles × 25 = 125 imágenes (recomendado solo para `neutral` y `happy`).

## 4. Accesorios (19)

Lienzo 1024×1024, objeto centrado, vista frontal, mismo estilo.

**Sombreros (9)**: `hat-party` gorrito de fiesta de cono con pompón · `hat-flower` flor de nenúfar rosa · `hat-cap` gorra deportiva verde con visera hacia delante · `hat-beanie` gorro de lana con pompón a rayas · `hat-beret` boina roja ladeada · `hat-tophat` chistera negra con cinta verde · `hat-wizard` sombrero de mago morado con estrellas · `hat-crown` corona dorada con gemas · `hat-astronaut` casco de astronauta transparente.

**Cuello (6)**: `neck-bandana` pañuelo rojo de cowboy · `neck-bowtie` pajarita · `neck-tie` corbata · `neck-scarf` bufanda de rayas · `neck-medal` medalla dorada con cinta · `neck-pearls` collar de perlas.

**Gafas (4)**: `eyes-round` gafas redondas de pasta · `eyes-sun` gafas de sol negras · `eyes-heart` gafas en forma de corazón rosas · `eyes-monocle` monóculo dorado con cadena.

### Puntos de anclaje (en % del lienzo de la rana)

| Etapa | Sombrero (x, y, escala) | Gafas (y, escala) | Cuello (x, y, escala) |
|---|---|---|---|
| tadpole | 45,8 % · 35,8 % · 0,66 | 48,3 % · 0,56 | 45 % · 73,3 % · 0,55 |
| froglet | 47,9 % · 34,2 % · 0,78 | 37,5 % · 0,70 | 50 % · 65 % · 0,75 |
| young | adulta × 0,8 centrada en (50 %, 92,5 %) | | |
| adult | 50 % · 25,8 % · 0,95 | 31,7 % · 1 | 50 % · 63,3 % · 1 |
| sage | adulta × 1,04 | | |

## 5. Fondos (5) — 1440×1440, sin rana

| id | Prompt |
|---|---|
| `bg-pond` | Charca de día: agua verde azulada, nenúfares, juncos a los lados, cielo claro |
| `bg-sunset` | La misma charca al atardecer, cielo naranja y rosa, sol tras los juncos |
| `bg-night` | Charca de noche con luna llena y estrellas, reflejos en el agua |
| `bg-rain` | Charca en día de lluvia, gotas y ondas en el agua, cielo gris suave |
| `bg-space` | Espacio con planetas y estrellas, un nenúfar flotando en el centro |

Dejar un nenúfar o zona despejada en el centro inferior donde se sienta la rana.

## 6. La charca social (amigos)

| Archivo | Tamaño | Prompt |
|---|---|---|
| `pond-social-day.png` | 1600×1000 (y 1000×1000 para móvil) | Vista elevada de una charca grande con 10 nenúfares repartidos en perspectiva (grandes delante, pequeños al fondo), juncos y flores, sin ranas |
| `pond-social-night.png` | Igual | Misma escena de noche, luciérnagas |
| `lilypad.png` | 512×256 | Un nenúfar visto en perspectiva, para colocar ranas encima |
| `trophy-crown.png` | 256×256 | Pequeña corona/trofeo dorado para el líder semanal |

## 7. Iconos de interfaz pequeños

| Archivo | Prompt |
|---|---|
| `coin.png` (128×128) | Moneda dorada con una huella de rana grabada |
| `xp-drop.png` (128×128) | Gota/estrella verde brillante que representa experiencia |
| `empty-*.png` (512×512) | Ilustraciones para estados vacíos: rana leyendo una lista vacía, rana durmiendo en un nenúfar, rana con prismáticos (amigos) |
| `celebrate-levelup.png` | Rana saltando con confeti (para la ventana de subida de nivel) |

## 8. Integración

1. Guardar en `public/art/` con los nombres de arriba.
2. En `Frog.tsx`, sustituir el cuerpo SVG por `<image href="/art/frog-{etapa}-{ánimo}.png" width="240" height="240" />` dentro del mismo `viewBox="0 0 240 240"`; los accesorios siguen funcionando con los mismos anclajes.
3. Exportar en WebP (≈60–150 KB cada una) y añadir las rutas al precache del service worker solo para la etapa actual.
4. Iconos y splash: sustituir los archivos con el mismo nombre; no hace falta cambiar código.
