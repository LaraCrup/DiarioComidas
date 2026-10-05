# Diario de comidas

Repo de Lara. Lio colabora con features puntuales. El README es la doc real: qué hace, por qué
cada decisión, cómo correrlo. Esto es solo lo que hace falta saber antes de tocar código.

## Stack

Nuxt 4 + TypeScript + Tailwind 4 + Supabase (Auth, Postgres, Storage) + pdf-lib. **npm**, no
pnpm: instalar con `npm ci --legacy-peer-deps` (un `npm install` reescribe el lockfile por el bug
de peers opcionales que explica el README). Node ≥ 22.18.

## Convenciones del repo (son de Lara, se respetan)

- `.vue` con `<script setup lang="ts">` arriba y `<template>` abajo. No reordenar.
- Tipos de la base a mano en `shared/types/database.ts`, como `type` (nunca `interface`).
  Al agregar una columna: `MealRow`/`MealInsert`/`MealUpdate`, el `Pick` de `Meal` y
  `MEAL_COLUMNS`. El PDF (`server/utils/pdf.ts` + `server/api/export.get.ts`) tiene su propio
  tipo `PdfMeal`: también se toca.
- Todo color quiere decir algo: rojo error/borrado, verde éxito, azul entrenamiento, ámbar
  "cayó mal". El resto es `slate`.
- Migraciones en `supabase/migrations/`, idempotentes, con comentario de por qué. Se corren a
  mano en el SQL Editor del dashboard, en orden.
- Nunca se manda `user_id` desde el cliente: `default auth.uid()` + RLS.
- Comentarios en español, sin tilde en los `.sql` (convención de los existentes).

## Supabase

Proyecto `pbhufhouxwgefctyprlj`. MCP `supabase-diariocomidas` scoped a este directorio
(`claude mcp list`); si no aparece, autenticar con `/mcp`.

## Verificar

`npm run typecheck` (el warning de `vue-router/volar/sfc-route-blocks` es preexistente y no
es un error). `scripts/verificar-aislamiento.sh` prueba RLS contra la API real.
