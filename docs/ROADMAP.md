# Hoja de ruta y sugerencias

La v0.3 añade cuentas, sincronización, amigos, la charca compartida y el historial. Lo pendiente de seguridad y calidad está priorizado en [`AUDITORIA.md`](AUDITORIA.md). Esto es lo que sugiero a continuación, ordenado por impacto.

**Hecho en v0.3**: cuentas con Supabase, sincronización entre dispositivos (último en guardar gana), amigos por código o enlace, charca con ranking semanal, historial con reprogramación en varios días.

## 1. Cuentas y sincronización (necesario para escalar)

- ~~Backend con Supabase~~ (hecho: perfiles, amistades y estado en JSON).
- Siguiente paso: tablas normalizadas (`tasks`, `history`) y fusión por entidad en lugar de "gana el último"; guardar *eventos* y recalcular en servidor para que el ranking no se pueda falsear.
- **El cierre diario debe pasar al servidor** (cron a medianoche por zona horaria del usuario). Hoy se ejecuta al abrir la app, lo que es suficiente en local pero manipulable.
- Iniciar sesión con Google/Apple para reducir fricción.

## 2. Notificaciones de verdad

- **Web Push** (VAPID) desde el backend: recordatorios a su hora y aviso «Rani lleva 2 días esperando» aunque la app esté cerrada. El service worker ya gestiona `notificationclick`.
- Resumen diario opcional por la mañana («Hoy tienes 5 tareas, 2 atrasadas»).

## 3. Producto

- **Arrastrar entre días** en *Próximo* para reprogramar (el orden dentro de un grupo ya se puede arrastrar).
- **Vista calendario** mensual.
- **Modo foco / Pomodoro** que da XP extra (TickTick lo hace y engancha mucho).
- **Hábitos con objetivo numérico** («beber 8 vasos»: 3/8) y hábitos negativos («no fumar»).
- **Recordatorios múltiples** y fechas límite separadas de la fecha programada.
- **Plantillas** de rutinas (mañana, estudio, gimnasio).
- **Internacionalización**: extraer los textos a `i18n/es.json` antes de que crezcan más; el dominio ya formatea fechas de forma aislada (`domain/dates.ts`).
- Accesibilidad: auditoría con lector de pantalla y navegación por teclado completa en listas (flechas + atajos por tarea).

## 4. Gamificación (retención)

- **Logros** («7 días seguidos», «100 tareas», «primera tarea difícil») con insignias en el perfil de la rana.
- **Protector de racha** comprable en la tienda (como Duolingo): salva la racha un día.
- **Comida/cuidados**: gastar monedas en moscas para subir el ánimo; añade un sumidero de monedas recurrente.
- **Eventos de temporada** (gorro de Papá Noel en diciembre, calabaza en octubre): artículos limitados que generan visitas.
- **Social** (base hecha): retos semanales entre amigos, reacciones («¡croac!») a las tareas de otros, ligas tipo Duolingo, tareas compartidas en pareja.

## 5. Monetización

Modelo recomendado: **freemium** con suscripción (2,99–4,99 €/mes o ~24–29 €/año) y compras puntuales de cosméticos.

| Gratis | Pro |
|---|---|
| Tareas y hábitos ilimitados | Sincronización entre dispositivos |
| Hasta 8 listas | Listas ilimitadas |
| 90 días de estadísticas | Historial completo y estadísticas avanzadas |
| Tienda básica | Artículos, pieles y fondos exclusivos · temas de color |

- Pagos: **Stripe Checkout** en web; en móvil, **RevenueCat** para gestionar App Store / Google Play.
- La capa `domain/plans.ts` ya decide qué está bloqueado; el botón «Probar Pro (demo)» de Ajustes es donde irá el checkout.
- Nunca vender XP ni progreso: rompe la motivación (y la confianza). Solo cosméticos y comodidad.

## 6. Móvil

- La PWA ya es instalable. Para tiendas: **Capacitor** (reutiliza todo el código) o **React Native/Expo** reutilizando `src/domain/` tal cual.
- Widgets de pantalla de inicio con la rana y las tareas de hoy (solo nativo).

## 7. Ideas rápidas de UX

- **Widget de «siguiente tarea»** en el panel de la rana: la primera de tu orden personalizado, con botón de completar.
- **Modo foco**: al marcar una tarea «en proceso», un temporizador opcional que suma XP extra.
- **Vibración háptica** (`navigator.vibrate`) al completar y al soltar una tarjeta en Android.
- **Deshacer con gesto**: agitar el móvil o pulsar Ctrl+Z para deshacer la última acción.
- **Temas de color** desbloqueables en la tienda (atardecer, nenúfar rosa…), aprovechando que todo son tokens.

## 8. Calidad

- Tests de componentes con Testing Library y tests end-to-end con Playwright (alta, completar, cierre de día).
- Analítica respetuosa con la privacidad (Plausible/PostHog) para medir retención D1/D7/D30 y qué hace que la gente vuelva.
- Sentry para errores en producción.
