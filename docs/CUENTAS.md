# Activar cuentas, sincronización y amigos (Supabase)

Sin esto Croac funciona igual, pero los datos viven solo en cada dispositivo y la charca solo muestra tu rana. Con Supabase (plan gratuito) tienes:

- Inicio de sesión con correo y contraseña.
- **Sincronización** entre móvil y ordenador (la última modificación gana).
- **Amigos** por código o enlace de invitación, **charca compartida** y **ranking semanal**.

## 1. Crear el proyecto (5 minutos)

1. Entra en [supabase.com](https://supabase.com) → *New project*. Región recomendada: **West EU (Ireland)** o **Central EU (Frankfurt)**.
2. Cuando esté listo, ve a **SQL Editor → New query**, pega el contenido de [`supabase/schema.sql`](../supabase/schema.sql) y pulsa **Run**. Se puede volver a ejecutar sin problema.
3. **Authentication → Sign In / Providers → Email**:
   - Para empezar rápido, desactiva **Confirm email** (las cuentas se crean y entran al momento).
   - Si lo dejas activado, la app avisa de que hay que confirmar el correo y luego entrar.
4. **Authentication → URL Configuration → Site URL**: pon la URL de Vercel (p. ej. `https://croac.vercel.app`).
5. **Project Settings → API**: copia **Project URL** y la clave **anon public**.

## 2. Configurar la app

En local, crea un archivo `.env` (no se sube a Git) a partir de `.env.example`:

```bash
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

En **Vercel → Project → Settings → Environment Variables** añade las mismas dos variables y vuelve a desplegar (*Deployments → Redeploy*).

La clave *anon* es pública por diseño: la seguridad la ponen las políticas RLS del esquema (cada usuario solo puede leer y escribir lo suyo y ver el perfil de sus amigos). **Nunca** pongas la clave `service_role` en la app.

## 3. Probar

1. Abre la app → **Ajustes → Tu cuenta → Crear cuenta**.
2. La primera vez en un dispositivo con datos, te pregunta si quieres conservar los de la cuenta o subir los del dispositivo.
3. En otro dispositivo, entra con la misma cuenta: verás las mismas tareas.
4. **Amigos → Invitar** comparte un enlace `…/#/amigos?codigo=XXXXXXXX`. Al abrirlo, tu amigo crea su cuenta y pulsa *Añadir*.

## Cómo funciona por dentro

| Tabla | Para qué |
|---|---|
| `profiles` | Perfil público: nombre de usuario, código de amigo y estadísticas de la rana (nivel, ánimo, complementos, XP y tareas de la semana) |
| `friendships` | Solicitudes y amistades (`pending` → `accepted`) |
| `user_state` | Copia completa del estado de la app de cada usuario (JSON) para sincronizar |

- La función `send_friend_request(code)` busca el código sin exponer el resto de perfiles y, si la otra persona ya te había enviado solicitud, la acepta.
- El cliente usa la API REST de Supabase directamente (`src/services/backend.ts`), sin SDK. Cambiar de proveedor = escribir otra implementación de la interfaz `Backend` (`src/services/types.ts`).
- El ranking usa las estadísticas que publica cada cliente. Es suficiente entre amigos, pero se puede falsear editando el navegador; ver la auditoría para la versión a prueba de trampas.
