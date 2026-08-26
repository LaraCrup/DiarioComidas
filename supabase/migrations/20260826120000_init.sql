-- =====================================================================
-- Diario de comidas - esquema inicial
-- Correr entero en: Supabase Dashboard -> SQL Editor -> New query -> Run
-- Es idempotente: podes volver a correrlo sin romper nada.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tipo de categoria
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type t
                 join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'meal_category' and n.nspname = 'public') then
    create type public.meal_category as enum ('desayuno', 'almuerzo', 'merienda', 'cena', 'snack');
  end if;
end
$$;

-- ---------------------------------------------------------------------
-- 2. Tabla
--
-- user_id tiene `default auth.uid()`: el cliente nunca manda el user_id.
-- Si igual lo mandara, la policy de INSERT lo rechaza.
-- ---------------------------------------------------------------------
create table if not exists public.meals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid()
                references auth.users (id) on delete cascade,
  category    public.meal_category not null,
  description text not null,
  note        text,
  photo_path  text,
  eaten_at    timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint meals_description_len check (char_length(btrim(description)) between 1 and 2000),
  constraint meals_note_len        check (note is null or char_length(note) <= 2000),
  constraint meals_photo_path_len  check (photo_path is null or char_length(photo_path) <= 512)
);

comment on table  public.meals            is 'Registro descriptivo de comidas. Una fila por comida, siempre de un usuario.';
comment on column public.meals.photo_path is 'Path dentro del bucket privado meal-photos. Siempre empieza con <user_id>/.';
comment on column public.meals.eaten_at   is 'Momento de la comida. Editable: podes cargar algo que comiste hace tres horas.';

-- Indice que sirve exactamente a las dos consultas de la app:
-- listado ordenado por fecha y export por rango.
create index if not exists meals_user_eaten_at_idx
  on public.meals (user_id, eaten_at desc);

-- ---------------------------------------------------------------------
-- 3. Trigger: updated_at automatico + el dueño de una fila no se cambia
-- ---------------------------------------------------------------------
create or replace function public.meals_touch()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.user_id    := old.user_id;   -- ninguna fila cambia de dueño en un UPDATE
  new.created_at := old.created_at;
  return new;
end;
$$;

drop trigger if exists meals_touch_trigger on public.meals;
create trigger meals_touch_trigger
  before update on public.meals
  for each row execute function public.meals_touch();

-- ---------------------------------------------------------------------
-- 4. RLS sobre la tabla
--
-- `(select auth.uid())` en vez de `auth.uid()` a secas: asi Postgres lo
-- evalua una sola vez por query (InitPlan) en lugar de una vez por fila.
--
-- El WITH CHECK ademas obliga a que photo_path viva en la carpeta del
-- usuario: aunque alguien conociera el path de la foto de otro, no puede
-- apuntar una fila suya a esa foto.
-- ---------------------------------------------------------------------
alter table public.meals enable row level security;

drop policy if exists meals_select_own on public.meals;
create policy meals_select_own on public.meals
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists meals_insert_own on public.meals;
create policy meals_insert_own on public.meals
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and (photo_path is null or photo_path like ((select auth.uid())::text || '/%'))
  );

drop policy if exists meals_update_own on public.meals;
create policy meals_update_own on public.meals
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (photo_path is null or photo_path like ((select auth.uid())::text || '/%'))
  );

drop policy if exists meals_delete_own on public.meals;
create policy meals_delete_own on public.meals
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Sin policies para el rol `anon`: un visitante sin sesion no lee ni escribe nada.
revoke all on public.meals from anon;
grant select, insert, update, delete on public.meals to authenticated;

-- ---------------------------------------------------------------------
-- 5. Bucket de fotos (PRIVADO)
--
-- Son datos de salud. public = false => no hay URL publica posible;
-- la unica forma de ver una foto es una signed URL de corta duracion,
-- y firmar requiere pasar por las policies de abajo.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'meal-photos',
  'meal-photos',
  false,
  8388608,                                            -- 8 MB de techo por archivo
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public            = false,
      file_size_limit   = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------
-- 6. Policies del bucket
--
-- Convencion de path: <user_id>/<uuid>.jpg
-- (storage.foldername(name))[1] es la primera carpeta del path.
-- ---------------------------------------------------------------------
drop policy if exists meal_photos_select_own on storage.objects;
create policy meal_photos_select_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'meal-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists meal_photos_insert_own on storage.objects;
create policy meal_photos_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'meal-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists meal_photos_update_own on storage.objects;
create policy meal_photos_update_own on storage.objects
  for update to authenticated
  using (
    bucket_id = 'meal-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'meal-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists meal_photos_delete_own on storage.objects;
create policy meal_photos_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'meal-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- =====================================================================
-- Verificacion rapida (opcional, descomentar y correr suelto)
-- =====================================================================
-- select policyname, cmd, roles from pg_policies
--  where (schemaname, tablename) in (('public','meals'), ('storage','objects'))
--  order by tablename, cmd;
--
-- select relname, relrowsecurity from pg_class
--  where relname in ('meals','objects');
