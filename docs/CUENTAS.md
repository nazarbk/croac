# Activar cuentas, amigos y la charca (Supabase)

Sin esto Croac funciona, pero cada dispositivo guarda sus propios datos y no se pueden añadir amigos. Con Supabase (gratis) tienes:

- Cuenta con correo y contraseña (con «¿Has olvidado la contraseña?»).
- **Sincronización** entre el móvil y el ordenador.
- **Amigos** por código o enlace de invitación, **charca compartida** y **ranking semanal**.

Tardas unos 10 minutos. Hazlo una sola vez.

---

## Paso 1 · Crear el proyecto en Supabase

1. Entra en [supabase.com](https://supabase.com) con tu cuenta de GitHub → **New project**.
   - *Name*: `croac` · *Region*: **Europe (Frankfurt o Ireland)** · apunta la contraseña de la base de datos (no la necesitarás en la app).
2. Espera a que termine de crearse (1-2 minutos).

## Paso 2 · Crear las tablas

1. Menú izquierdo → **SQL Editor** → **New query**.
2. Copia **todo** el contenido de [`supabase/schema.sql`](../supabase/schema.sql), pégalo y pulsa **Run**.
3. Debe decir *Success. No rows returned*. Si lo vuelves a ejecutar más adelante (por ejemplo, tras una actualización de la app), no pasa nada.

## Paso 3 · Configurar el inicio de sesión

Menú izquierdo → **Authentication**:

1. **Sign In / Providers → Email**
   - **Confirm email: desactívalo** para la prueba con amigos. Así la cuenta se crea y entra al momento.
     > Con «Confirm email» activado, Supabase solo puede enviar unos pocos correos por hora con su servidor gratuito: si varios amigos se registran a la vez, algunos no recibirán el correo. Para más adelante, configura un SMTP propio (Resend, Brevo…) en *Authentication → Emails → SMTP Settings*.
   - Guarda.
2. **URL Configuration**
   - **Site URL**: la dirección de tu app en Vercel, por ejemplo `https://croac.vercel.app`.
   - **Redirect URLs** → *Add URL*: `https://croac.vercel.app/**` (y `http://localhost:5173/**` si pruebas en local).
   - Sirve para que los enlaces de los correos (recuperar contraseña o confirmar cuenta) vuelvan a tu app.

## Paso 4 · Copiar las claves

**Project Settings → API Keys** (o el botón **Connect** de arriba):

- **Project URL**: `https://xxxxxxxx.supabase.co`
- **Publishable key** (`sb_publishable_…`). Si tu proyecto muestra las claves antiguas, usa la **anon public** (`eyJ…`).

Las dos son públicas por diseño: la seguridad la ponen las reglas (RLS) del paso 2. **Nunca** uses la *secret key* / *service_role* en la app.

## Paso 5 · Ponerlas en Vercel

1. [vercel.com](https://vercel.com) → tu proyecto **croac** → **Settings → Environment Variables**.
2. Añade (marcando *Production*, *Preview* y *Development*):

   | Nombre | Valor |
   |---|---|
   | `VITE_SUPABASE_URL` | la Project URL |
   | `VITE_SUPABASE_ANON_KEY` | la publishable (o anon) key |

3. **Deployments** → el último → **⋯ → Redeploy**. Las variables solo se aplican en un despliegue nuevo.

Para probar en local, crea un archivo `.env` (no se sube a Git) copiando `.env.example` con los mismos valores.

## Paso 6 · Comprobar que funciona

1. Abre la app → **Ajustes**. La tarjeta debe decir **Tu cuenta** con los botones *Crear cuenta* y *Entrar*. Si dice «Esta instalación no está conectada a un servidor», las variables no han llegado: revisa los nombres y vuelve a desplegar.
2. **Crear cuenta** con tu correo, una contraseña y tu nombre de usuario.
3. **Amigos → Invitar**: manda el enlace por WhatsApp. Cuando tu amigo lo abra y cree su cuenta, la solicitud se envía sola; acéptala en **Amigos → Solicitudes**.
4. **La charca**: verás las ranas de los dos y el ranking de la semana.

### Si algo falla

| Mensaje en la app | Qué hacer |
|---|---|
| «Falta preparar la base de datos» | No se ejecutó `schema.sql` entero (paso 2). |
| «La app no está bien conectada al servidor» | Revisa `VITE_SUPABASE_URL` (sin `/` final) y la clave, y vuelve a desplegar. |
| «Confirma tu correo…» al entrar | «Confirm email» sigue activado: confirma desde el correo o desactívalo (paso 3). |
| «Demasiados intentos seguidos» | Límite de correos o de intentos de Supabase. Espera unos minutos. |
| El enlace del correo abre `localhost` | Falta la *Site URL* (paso 3.2). |

> El plan gratuito de Supabase **pausa el proyecto si pasa 7 días sin uso**. Si un día la app no conecta, entra en Supabase y pulsa *Restore project*.

---

## Cómo funciona por dentro

| Tabla | Para qué |
|---|---|
| `profiles` | Perfil público: nombre de usuario, código de amigo y estadísticas de la rana (nivel, ánimo, complementos, XP y tareas de la semana) |
| `friendships` | Solicitudes y amistades (`pending` → `accepted`) |
| `user_state` | Copia completa del estado de la app de cada usuario (JSON) para sincronizar |
| `admins` | Quién es administrador. Sin acceso desde la API: solo se cambia en el SQL Editor |
| `app_config` | Configuración pública de la app (p. ej. `accessory-fit`, los ajustes de los complementos publicados desde el probador). La lee cualquiera; solo la escriben administradores |

| Función | Para qué |
|---|---|
| `send_friend_request(code)` | Envía la solicitud por código sin exponer otros perfiles; si la otra persona ya te la había enviado, la acepta. Máximo 20 por hora. |
| `username_available(name)` | Comprueba el nombre antes de crear la cuenta. |
| `delete_my_account()` | «Borrar mi cuenta» en Ajustes: borra perfil, amistades, copia en la nube y el usuario. |
| `is_admin()` | ¿La sesión que llama es de un administrador? (enseña el probador y Ajustes → Administración). |

- Cada usuario solo puede leer y escribir lo suyo y ver el perfil de sus amigos (y de quien le ha enviado solicitud).
- La app usa la API REST de Supabase directamente (`src/services/backend.ts`), sin SDK. Cambiar de proveedor = otra implementación de la interfaz `Backend` (`src/services/types.ts`).
- El ranking usa las estadísticas que publica cada dispositivo. Entre amigos es suficiente, pero se puede falsear; ver `docs/AUDITORIA.md`.

## Administrador (probador de complementos)

Si ya tenías el esquema de antes, vuelve a ejecutar `supabase/schema.sql` entero en el SQL Editor (se puede repetir: no borra datos). Después, hazte administrador:

```sql
insert into public.admins (user_id)
select id from auth.users where email = 'tu@correo.com';
```

Cierra y abre la app: en Ajustes aparece «Administración» con el probador. Para quitarle el permiso a alguien: `delete from public.admins where user_id = '…';`. Más detalles en `docs/PROBADOR.md`.
