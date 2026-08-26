-- =====================================================================
-- Agrega la categoria "Otros" al enum de tipos de comida.
-- Correr en: Supabase Dashboard -> SQL Editor -> New query -> Run
-- Es idempotente: podes volver a correrlo sin romper nada.
--
-- Va como migracion aparte y no editando el init porque el enum ya existe
-- en las bases creadas: `create type` no se puede "actualizar", hay que
-- sumarle el valor.
--
-- `add value` si corre dentro de una transaccion en Postgres 12+ (Supabase
-- esta muy por encima) mientras el valor nuevo no se use en esa misma
-- transaccion. Este archivo solo lo agrega, asi que entra sin problema.
-- =====================================================================

alter type public.meal_category add value if not exists 'otros';
