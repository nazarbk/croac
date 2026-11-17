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
