-- =====================================================================
-- "Me cayo mal" + ingredientes sospechosos
--
-- Correr entero en: Supabase Dashboard -> SQL Editor -> New query -> Run
-- Es idempotente: podes volver a correrlo sin romper nada.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Dos columnas en meals, no una tabla aparte: es un atributo de la comida
-- y se lee siempre junto con ella.
--
-- ingredients va como text[] y no como texto libre para que despues se
-- pueda contar cuales se repiten con un `unnest`, sin parsear nada.
-- Solo tiene sentido cuando felt_bad es true; el check lo garantiza.
-- ---------------------------------------------------------------------
alter table public.meals
  add column if not exists felt_bad    boolean not null default false,
  add column if not exists ingredients text[];

comment on column public.meals.felt_bad    is 'La comida cayo mal. Lo marca la persona, no lo infiere nadie.';
comment on column public.meals.ingredients is 'Ingredientes sospechosos, en minusculas y sin repetidos. Solo si felt_bad.';

alter table public.meals drop constraint if exists meals_ingredients_only_if_bad;
alter table public.meals add constraint meals_ingredients_only_if_bad
  check (felt_bad or ingredients is null);

alter table public.meals drop constraint if exists meals_ingredients_len;
alter table public.meals add constraint meals_ingredients_len
  check (ingredients is null or cardinality(ingredients) <= 50);

-- =====================================================================
-- Consulta de referencia: que ingredientes se repiten cuando cae mal.
-- Correr suelta, con la sesion de la persona (pasa por RLS).
-- =====================================================================
-- select ingredient, count(*) as veces
--   from public.meals, unnest(ingredients) as ingredient
--  where felt_bad
--  group by ingredient
--  order by veces desc;
