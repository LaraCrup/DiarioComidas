<script setup lang="ts">
import type { MealPayload } from '~/composables/useMeals'

const { create } = useMeals()
const busy = ref(false)
const error = ref<string | null>(null)

async function onSubmit(payload: MealPayload) {
  busy.value = true
  error.value = null
  try {
    await create(payload)
    await navigateTo('/')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No pudimos guardar el registro.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div>
    <AppHeader title="Nueva comida" back="/" />
    <MealForm :busy="busy" @submit="onSubmit">
      <template #extra>
        <p
          v-if="error"
          class="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          {{ error }}
        </p>
      </template>
    </MealForm>
  </div>
</template>
