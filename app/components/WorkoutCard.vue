<script setup lang="ts">
import { WORKOUT_LABEL } from '#shared/utils/workouts'
import { timeLabel } from '#shared/utils/dates'
import type { Workout } from '#shared/types/database'

defineProps<{ workout: Workout }>()
</script>

<template>
  <!--
    Azul y no gris: en el listado del dia hay que poder saltear los
    entrenamientos de un vistazo cuando estas leyendo lo que comiste, y al reves.

    Va en el escalon 100 y no en el 50 como el resto de los fondos tenues: el
    fondo de la app ya es slate-100, que es un azul grisaceo, y contra eso un
    blue-50 practicamente no se ve.
  -->
  <NuxtLink
    :to="`/entrenamiento/${workout.id}`"
    class="card flex items-start gap-3 border-blue-300 bg-blue-100 p-3 active:bg-blue-200"
  >
    <div
      class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-200 text-blue-800"
    >
      <WorkoutIcon :kind="workout.kind" class="h-5 w-5" />
    </div>

    <div class="min-w-0 flex-1">
      <div class="flex items-baseline gap-2 text-sm">
        <span class="font-semibold text-slate-900">{{ timeLabel(workout.done_at) }}</span>
        <span class="font-medium text-blue-800">Entrenamiento</span>
      </div>
      <p class="mt-1 text-base leading-snug font-medium text-slate-800">
        {{ WORKOUT_LABEL[workout.kind] }}
      </p>
      <p
        v-if="workout.note"
        class="mt-1.5 line-clamp-2 text-sm leading-snug break-words text-slate-600 italic"
      >
        {{ workout.note }}
      </p>
    </div>
  </NuxtLink>
</template>
