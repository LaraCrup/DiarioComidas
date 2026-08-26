<script setup lang="ts">
import type { Meal } from '#shared/types/database'
import type { MealPayload } from '~/composables/useMeals'

const route = useRoute()
const id = computed(() => String(route.params.id))

const { get, update, remove, signedUrl } = useMeals()

const meal = ref<Meal | null>(null)
const photoUrl = ref<string | null>(null)
const loading = ref(true)
const busy = ref(false)
const error = ref<string | null>(null)
const confirmingDelete = ref(false)

onMounted(async () => {
  try {
    // RLS: si el id es de otro usuario, esto devuelve null. No hace falta
    // chequear el dueño en el cliente, la base ya no nos deja verlo.
    meal.value = await get(id.value)
    if (meal.value?.photo_path) {
      photoUrl.value = await signedUrl(meal.value.photo_path)
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No pudimos abrir el registro.'
  } finally {
    loading.value = false
  }
})

async function onSubmit(payload: MealPayload) {
  if (!meal.value) return
  busy.value = true
  error.value = null
  try {
    await update(id.value, meal.value, payload)
    await navigateTo('/')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No pudimos guardar los cambios.'
  } finally {
    busy.value = false
  }
}

async function onDelete() {
  if (!meal.value) return
  busy.value = true
  error.value = null
  try {
    await remove(meal.value)
    await navigateTo('/')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No pudimos borrar el registro.'
    busy.value = false
  }
}
</script>

<template>
  <div>
    <AppHeader title="Editar comida" back="/" />

    <div v-if="loading" class="space-y-3 p-4">
      <div class="card h-16 animate-pulse bg-white" />
      <div class="card h-28 animate-pulse bg-white" />
    </div>

    <div v-else-if="!meal" class="p-4">
      <div class="card p-6 text-center">
        <p class="font-semibold text-slate-800">Ese registro no existe</p>
        <p class="mt-1 text-sm text-slate-500">O lo borraste, o no es tuyo.</p>
        <NuxtLink to="/" class="btn-secondary mt-4 w-full">Volver al diario</NuxtLink>
      </div>
    </div>

    <MealForm
      v-else
      :meal="meal"
      :photo-url="photoUrl"
      :busy="busy"
      submit-label="Guardar cambios"
      @submit="onSubmit"
    >
      <template #extra>
        <p
          v-if="error"
          class="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          {{ error }}
        </p>

        <div class="border-t border-slate-200 pt-5">
          <button
            v-if="!confirmingDelete"
            type="button"
            class="btn-ghost w-full text-red-600"
            :disabled="busy"
            @click="confirmingDelete = true"
          >
            Borrar registro
          </button>
          <div v-else class="space-y-2">
            <p class="text-center text-sm text-slate-600">
              Se borra el registro y su foto. No se puede deshacer.
            </p>
            <div class="flex gap-2">
              <button
                type="button"
                class="btn-secondary flex-1"
                :disabled="busy"
                @click="confirmingDelete = false"
              >
                Cancelar
              </button>
              <button type="button" class="btn-danger flex-1" :disabled="busy" @click="onDelete">
                Sí, borrar
              </button>
            </div>
          </div>
        </div>
      </template>
    </MealForm>
  </div>
</template>
