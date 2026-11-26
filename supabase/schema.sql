-- =====================================================================
-- Croac · esquema de Supabase (cuentas, sincronización y amigos)
-- Pégalo entero en Supabase → SQL Editor → Run. Se puede ejecutar varias
-- veces: crea lo que falta y reemplaza funciones y políticas.
-- =====================================================================

-- ---------- Perfiles públicos (lo que ven tus amigos) ----------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  username     text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  friend_code  text not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 8)),
  frog_name    text not null default 'Rani' check (char_length(frog_name) <= 24),
  level        int  not null default 1 check (level between 1 and 999),
  xp           int  not null default 0 check (xp >= 0),
  equipped     jsonb not null default '{}'::jsonb,
  mood         text not null default 'neutral',
  streak       int  not null default 0,
  week_start   date,
  week_xp      int  not null default 0,
  week_tasks   int  not null default 0,
  total_tasks  int  not null default 0,
  updated_at   timestamptz not null default now()
);

-- ---------- Amistades (solicitud → aceptada) ----------
create table if not exists public.friendships (
  requester  uuid not null references public.profiles (id) on delete cascade,
  addressee  uuid not null references public.profiles (id) on delete cascade,
  status     text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (requester, addressee),
  check (requester <> addressee)
);
create index if not exists friendships_addressee_idx on public.friendships (addressee);

-- ---------- Estado completo de la app (sincronización) ----------
create table if not exists public.user_state (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  state      jsonb not null,
  updated_at timestamptz not null default now()
);

-- ---------- Seguridad a nivel de fila ----------
alter table public.profiles    enable row level security;
alter table public.friendships enable row level security;
alter table public.user_state  enable row level security;

-- Perfiles: el tuyo y el de cualquiera con quien tengas una amistad o solicitud.
drop policy if exists "perfiles visibles" on public.profiles;
create policy "perfiles visibles" on public.profiles for select to authenticated using (
  id = auth.uid()
  or exists (
    select 1 from public.friendships f
    where (f.requester = auth.uid() and f.addressee = profiles.id)
       or (f.addressee = auth.uid() and f.requester = profiles.id)
  )
);
drop policy if exists "crear mi perfil" on public.profiles;
create policy "crear mi perfil" on public.profiles for insert to authenticated with check (id = auth.uid());
drop policy if exists "editar mi perfil" on public.profiles;
create policy "editar mi perfil" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- El código de amigo no se puede cambiar desde la app.
create or replace function public.keep_friend_code() returns trigger language plpgsql as $$
begin
  new.friend_code := old.friend_code;
  new.id := old.id;
  return new;
end $$;
drop trigger if exists keep_friend_code on public.profiles;
create trigger keep_friend_code before update on public.profiles for each row execute function public.keep_friend_code();

-- Amistades: solo las tuyas. Las solicitudes se crean con send_friend_request().
drop policy if exists "ver mis amistades" on public.friendships;
create policy "ver mis amistades" on public.friendships for select to authenticated using (auth.uid() in (requester, addressee));
drop policy if exists "aceptar solicitudes" on public.friendships;
create policy "aceptar solicitudes" on public.friendships for update to authenticated
  using (addressee = auth.uid()) with check (addressee = auth.uid() and status = 'accepted');
drop policy if exists "borrar amistades" on public.friendships;
create policy "borrar amistades" on public.friendships for delete to authenticated using (auth.uid() in (requester, addressee));

-- Estado: cada uno el suyo.
drop policy if exists "mi estado" on public.user_state;
create policy "mi estado" on public.user_state for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- Enviar solicitud de amistad por código ----------
-- Si la otra persona ya te la había enviado, se acepta directamente.
create or replace function public.send_friend_request(code text) returns json
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  target uuid;
  existing public.friendships;
begin
  if me is null then raise exception 'no_auth'; end if;
  select id into target from public.profiles where friend_code = upper(trim(code));
  if target is null then raise exception 'not_found'; end if;
  if target = me then raise exception 'self'; end if;
  -- Evita probar códigos al azar: máximo 20 solicitudes por hora.
  if (select count(*) from public.friendships where requester = me and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'rate_limit';
  end if;

  select * into existing from public.friendships
   where (requester = me and addressee = target) or (requester = target and addressee = me);
  if found then
    if existing.status = 'pending' and existing.addressee = me then
      update public.friendships set status = 'accepted' where requester = target and addressee = me;
      return json_build_object('status', 'accepted');
    end if;
    return json_build_object('status', existing.status);
  end if;

  insert into public.friendships (requester, addressee) values (me, target);
  return json_build_object('status', 'pending');
end $$;

revoke all on function public.send_friend_request(text) from public, anon;
grant execute on function public.send_friend_request(text) to authenticated;


-- ---------- ¿Está libre este nombre de usuario? (antes de registrarse) ----------
create or replace function public.username_available(name text) returns boolean
language sql security definer set search_path = public stable as $$
  select not exists (select 1 from public.profiles where username = lower(trim(name)));
$$;
revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;

-- ---------- Borrar mi cuenta (perfil, amistades y datos en la nube) ----------
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'no_auth'; end if;
  delete from public.user_state where user_id = auth.uid();
  delete from public.profiles where id = auth.uid();  -- en cascada: friendships
  begin
    delete from auth.users where id = auth.uid();
  exception when insufficient_privilege then
    null;  -- si el proyecto no lo permite, al menos los datos ya están borrados
  end;
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ---------- Permisos de la API (por si el proyecto no los da por defecto) ----------
grant usage on schema public to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, update, delete on public.friendships to authenticated;
grant select, insert, update, delete on public.user_state to authenticated;

-- ---------- Administración (probador de complementos) ----------
-- Quién es administrador. Sin políticas ni permisos para la API: solo se puede cambiar desde
-- el panel de Supabase (SQL Editor). Para hacerte administrador:
--   insert into public.admins (user_id)
--   select id from auth.users where email = 'tu@correo.com';
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;

-- ¿Soy administrador? (solo responde por la sesión que llama)
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- Configuración pública de la app (p. ej. «accessory-fit»: ajustes de los complementos).
-- La lee cualquiera; solo la escriben los administradores.
create table if not exists public.app_config (
  key text primary key check (key ~ '^[a-z0-9-]{1,40}$'),
  value jsonb not null check (pg_column_size(value) < 262144),
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references auth.users(id) on delete set null
);
alter table public.app_config enable row level security;
drop policy if exists "config pública" on public.app_config;
create policy "config pública" on public.app_config for select to anon, authenticated using (true);
drop policy if exists "config: crear (admins)" on public.app_config;
create policy "config: crear (admins)" on public.app_config for insert to authenticated with check (public.is_admin());
drop policy if exists "config: cambiar (admins)" on public.app_config;
create policy "config: cambiar (admins)" on public.app_config for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "config: borrar (admins)" on public.app_config;
create policy "config: borrar (admins)" on public.app_config for delete to authenticated using (public.is_admin());
grant select on public.app_config to anon, authenticated;
grant insert, update, delete on public.app_config to authenticated;

-- ---------- Semana anterior en el perfil (v1.3) ----------
-- Para que el lunes, con la clasificación a cero, se vea quién ganó la semana pasada.
alter table public.profiles add column if not exists last_week_xp int not null default 0;
alter table public.profiles add column if not exists last_week_tasks int not null default 0;

-- ---------- Patio del complemento (v1.3) ----------
-- Cada semana (de lunes a domingo, hora de Madrid) cada usuario puede publicar un dibujo
-- (necesita un lienzo, que se compra con monedas en la app). Todos votan (3 votos por
-- semana, no a uno mismo). El más votado de cada semana entra gratis en la tienda.
-- Los dibujos se guardan en Storage (cubo público «patio», carpeta = id del usuario).

create or replace function public.patio_current_week() returns date
language sql stable as $$ select (date_trunc('week', now() at time zone 'Europe/Madrid'))::date $$;

create table if not exists public.patio_entries (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  author text not null default '',
  week_start date not null default public.patio_current_week(),
  slot text not null check (slot in ('hat', 'neck', 'eyes')),
  name text not null check (char_length(btrim(name)) between 1 and 24),
  image_path text not null check (image_path ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,80}$'),
  ratio real not null check (ratio > 0.05 and ratio < 20),
  hidden boolean not null default false,
  reports int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);
create index if not exists patio_entries_week on public.patio_entries (week_start);
alter table public.patio_entries enable row level security;

create table if not exists public.patio_votes (
  entry_id bigint not null references public.patio_entries(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  week_start date not null default public.patio_current_week(),
  created_at timestamptz not null default now(),
  primary key (entry_id, user_id)
);
create index if not exists patio_votes_user_week on public.patio_votes (user_id, week_start);
alter table public.patio_votes enable row level security;

create table if not exists public.patio_reports (
  entry_id bigint not null references public.patio_entries(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (entry_id, user_id)
);
alter table public.patio_reports enable row level security;

-- Al publicar: el servidor pone autor, semana y estado (no se fía del navegador).
create or replace function public.patio_entries_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare uname text;
begin
  select username into uname from profiles where id = auth.uid();
  if uname is null then raise exception 'patio_needs_profile'; end if;
  if split_part(new.image_path, '/', 1) <> auth.uid()::text then raise exception 'patio_bad_image'; end if;
  new.user_id := auth.uid();
  new.author := uname;
  new.week_start := patio_current_week();
  new.hidden := false;
  new.reports := 0;
  new.created_at := now();
  return new;
end $$;
drop trigger if exists patio_entries_bi on public.patio_entries;
create trigger patio_entries_bi before insert on public.patio_entries
  for each row execute function public.patio_entries_before_insert();

-- Votar: solo dibujos visibles de esta semana, no el propio y como mucho 3 por semana.
create or replace function public.patio_votes_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare e patio_entries%rowtype; used int;
begin
  new.user_id := auth.uid();
  new.week_start := patio_current_week();
  perform pg_advisory_xact_lock(hashtext('patio-votes-' || new.user_id::text));
  select * into e from patio_entries where id = new.entry_id;
  if not found or e.hidden or e.week_start <> new.week_start then raise exception 'patio_closed'; end if;
  if e.user_id = new.user_id then raise exception 'patio_own_vote'; end if;
  select count(*) into used from patio_votes where user_id = new.user_id and week_start = new.week_start;
  if used >= 3 then raise exception 'patio_no_votes'; end if;
  return new;
end $$;
drop trigger if exists patio_votes_bi on public.patio_votes;
create trigger patio_votes_bi before insert on public.patio_votes
  for each row execute function public.patio_votes_before_insert();

-- Denunciar: con 3 denuncias el dibujo se oculta solo (un administrador puede volver a mostrarlo).
create or replace function public.patio_reports_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update patio_entries set reports = reports + 1, hidden = hidden or reports + 1 >= 3 where id = new.entry_id;
  return new;
end $$;
drop trigger if exists patio_reports_ai on public.patio_reports;
create trigger patio_reports_ai after insert on public.patio_reports
  for each row execute function public.patio_reports_after_insert();

-- Permisos
drop policy if exists "patio: ver (anónimos)" on public.patio_entries;
create policy "patio: ver (anónimos)" on public.patio_entries for select to anon using (not hidden);
drop policy if exists "patio: ver" on public.patio_entries;
create policy "patio: ver" on public.patio_entries for select to authenticated
  using (not hidden or user_id = auth.uid() or public.is_admin());
drop policy if exists "patio: publicar" on public.patio_entries;
create policy "patio: publicar" on public.patio_entries for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "patio: ocultar (admins)" on public.patio_entries;
create policy "patio: ocultar (admins)" on public.patio_entries for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "patio: borrar" on public.patio_entries;
create policy "patio: borrar" on public.patio_entries for delete to authenticated
  using ((user_id = auth.uid() and week_start = public.patio_current_week()) or public.is_admin());

drop policy if exists "patio votos: ver los míos" on public.patio_votes;
create policy "patio votos: ver los míos" on public.patio_votes for select to authenticated using (user_id = auth.uid());
drop policy if exists "patio votos: votar" on public.patio_votes;
create policy "patio votos: votar" on public.patio_votes for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "patio votos: quitar" on public.patio_votes;
create policy "patio votos: quitar" on public.patio_votes for delete to authenticated
  using (user_id = auth.uid() and week_start = public.patio_current_week());

drop policy if exists "patio denuncias: ver las mías" on public.patio_reports;
create policy "patio denuncias: ver las mías" on public.patio_reports for select to authenticated using (user_id = auth.uid());
drop policy if exists "patio denuncias: denunciar" on public.patio_reports;
create policy "patio denuncias: denunciar" on public.patio_reports for insert to authenticated with check (user_id = auth.uid());

grant select on public.patio_entries to anon, authenticated;
grant insert, delete on public.patio_entries to authenticated;
grant update (hidden) on public.patio_entries to authenticated;
grant select, insert, delete on public.patio_votes to authenticated;
grant select, insert on public.patio_reports to authenticated;

-- Dibujos de esta semana con sus votos (los votos de cada uno son privados: solo se ve el total).
create or replace function public.patio_week()
returns table (id bigint, slot text, name text, image_path text, ratio real, author text,
  votes int, voted boolean, mine boolean, hidden boolean, reports int, week_start date, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select e.id, e.slot, e.name, e.image_path, e.ratio, e.author,
    (select count(*) from patio_votes v where v.entry_id = e.id)::int,
    exists (select 1 from patio_votes v where v.entry_id = e.id and v.user_id = auth.uid()),
    e.user_id = auth.uid(), e.hidden, case when public.is_admin() then e.reports else 0 end,
    e.week_start, e.created_at
  from patio_entries e
  where e.week_start = patio_current_week()
    and (not e.hidden or e.user_id = auth.uid() or public.is_admin())
  order by e.created_at desc;
$$;
revoke all on function public.patio_week() from public, anon;
grant execute on function public.patio_week() to authenticated;

-- Ganadores de las semanas cerradas: el más votado de cada una (en empate, el primero publicado).
create or replace function public.patio_winners()
returns table (id bigint, week_start date, slot text, name text, image_path text, ratio real,
  author text, votes int, mine boolean)
language sql stable security definer set search_path = public as $$
  select distinct on (e.week_start) e.id, e.week_start, e.slot, e.name, e.image_path, e.ratio,
    e.author, c.votes, e.user_id = auth.uid()
  from patio_entries e
  cross join lateral (select count(*)::int as votes from patio_votes v where v.entry_id = e.id) c
  where e.week_start < patio_current_week() and not e.hidden and c.votes > 0
  order by e.week_start desc, c.votes desc, e.created_at asc;
$$;
grant execute on function public.patio_winners() to anon, authenticated;
grant execute on function public.patio_current_week() to anon, authenticated;

-- Imágenes: cubo público (cualquiera las ve) y cada usuario solo sube a su carpeta.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('patio', 'patio', true, 307200, array['image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "patio: subir a mi carpeta" on storage.objects;
create policy "patio: subir a mi carpeta" on storage.objects for insert to authenticated
  with check (bucket_id = 'patio' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "patio: borrar de mi carpeta" on storage.objects;
create policy "patio: borrar de mi carpeta" on storage.objects for delete to authenticated
  using (bucket_id = 'patio' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- Copias automáticas del estado (v1.4.1) ----------
-- Cada vez que se sobrescribe user_state, el servidor guarda la versión anterior. Se conservan:
-- todas las de la última media hora, una por hora durante 2 días y una por día durante 14 días
-- (unas 90 por usuario activo como mucho). Desde Ajustes → Tus datos → Recuperar datos se puede
-- combinar cualquiera con lo actual para recuperar lo que falte.
create table if not exists public.user_state_versions (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  state      jsonb not null,
  updated_at timestamptz not null,
  saved_at   timestamptz not null default now()
);
create index if not exists user_state_versions_user on public.user_state_versions (user_id, saved_at desc);
alter table public.user_state_versions enable row level security;
drop policy if exists "mis copias" on public.user_state_versions;
create policy "mis copias" on public.user_state_versions for select to authenticated using (user_id = auth.uid());
grant select on public.user_state_versions to authenticated;

create or replace function public.user_state_keep_version() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.state is distinct from new.state then
    insert into public.user_state_versions (user_id, state, updated_at) values (old.user_id, old.state, old.updated_at);
    delete from public.user_state_versions v
    where v.user_id = old.user_id and (
      v.saved_at < now() - interval '14 days'
      or (v.saved_at < now() - interval '2 days' and exists (
        select 1 from public.user_state_versions w where w.user_id = v.user_id
          and date_trunc('day', w.saved_at) = date_trunc('day', v.saved_at) and w.saved_at > v.saved_at))
      or (v.saved_at < now() - interval '30 minutes' and exists (
        select 1 from public.user_state_versions w where w.user_id = v.user_id
          and date_trunc('hour', w.saved_at) = date_trunc('hour', v.saved_at) and w.saved_at > v.saved_at))
    );
  end if;
  return new;
end $$;
revoke all on function public.user_state_keep_version() from public, anon, authenticated;
drop trigger if exists user_state_keep_version on public.user_state;
create trigger user_state_keep_version before update on public.user_state
  for each row execute function public.user_state_keep_version();
