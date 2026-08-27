<script setup lang="ts">
import { WORKOUT_LABEL } from '#shared/utils/workouts'
import { toDatetimeLocal, fromDatetimeLocal, timeLabel } from '#shared/utils/dates'
import type { Workout, WorkoutKind } from '#shared/types/database'
import type { WorkoutPayload } from '~/composables/useWorkouts'

const props = defineProps<{
  /** Si viene, el formulario esta editando. Si no, es alta. */
  workout?: Workout | null
  busy?: boolean
  submitLabel?: string
}>()

const emit = defineEmits<{ submit: [payload: WorkoutPayload] }>()

// Sin sugerencia por hora como en las comidas: la hora no dice nada de si
// fuiste al gimnasio o a kine. Arranca en gimnasio y se cambia con un toque.
const kind = ref<WorkoutKind>(props.workout?.kind ?? 'gimnasio')
const note = ref(props.workout?.note ?? '')
const when = ref(toDatetimeLocal(props.workout?.done_at ?? new Date()))

const showNote = ref(Boolean(props.workout?.note))
const showWhen = ref(false)

const error = ref<string | null>(null)

const whenLabel = computed(() => {
  try {
    const d = new Date(when.value)
    const isToday = d.toDateString() === new Date().toDateString()
    return isToday
      ? `Hoy ${timeLabel(d)}`
      : new Intl.DateTimeFormat('es-AR', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(d)
  } catch {
    return when.value
  }
})

function onSubmit() {
  error.value = null
  let done_at: string
  try {
    done_at = fromDatetimeLocal(when.value)
  } catch {
    error.value = 'La fecha y hora no son válidas.'
    return
  }
  emit('submit', { kind: kind.value, note: note.value, done_at })
}
</script>

<template>
  <form class="flex min-h-[calc(100dvh-3.5rem)] flex-col" @submit.prevent="onSubmit">
    <div class="flex-1 space-y-5 p-4">
      <div>
        <span class="label">Tipo</span>
        <KindPicker v-model="kind" />
      </div>

      <!-- Nota -->
      <div>
        <button
          v-if="!showNote"
          type="button"
          class="btn-ghost w-full justify-start px-0 font-medium"
          @click="showNote = true"
        >
          + Agregar nota
        </button>
        <div v-else>
          <label class="label" for="note">Nota</label>
          <textarea
            id="note"
            v-model="note"
            class="field min-h-24 resize-none"
            rows="3"
            maxlength="2000"
            autocapitalize="sentences"
            placeholder="Qué hiciste, cuánto duró, cómo te sentiste…"
          />
        </div>
      </div>

      <!-- Fecha y hora -->
      <div>
        <button
          v-if="!showWhen"
          type="button"
          class="btn-ghost w-full justify-between px-0 font-medium"
          @click="showWhen = true"
        >
          <span>{{ whenLabel }}</span>
          <span class="text-sm font-normal text-slate-500">Cambiar</span>
        </button>
        <div v-else>
          <label class="label" for="when">Fecha y hora</label>
          <input id="when" v-model="when" type="datetime-local" class="field" />
        </div>
      </div>

      <p v-if="error" class="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
        {{ error }}
      </p>

      <slot name="extra" />
    </div>

    <div class="sticky-bottom px-4 pt-3">
      <button type="submit" class="btn-primary w-full" :disabled="busy">
        <span
          v-if="busy"
          class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
        />
        {{ busy ? 'Guardando…' : (submitLabel ?? `Guardar ${WORKOUT_LABEL[kind].toLowerCase()}`) }}
      </button>
    </div>
  </form>
</template>
