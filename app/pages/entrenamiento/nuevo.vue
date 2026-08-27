<script setup lang="ts">
import type { WorkoutPayload } from '~/composables/useWorkouts'

const { create } = useWorkouts()
const busy = ref(false)
const error = ref<string | null>(null)

async function onSubmit(payload: WorkoutPayload) {
  busy.value = true
  error.value = null
  try {
    await create(payload)
    await navigateTo('/')
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No pudimos guardar el entrenamiento.'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div>
    <AppHeader title="Nuevo entrenamiento" back="/" />
    <WorkoutForm :busy="busy" @submit="onSubmit">
      <template #extra>
        <p v-if="error" class="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {{ error }}
        </p>
      </template>
    </WorkoutForm>
  </div>
</template>
