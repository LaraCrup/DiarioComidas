<script setup lang="ts">
import { WORKOUT_LABEL } from '#shared/utils/workouts'
import { timeLabel } from '#shared/utils/dates'
import type { Workout } from '#shared/types/database'

defineProps<{ workout: Workout }>()
</script>

<template>
  <!--
    Verde y no gris: en el listado del dia hay que poder saltear los
    entrenamientos de un vistazo cuando estas leyendo lo que comiste, y al reves.
    Es el unico color de la app ademas del rojo de error.
  -->
  <NuxtLink
    :to="`/entrenamiento/${workout.id}`"
    class="card flex items-start gap-3 border-emerald-200 bg-emerald-50 p-3 active:bg-emerald-100"
  >
    <div
      class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"
    >
      <WorkoutIcon :kind="workout.kind" class="h-5 w-5" />
    </div>

    <div class="min-w-0 flex-1">
      <div class="flex items-baseline gap-2 text-sm">
        <span class="font-semibold text-slate-900">{{ timeLabel(workout.done_at) }}</span>
        <span class="font-medium text-emerald-700">Entrenamiento</span>
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
