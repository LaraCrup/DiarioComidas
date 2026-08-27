-- =====================================================================
-- 1. Categoria "Postre"
-- 2. Entrenamientos: tabla nueva, con el mismo aislamiento que meals
--
-- Correr entero en: Supabase Dashboard -> SQL Editor -> New query -> Run
-- Es idempotente: podes volver a correrlo sin romper nada.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Categoria "Postre"
--
-- Va como sentencia suelta y no adentro de un bloque `do`: Postgres es
-- quisquilloso con `alter type ... add value` cuando corre dentro de una
-- funcion. `if not exists` lo hace idempotente.
-- ---------------------------------------------------------------------
alter type public.meal_category add value if not exists 'postre';

-- ---------------------------------------------------------------------
-- 2. Tipo de entrenamiento
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type t
                 join pg_namespace n on n.oid = t.typnamespace
                 where t.typname = 'workout_kind' and n.nspname = 'public') then
    create type public.workout_kind as enum ('gimnasio', 'correr', 'kinesiologia');
  end if;
end
$$;

-- ---------------------------------------------------------------------
-- 3. Tabla
--
-- Tabla aparte y no una columna "tipo" en meals: una comida tiene
-- descripcion obligatoria y foto, un entrenamiento no tiene ninguna de las
-- dos. Meterlos juntos obliga a que la mitad de las columnas sean nulas y a
-- que cada consulta filtre por tipo.
--
-- Mismo patron que meals: user_id con `default auth.uid()`, RLS por uid.
-- ---------------------------------------------------------------------
create table if not exists public.workouts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid()
                references auth.users (id) on delete cascade,
  kind        public.workout_kind not null,
  note        text,
  done_at     timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint workouts_note_len check (note is null or char_length(note) <= 2000)
);

comment on table  public.workouts         is 'Entrenamientos. Van al lado de las comidas en el diario, pero son otra cosa.';
comment on column public.workouts.done_at is 'Momento del entrenamiento. Editable, igual que eaten_at en meals.';

create index if not exists workouts_user_done_at_idx
  on public.workouts (user_id, done_at desc);

-- ---------------------------------------------------------------------
-- 4. Trigger: updated_at automatico + el dueño de una fila no se cambia
-- ---------------------------------------------------------------------
create or replace function public.workouts_touch()
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

drop trigger if exists workouts_touch_trigger on public.workouts;
create trigger workouts_touch_trigger
  before update on public.workouts
  for each row execute function public.workouts_touch();

-- ---------------------------------------------------------------------
-- 5. RLS
--
-- `(select auth.uid())` en vez de `auth.uid()` a secas: asi Postgres lo
-- evalua una sola vez por query (InitPlan) en lugar de una vez por fila.
-- ---------------------------------------------------------------------
alter table public.workouts enable row level security;

drop policy if exists workouts_select_own on public.workouts;
create policy workouts_select_own on public.workouts
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists workouts_insert_own on public.workouts;
create policy workouts_insert_own on public.workouts
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists workouts_update_own on public.workouts;
create policy workouts_update_own on public.workouts
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists workouts_delete_own on public.workouts;
create policy workouts_delete_own on public.workouts
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Sin policies para `anon`: un visitante sin sesion no lee ni escribe nada.
revoke all on public.workouts from anon;
grant select, insert, update, delete on public.workouts to authenticated;
