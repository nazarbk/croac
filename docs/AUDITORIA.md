# Croac · auditoría técnica (v1.0.0)

> Revisión interna de calidad, seguridad, rendimiento, accesibilidad y preparación para escalar. Prioridad: **Alta** = puede perder datos, romper la app o exponer información; **Media** = afecta a la experiencia o al crecimiento; **Baja** = mejora.

## 0. Novedades de la v1.0

| Área | Cambio |
|---|---|
| Cuentas | Vuelta desde los enlaces de correo (confirmar cuenta, recuperar contraseña): la app lee los tokens del enlace, entra y pide elegir nombre o contraseña nueva. Errores de enlace caducado traducidos |
| Cuentas | El nombre de usuario se comprueba **antes** de crear la cuenta (`username_available`); si aun así falla, se pide otro nombre sin volver a registrarse |
| Cuentas | «Borrar mi cuenta» en Ajustes (`delete_my_account`) |
| Amigos | Las invitaciones por enlace se guardan y se envían solas en cuanto el invitado tiene cuenta |
| Seguridad | Máximo 20 solicitudes de amistad por hora (contra probar códigos al azar); permisos explícitos de la API en `schema.sql` |
| Errores | Mensajes claros si falta el esquema, la URL o la clave están mal, hay límite de correos o el correo no es válido |
| Móvil | Añadir varias subtareas desde «Más opciones» (los teclados de Android enviaban el formulario con «Intro»); la entrada rápida pasa lo escrito al editor completo |
| Móvil | Controles del editor a todo el ancho, prioridad en rejilla 2×2, etiquetas de evolución que no se cortan a 360 px |
| Rendimiento | Ilustraciones en WebP (~45 KB por rana) cargadas bajo demanda; pantallas de arranque de 1 MB a ~130 KB |
| Compartir | Imagen de vista previa (`og.jpg`) con URL absoluta para WhatsApp |

## 1. Corregido en la v0.3

| Área | Problema | Solución |
|---|---|---|
| Robustez | Un error en cualquier pantalla dejaba la app en blanco | `features/ErrorBoundary.tsx`: pantalla de recuperación con «Recargar» y descarga de copia de emergencia. Se reinicia al cambiar de página |
| Datos | Un JSON importado o guardado con campos corruptos rompía la app al leerlo | `migrate()` sanea tareas, historial, listas, rana, ajustes y meta; descarta registros inválidos |
| Datos | Si `localStorage` estaba lleno o bloqueado (modo privado de Safari) los cambios se perdían en silencio | `save()` devuelve `false` y se avisa al usuario una vez para que exporte |
| Seguridad | Sin cabeceras de seguridad en Vercel | `vercel.json`: `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options`; `sw.js` sin caché; `/assets` inmutables |
| Funcional | La repetición personalizada no permitía editar ni elegir días | `RecurrencePicker` reescrito con modo local y días de la semana |
| Build | Error de tipos en Vercel por limpiezas de efectos que devolvían `boolean` | `subscribe`/`onGameEvents` devuelven `void` |
| Privacidad | — | Los perfiles (visibles solo para ti y tus amigos o solicitudes) exponen nombre de usuario, rana, nivel y estadísticas semanales; el estado completo (`user_state`) solo lo lee su dueño (RLS) |

## 2. Pendiente (recomendaciones)

| # | Prioridad | Área | Hallazgo | Recomendación |
|---|---|---|---|---|
| P1 | Media | Datos | En iOS, la PWA instalada y Safari tienen almacenamientos separados; sin cuenta, el usuario puede "perder" sus tareas al instalar | **Mitigado**: aviso en las instrucciones de iOS para crear cuenta antes. Falta ofrecer exportar desde ahí |
| P2 | Alta | Competición | Las estadísticas del ranking (`week_xp`, `week_tasks`, `streak`) las publica el cliente: se pueden falsear con la consola | Mover recompensas a eventos en servidor (tabla `events` + función que recalcula), o al menos validar límites (p. ej. máximo XP/día) en una función `security definer` |
| P3 | Alta | Sincronización | "Gana el último que guarda": dos dispositivos editando sin conexión pierden cambios del primero | Fusionar por entidad: `updatedAt` por tarea, historial como unión por `id`. A medio plazo, tablas normalizadas (`tasks`, `history`) en lugar de un JSON único |
| P4 | Alta (antes de abrirlo al público) | Legal | Falta política de privacidad (RGPD) | **Borrar cuenta: hecho.** Falta una página de privacidad antes de abrir la app a desconocidos |
| P5 | Media | Rendimiento | El historial crece sin límite; con años de uso `localStorage` (≈5 MB) puede llenarse | Compactar el historial antiguo en resúmenes diarios a partir de 1 año o mover a IndexedDB |
| P6 | Media | Rendimiento | El cálculo de rachas recorre tareas × historial | Índice `taskId → fechas completadas` memorizado en `selectors.ts` |
| P7 | Media | Producto | Los recordatorios solo funcionan con la app abierta | Web Push (VAPID) desde una Edge Function programada, o envoltorio nativo (Capacitor) con notificaciones locales |
| P8 | Baja | Seguridad | El código de amigo (8 caracteres hex) se podía probar por fuerza bruta | **Hecho**: 20 solicitudes/hora. Pendiente: bloquear usuarios |
| P9 | Media | Competición | Las penalizaciones y el modo vacaciones no afectan al ranking, pero restan XP total: el nivel de la charca puede bajar | Decidir regla: el ranking solo cuenta XP ganada (actual) — documentarlo en la UI |
| P10 | Media | Accesibilidad | Arrastrar tiene alternativa de teclado, pero faltan anuncios `aria-live` al reordenar y algunos contrastes de texto secundario en modo oscuro rondan 4.3:1 | Añadir región `aria-live` y subir `--color-muted` oscuro un punto |
| P11 | Media | Calidad | Solo hay tests de dominio | Tests de componentes (Testing Library) para editor y revisión diaria; E2E con Playwright de los flujos críticos (crear, completar, deshacer, sincronizar) |
| P12 | Baja | Rendimiento | Todo el código va en un único bundle | `React.lazy` para Charca, Amigos, Estadísticas, Tienda y Ajustes |
| P13 | Baja | PWA | La caché del service worker no tiene límite de entradas | Limpiar entradas viejas al activar y limitar a N recursos |
| P14 | Baja | Privacidad | Google Fonts se carga desde Google (transferencia de IP a terceros, problemático en la UE) | Alojar las fuentes en `/public/fonts` |
| P15 | Baja | Mantenimiento | No hay `package-lock.json` en el repositorio | Hacer `npm install` local y subir el lockfile para builds reproducibles |
| P17 | Media | Patio | El precio del lienzo y el premio del ganador se cobran en el dispositivo (como el resto de monedas): con la consola se pueden conseguir lienzos sin pagar. Lo demás (una entrada por semana, votos, denuncias, ganador) lo valida el servidor | Libro de monedas en servidor (`coin_events`) y una función `buy_canvas()` que descuente y conceda el lienzo |
| P16 | Baja | Internacionalización | Textos en español escritos en los componentes | Extraer a un diccionario (`i18n/es.ts`) antes de traducir |

## 3. Arquitectura: valoración

- **Bien**: dominio puro y testeado, separado de React; acciones como única puerta de escritura; eventos de juego desacoplados de la UI; migraciones versionadas; interfaz `Backend` que permite cambiar Supabase por otro proveedor; `plans.ts` preparado para monetizar.
- **A vigilar**: `AppState` como un único documento escala mal a muchos datos y a colaboración; el cálculo de "hoy" depende del reloj del dispositivo (cambiar la hora permite saltarse penalizaciones).

## 4. Seguridad de Supabase (revisar `supabase/schema.sql`)

- RLS activado en `profiles`, `friendships` y `user_state`.
- `profiles`: cada usuario lee su perfil y el de quienes tienen una amistad o solicitud con él (la búsqueda por código pasa por la función `send_friend_request`, que no expone perfiles); escritura solo del propio perfil; `friend_code` no se puede cambiar (trigger).
- `friendships`: cada usuario ve y borra solo las suyas; aceptar solo el destinatario.
- `user_state`: solo su dueño.
- La clave `anon` es pública por diseño; nunca usar la `service_role` en el cliente.

## 5. Monetización (estado)

`domain/plans.ts` define Gratis/Pro y funciones bloqueadas (artículos premium, días de estadísticas, listas). Falta: pasarela (Stripe Checkout + webhook en Edge Function que guarde el plan en una tabla `subscriptions`) y comprobar el plan en servidor.
