# Croac · resumen técnico del proyecto

> Documento pensado para revisar el proyecto con otra herramienta (o persona). Describe qué hace la app, cómo está construida, dónde está cada cosa y qué limitaciones conocidas tiene. Versión 1.0.0, noviembre de 2026.

## 1. Qué es

**Croac** es un gestor de tareas y hábitos gamificado, en español, para móvil y ordenador (PWA instalable). Cada tarea completada da experiencia (XP) y monedas a una rana mascota que evoluciona en 5 etapas. Las tareas que llevan varios días atrasadas restan XP. Las monedas se gastan en complementos (sombreros, corbatas, gafas, pieles, fondos). Con cuenta, se sincroniza entre dispositivos y se pueden añadir amigos para ver sus ranas en una charca compartida y competir en un ranking semanal.

Referencias de producto: Todoist (entrada rápida, vistas Hoy/Próximo, prioridades P1–P4), TickTick (hábitos, rachas), Habitica (recompensas y penalizaciones, revisión del día anterior), Finch (mascota que crece), Duolingo (rachas, ligas entre amigos).

## 2. Stack

| Capa | Tecnología |
|---|---|
| UI | React 19 + TypeScript (estricto) |
| Estilos | Tailwind CSS 4 con tokens en variables CSS (`src/index.css`), tema claro y oscuro |
| Build | Vite 7 (`vite-plugin-singlefile` para una demo en un solo HTML) |
| Estado | Store propio tipo Zustand (`src/store/createStore.ts`) sobre `useSyncExternalStore` |
| Router | Propio, por hash (`#/hoy`), sin dependencias (`src/lib/router.ts`) |
| Iconos | SVG propios estilo Lucide (`src/components/ui/Icon.tsx`) |
| Gráficos de la rana | Por capas: cuerpo por etapa + expresión común + complementos (WebP en `public/art/`), colocados con anclajes (`src/components/frog/art.ts`) y ajustes por complemento y etapa (`accessory-fit.json` o publicados por un administrador desde el probador `#/admin/probador`) |
| Persistencia local | `localStorage` con versión y migraciones (`src/store/persistence.ts`) |
| Backend (opcional) | Supabase: Auth + PostgREST vía `fetch`, sin SDK (`src/services/`), esquema en `supabase/schema.sql` |
| Tests | Vitest (lógica de dominio, 38 tests) |
| Calidad | ESLint 9 + typescript-eslint, CI en GitHub Actions (tipos, lint, tests, build) |
| Hosting | Vercel (estático); `vercel.json` con cabeceras de seguridad y caché |

Dependencias de producción: solo `react` y `react-dom`.

## 3. Estructura

```
croac/
├── index.html                  Metadatos PWA, iconos, pantallas de arranque iOS, fuentes
├── public/                     manifest, service worker (sw.js), iconos, splash, capturas, logo
├── supabase/schema.sql         Tablas, políticas RLS y función de amistad por código
├── docs/                       RESUMEN (este), AUDITORIA, IMAGENES, CUENTAS, ROADMAP
├── vercel.json                 Cabeceras de seguridad y caché
└── src/
    ├── main.tsx / App.tsx      Arranque, rutas, tema, reloj, sincronización
    ├── index.css               Tokens de diseño (claro/oscuro), animaciones
    ├── domain/                 LÓGICA PURA (sin React ni navegador)
    │   ├── types.ts            Modelo de datos (Task, HistoryEntry, AppState, GameEvent…)
    │   ├── dates.ts            Fechas como "YYYY-MM-DD", día lógico, formato en español
    │   ├── recurrence.ts       Repeticiones: diaria/cada N días, semanal con días, mensual
    │   ├── engine.ts           Motor: completar, deshacer, rachas, cierre diario, penalizaciones, tienda
    │   ├── progression.ts      XP por dificultad, curva de niveles, etapas de la rana
    │   ├── tasks.ts            Crear/editar tareas, orden manual, copias para reprogramar
    │   ├── parser.ts           Entrada rápida en lenguaje natural ("Leer cada día a las 22:00 #personal p2")
    │   ├── shop.ts             Catálogo de 29 artículos, reglas de compra
    │   ├── plans.ts            Gratis / Pro y funciones bloqueadas (entitlements)
    │   ├── stats.ts            Estadísticas, hábitos de la semana
    │   ├── defaults.ts         Estado inicial, listas y tareas sugeridas
    │   └── __tests__/          Tests de todo lo anterior
    ├── store/
    │   ├── appStore.ts         Estado global + guardado con debounce + sincronización entre pestañas
    │   ├── persistence.ts      Adaptador de almacenamiento, migraciones y saneado de datos
    │   ├── actions.ts          Única puerta de escritura: llama al motor y emite eventos
    │   ├── selectors.ts        Datos derivados memorizados (rana, rachas, grupos de Hoy)
    │   └── uiStore.ts          Estado de interfaz (toasts, editor, celebraciones) y bus de eventos
    ├── services/               Backend opcional
    │   ├── types.ts            Interfaz Backend, Profile, Session, errores traducidos
    │   ├── backend.ts          Implementación Supabase (REST)
    │   ├── account.ts          Sesión, renovación de tokens, perfil, estadísticas públicas
    │   ├── sync.ts             Sincronización del estado (fusión + subida condicional) y publicación del perfil
    │   ├── merge.ts            Fusión de dos copias del estado sin perder nada (marcas de borrado)
    │   ├── backups.ts          Copias automáticas en el dispositivo (las de la nube: user_state_versions)
    │   └── social.ts           Amigos, solicitudes, puntuación semanal, enlace de invitación
    ├── components/
    │   ├── ui/                 Button, Modal (hoja inferior en móvil), Menu, Segmented, Switch, Toaster…
    │   ├── tasks/              TaskItem (tarjeta), Sortable (arrastrar), TaskEditor, QuickAdd, RecurrencePicker
    │   ├── frog/               Frog (imágenes por etapa, ánimo y piel), art.ts (anclajes), layout.ts + accessory-fit.json
    │   │                       (encaje de complementos), skins.ts + LayeredBody (pieles por capas, preparado)
    │   ├── layout/             AppShell (barra lateral, cabecera móvil, barra inferior, botón +)
    │   ├── common/             MiniCalendar (selección múltiple de días)
    │   └── brand/              Logo
    ├── features/               Revisión diaria, bienvenida, celebraciones, recordatorios, atajos, repetir tareas,
    │                           instalación PWA, cuenta (login, conflicto de sincronización), ErrorBoundary
    ├── pages/                  Hoy, Próximo, Tareas, Historial, Rana, Charca, Amigos, Tienda, Estadísticas, Ajustes
    └── dev/wardrobe/           Probador de complementos (administradores o npm run dev; se carga aparte)
```

## 4. Modelo de datos (resumen)

- **Task**: `id, title, notes, listId, tags[], priority (1–4), difficulty (trivial|easy|medium|hard), status (todo|in_progress|done), recurrence, anchorDate, dueDate, time, subtasks[], order, createdAt, updatedAt, completedAt`.
  - Las recurrentes tienen una sola ocurrencia pendiente (`dueDate`); al completarla avanza a la siguiente fecha (modelo Todoist).
- **Recurrence**: `none | daily{interval} | weekly{interval, days[]} | monthly{interval, dayOfMonth}`.
- **HistoryEntry**: registro inmutable de `complete | penalty | bonus | purchase` con XP, monedas, fecha y lo necesario para deshacer.
- **AppState**: `tasks, lists, history, frog{name, xp, coins, owned, equipped}, settings, meta{lastRolloverDate, perfectDays, plan…}, notifications`. Se guarda entero en `localStorage['croac:state']` (y en `user_state` si hay cuenta).

## 5. Reglas del juego

| Evento | Efecto |
|---|---|
| Completar | XP y monedas por dificultad: 5/10/20/35 XP; 1/3/6/10 monedas |
| Racha de un hábito | +5 % por repetición seguida, máximo +50 % |
| Completar tarde (día siguiente) | 75 % de la recompensa, sin castigo |
| Día perfecto (todo lo de hoy hecho) | +25 XP, +10 monedas |
| Atrasada más de N días (margen configurable, por defecto 1) | Aviso + pérdida diaria = ½ XP base × factor de prioridad (P1 1,5 · P2 1,25 · P3 1 · P4 0,75); en proceso, la mitad |
| Ausencia larga | Penalización con tope de 7 días |
| Modo vacaciones | Sin penalizaciones |
| Niveles | XP para subir del nivel L al L+1 = 50 + 25·(L−1). Se puede bajar de nivel |
| Etapas | Renacuajo (1), con patas (5), Ranita (10), Rana (20), Rana sabia (35) |

**Cierre diario**: al abrir la app en un día nuevo se muestran las tareas vencidas sin marcar para que el usuario indique cuáles hizo; después se aplican avisos y penalizaciones (`engine.rollover`). El "día" puede empezar a otra hora (0–6 h).

## 6. Funcionalidades

- Tareas puntuales y recurrentes, subtareas visibles y marcables en la tarjeta, prioridad, dificultad, listas con icono y color, etiquetas, notas, hora de recordatorio.
- Entrada rápida en lenguaje natural con vista previa de lo entendido.
- Vistas Hoy, Próximo (14 días, con repeticiones futuras), Todas (búsqueda y filtros), Historial (volver a programar una tarea en uno o varios días).
- Orden manual arrastrando (ratón, táctil y teclado) u orden automático por prioridad.
- Gestos en móvil: deslizar a la derecha completa, a la izquierda pospone.
- Rana con 5 etapas, 5 ánimos, tienda, armario; celebraciones al subir de nivel.
- Estadísticas: racha, días perfectos, barras de 14 días, mapa de constancia, hábitos, por lista.
- El patio del complemento: cada semana se compra un lienzo (150 monedas), se dibuja un gorro, cuello o gafas, se vota (3 votos) y el ganador entra gratis en la tienda con premio para su autor (`docs/PATIO.md`).
- Navegación: «Hoy» (lo que toca hoy) y «Tareas» (todo, agrupado por fechas); listas en la barra lateral. Historial en forma de calendario.
- Sin conexión: el service worker guarda la app y las ilustraciones del usuario (`services/offline.ts`); los datos viven en el dispositivo y se sincronizan al volver la conexión.
- Regalo de bienvenida (`domain/welcome.ts`): un complemento sencillo o 50 monedas, una vez por cuenta.
- Cuenta opcional: sincronización entre dispositivos, recuperación de contraseña, borrar cuenta, amigos por código/enlace (la invitación se envía sola), charca compartida ilustrada y ranking semanal.
- PWA: instalable (Android, iOS, escritorio), funciona sin conexión, iconos y pantallas de arranque.
- Ajustes: margen de penalización, vacaciones, inicio del día, tema, notificaciones, sonidos, orden, plan (Pro en demo), exportar/importar JSON, borrar todo.

## 7. Flujo de datos

1. La UI llama a `actions.*` (store/actions.ts).
2. Las acciones ejecutan funciones puras del dominio con un contexto `{ today, now }` y guardan el nuevo estado.
3. El motor devuelve **eventos** (recompensa, subida de nivel, penalización…). `features/GameFeedback.tsx` los traduce en toasts, sonidos y celebraciones.
4. `appStore` guarda en `localStorage` con debounce; `services/sync.ts` sube el estado a Supabase si hay sesión y publica las estadísticas del perfil.

## 8. Cómo ejecutarlo

```bash
npm install
npm run dev          # desarrollo
npm test             # tests de dominio
npm run build        # tipos + build de producción
```

Variables opcionales (`.env`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (ver `docs/CUENTAS.md`).

## 9. Limitaciones conocidas

Ver `docs/AUDITORIA.md` para el detalle. Las principales: el cierre diario y el ranking se calculan en el cliente (se pueden falsear),  los recordatorios solo funcionan con la app abierta y falta la política de privacidad.

## 10. Qué revisar con más atención

1. `src/domain/engine.ts`: lógica de recompensas, rachas y penalizaciones (casos límite de fechas).
2. `src/services/sync.ts`: posibles pérdidas de datos en conflictos.
3. `supabase/schema.sql`: políticas RLS (privacidad entre usuarios).
4. `src/components/tasks/Sortable.tsx` y `TaskItem.tsx`: gestos táctiles y accesibilidad.
5. Rendimiento con historiales grandes (`selectors.ts`, `stats.ts`).
