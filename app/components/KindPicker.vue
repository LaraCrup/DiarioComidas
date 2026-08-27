<script setup lang="ts">
import { WORKOUT_KINDS, WORKOUT_LABEL } from '#shared/utils/workouts'
import type { WorkoutKind } from '#shared/types/database'

/**
 * Apilado y no en grilla como CategoryPicker: son tres opciones y una se llama
 * "Kinesiología". En tres columnas ese texto no entra en un telefono de 375px
 * sin bajar el tamaño de letra por debajo de lo comodo.
 */
const model = defineModel<WorkoutKind>({ required: true })
</script>

<template>
  <div class="space-y-2">
    <button
      v-for="kind in WORKOUT_KINDS"
      :key="kind"
      type="button"
      class="flex min-h-14 w-full items-center gap-3 rounded-xl border-2 px-4 text-base font-semibold transition-colors"
      :class="
        model === kind
          ? 'border-slate-900 bg-slate-900 text-white'
          : 'border-slate-200 bg-white text-slate-700 active:bg-slate-100'
      "
      :aria-pressed="model === kind"
      @click="model = kind"
    >
      <WorkoutIcon :kind="kind" class="h-5 w-5 shrink-0" />
      {{ WORKOUT_LABEL[kind] }}
    </button>
  </div>
</template>
