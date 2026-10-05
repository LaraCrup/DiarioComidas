<script setup lang="ts">
import { CATEGORY_LABEL, suggestCategory } from '#shared/utils/categories'
import { toDatetimeLocal, fromDatetimeLocal, timeLabel } from '#shared/utils/dates'
import type { Meal, MealCategory } from '#shared/types/database'
import type { MealPayload } from '~/composables/useMeals'

const props = defineProps<{
  /** Si viene, el formulario esta editando. Si no, es alta. */
  meal?: Meal | null
  /** URL firmada de la foto ya guardada (solo en edicion). */
  photoUrl?: string | null
  busy?: boolean
  submitLabel?: string
}>()

const emit = defineEmits<{ submit: [payload: MealPayload] }>()

const category = ref<MealCategory>(props.meal?.category ?? suggestCategory())
const description = ref(props.meal?.description ?? '')
const note = ref(props.meal?.note ?? '')
const feltBad = ref(props.meal?.felt_bad ?? false)
// Se escriben separados por coma; al guardar se parten en un array.
const ingredients = ref(props.meal?.ingredients?.join(', ') ?? '')
const when = ref(toDatetimeLocal(props.meal?.eaten_at ?? new Date()))

const photoFile = ref<File | null>(null)
const photoRemoved = ref(false)

// Nota y fecha arrancan plegadas: en el 90% de los casos no las tocas, y cada
// campo visible de mas es un scroll mas antes de llegar al boton de guardar.
const showNote = ref(Boolean(props.meal?.note))
const showWhen = ref(false)

const error = ref<string | null>(null)
const descriptionEl = useTemplateRef<HTMLTextAreaElement>('descriptionEl')

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

onMounted(() => {
  // En alta, el teclado ya arranca abierto sobre el campo que importa.
  if (!props.meal) descriptionEl.value?.focus()
})

function onSubmit() {
  error.value = null
  if (!description.value.trim()) {
    error.value = 'Escribí qué comiste.'
    descriptionEl.value?.focus()
    return
  }
  let eaten_at: string
  try {
    eaten_at = fromDatetimeLocal(when.value)
  } catch {
    error.value = 'La fecha y hora no son válidas.'
    return
  }
  emit('submit', {
    category: category.value,
    description: description.value,
    note: note.value,
    felt_bad: feltBad.value,
    ingredients: feltBad.value ? parseIngredients(ingredients.value) : null,
    eaten_at,
    photoFile: photoFile.value,
    removePhoto: photoRemoved.value,
  })
}

/**
 * "Lácteos, cebolla,  gluten" -> ['lácteos', 'cebolla', 'gluten'].
 * En minusculas y sin repetidos: la gracia es contar despues cuales se
 * repiten, y "Cebolla" y "cebolla" tienen que ser lo mismo.
 */
function parseIngredients(raw: string): string[] | null {
  const items = raw
    .split(/[,\n]/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  const unique = [...new Set(items)]
  return unique.length ? unique : null
}
</script>

<template>
  <form class="flex min-h-[calc(100dvh-3.5rem)] flex-col" @submit.prevent="onSubmit">
    <div class="flex-1 space-y-5 p-4">
      <div>
        <span class="label">Categoría</span>
        <CategoryPicker v-model="category" />
      </div>

      <div>
        <label class="label" for="description">Qué comiste</label>
        <textarea
          id="description"
          ref="descriptionEl"
          v-model="description"
          class="field min-h-28 resize-none"
          rows="3"
          maxlength="2000"
          autocapitalize="sentences"
          autocomplete="off"
          enterkeyhint="done"
          placeholder="Milanesa con puré y una copa de vino"
        />
      </div>

      <PhotoField
        v-model:file="photoFile"
        v-model:removed="photoRemoved"
        :existing-url="photoUrl"
      />

      <!-- Me cayo mal -->
      <div class="card p-4">
        <button
          type="button"
          role="switch"
          :aria-checked="feltBad"
          class="flex w-full items-center justify-between gap-3"
          @click="feltBad = !feltBad"
        >
          <span class="text-base font-semibold text-slate-800">Me cayó mal</span>
          <span
            class="relative h-7 w-12 shrink-0 rounded-full transition-colors"
            :class="feltBad ? 'bg-amber-500' : 'bg-slate-300'"
          >
            <span
              class="absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform"
              :class="feltBad && 'translate-x-5'"
            />
          </span>
        </button>
        <div v-if="feltBad" class="mt-4">
          <label class="label" for="ingredients">Qué tenía</label>
          <input
            id="ingredients"
            v-model="ingredients"
            type="text"
            class="field"
            autocapitalize="none"
            autocomplete="off"
            enterkeyhint="done"
            placeholder="Lácteos, cebolla, gluten"
          />
          <p class="mt-2 text-sm text-slate-500">
            Separados por coma. Después se cuentan cuáles se repiten.
          </p>
        </div>
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
            placeholder="Cómo te sentiste, hambre antes, saciedad después, contexto…"
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
        {{ busy ? 'Guardando…' : (submitLabel ?? `Guardar ${CATEGORY_LABEL[category].toLowerCase()}`) }}
      </button>
    </div>
  </form>
</template>
