# 🐸 Croac

**Gestor de tareas y hábitos gamificado.** Cada tarea que completas da experiencia y monedas a tu rana: crece de renacuajo a rana sabia, y con las monedas le compras sombreros, corbatas, gafas o fondos. Si dejas tareas atrasadas varios días, la app te avisa y la rana pierde experiencia.

Inspirado en lo que ya funciona: la entrada rápida y las vistas *Hoy/Próximo* de **Todoist**, los hábitos y rachas de **TickTick**, las recompensas y penalizaciones de **Habitica** y la mascota que crece de **Finch**.

## Funcionalidades

**Gestión de tareas**
- Crear, editar, duplicar y eliminar tareas (con *deshacer*).
- Estados: **pendiente**, **en proceso** y **completada**.
- Tareas puntuales (con o sin fecha) y **recurrentes**: cada día, cada N días, días laborables, días concretos de la semana, cada N semanas, cada mes (el día X).
- Prioridad (P1–P4), dificultad (define la recompensa), hora de recordatorio, notas, subtareas y etiquetas.
- Listas personalizables (nombre, icono y color). La bandeja de entrada recoge lo que no tiene lista.
- **Entrada rápida en lenguaje natural**, con vista previa de lo que se ha entendido:
  `Leer 20 min cada día a las 22:00 #personal p2 @hábitos` · `Pagar alquiler el 1 de cada mes` · `Dentista el viernes a las 17:30`
- Vistas **Hoy** (atrasadas, para hoy, completadas hoy), **Próximo** (14 días, con las repeticiones futuras) y **Todas las tareas** (agrupadas por fecha, con búsqueda y filtros por estado).
- **Orden personalizado arrastrando** las tarjetas (ratón, dedo o teclado con ↑/↓ sobre el asa), o el orden automático por prioridad y hora.
- **Subtareas dentro de la tarjeta**: se ven, se marcan, se añaden y se quitan sin abrir el editor. Al terminarlas todas, la app propone completar la tarea.
- **Gestos en el móvil**: desliza una tarjeta a la derecha para completarla y a la izquierda para pasarla a mañana. Botón flotante **+** para añadir desde cualquier pantalla.

**La rana**
- 5 etapas de evolución: Renacuajo (nv. 1) → Renacuajo con patas (5) → Ranita (10) → Rana (20) → Rana sabia (35).
- Su ánimo refleja cómo vas: feliz, tranquila, inquieta (tareas de ayer), triste (tareas que ya penalizan) o dormida (modo vacaciones).
- Tienda con 29 artículos en 5 categorías (sombreros, cuello, gafas, pieles y fondos), algunos bloqueados por nivel y otros exclusivos de Pro.

**Reglas del juego**
| Evento | Efecto |
|---|---|
| Completar una tarea | +XP y +monedas según dificultad (trivial 5 · fácil 10 · media 20 · difícil 35 XP) |
| Racha en un hábito | +5 % por repetición seguida, hasta +50 % |
| Completar todo lo del día | «Día perfecto»: +25 XP y +10 monedas |
| Tarea sin terminar | Pasa al día siguiente. Si la haces entonces, recibes el 75 % y no pierdes nada |
| Más de *N* días atrasada (por defecto 1) | Aviso + pérdida diaria de XP (½ de la recompensa base × factor de prioridad). Se puede bajar de nivel |
| Volver tras una ausencia | La penalización tiene un tope de 7 días, para no hundir a nadie |
| Modo vacaciones | Sin penalizaciones |

Al abrir la app en un día nuevo aparece la **revisión del día**: puedes marcar lo que hiciste ayer y no apuntaste *antes* de que se apliquen penalizaciones.

**Además:** estadísticas (racha, mapa de constancia, hábitos de la semana, tareas por lista), avisos dentro de la app y notificaciones del navegador, tema claro y oscuro (la charca se vuelve nocturna), atajos de teclado, exportar/importar copia en JSON, app instalable que funciona sin conexión y sonidos sintetizados.

## Instalar en el móvil

Para instalarla necesitas tenerla publicada en HTTPS (los navegadores no permiten instalar desde `localhost` en otro dispositivo):

1. Sube el repositorio a GitHub y entra en [vercel.com/new](https://vercel.com/new) → importa el repo → framework **Vite** → *Deploy*. En un minuto tendrás una URL tipo `croac.vercel.app`.
2. **Android (Chrome):** abre la URL; aparecerá el aviso «Instala Croac en tu móvil» (o menú ⋮ → *Instalar aplicación*).
3. **iPhone (Safari):** abre la URL → botón *Compartir* → *Añadir a pantalla de inicio* → *Añadir*.
4. **Ordenador (Chrome/Edge):** icono de instalar en la barra de direcciones, o *Ajustes → Instalar la app* dentro de Croac.

Incluye todo lo necesario: iconos normales y *maskable* para Android, `apple-touch-icon` y pantallas de arranque para iPhone (claro y oscuro), favicon, capturas para la ficha de instalación y *service worker* para funcionar sin conexión.

## Empezar

Requisitos: Node.js 20.19 o superior.

```bash
npm install
npm run dev        # http://localhost:5173
```

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Comprueba tipos y genera `dist/` |
| `npm run build:single` | Genera un único `dist-single/index.html` autocontenido (útil para demos) |
| `npm test` | Tests de la lógica (Vitest) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript sin emitir |

### Desplegar

Es una web estática: funciona en Vercel, Netlify, GitHub Pages o Cloudflare Pages sin configuración extra (usa rutas con `#`, así que no necesita redirecciones). En Vercel: *Import project* → framework **Vite** → listo.

### Subir a GitHub

```bash
git init -b main          # si la carpeta aún no es un repositorio
git add .
git commit -m "Primera versión de Croac"
git remote add origin https://github.com/<tu-usuario>/croac.git
git push -u origin main
```

El workflow de `.github/workflows/ci.yml` comprueba tipos, lint, tests y build en cada push. Tras el primer `npm install`, sube también `package-lock.json`.

## Arquitectura

```
src/
├── domain/        Lógica pura, sin React: fechas, recurrencias, motor del juego,
│   │              progresión, tienda, planes, parser de lenguaje natural, estadísticas
│   └── __tests__/ Tests de todo lo anterior
├── store/         Estado global (store mínimo tipo Zustand), persistencia versionada
│                  con migraciones, acciones y selectores
├── components/    UI reutilizable: ui/ (botones, modal, menús, toasts…), tasks/ (tarjeta,
│                  lista arrastrable, editor), frog/, brand/ (logo), layout/
├── features/      Piezas transversales: revisión diaria, bienvenida, celebraciones,
│                  recordatorios, atajos, instalación (PWA)
├── pages/         Una por ruta: Hoy, Próximo, Tareas, Rana, Tienda, Estadísticas, Ajustes
└── lib/           Router por hash, sonidos, utilidades
```

Decisiones pensadas para crecer:

- **El dominio es puro.** `domain/engine.ts` recibe estado + contexto (`{ today, now }`) y devuelve nuevo estado + eventos. Se testea sin navegador y se puede mover tal cual a un backend o a una app móvil (React Native) cuando haga falta.
- **Persistencia detrás de un adaptador** (`store/persistence.ts`). Hoy es `localStorage`; para sincronizar entre dispositivos basta con implementar `StorageAdapter` contra una API (Supabase, Firebase o un backend propio). Los datos llevan `version` y pasan por `migrate()`, así que cambiar el esquema no rompe a los usuarios existentes.
- **Monetización por *entitlements*** (`domain/plans.ts`). La app pregunta `can(plan, 'premiumItems')` en lugar de mirar el plan; añadir un plan o mover una función a Pro es configuración. Los artículos de la tienda tienen `premium` y `minLevel`.
- **Mínimas dependencias en runtime**: solo React. Router, store e iconos son propios y pequeños, y se pueden cambiar por React Router / Zustand / Lucide sin tocar las páginas.
- **Diseño con tokens** (variables CSS + `@theme` de Tailwind 4): el modo oscuro y futuros temas solo redefinen variables, incluida la escena de la charca.

Para regenerar iconos y pantallas de arranque a partir del logo, el dibujo está en `public/logo.svg` (512×512).

Más detalle y próximos pasos en [`docs/ROADMAP.md`](docs/ROADMAP.md).

## Licencia

MIT
