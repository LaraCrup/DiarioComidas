<script setup lang="ts">
import { dayKey, friendlyDayLabel, todayKey } from '#shared/utils/dates'
import type { Meal, Workout } from '#shared/types/database'

const { list: listMeals, signedUrls } = useMeals()
const { list: listWorkouts } = useWorkouts()
const { displayName, firstName } = useProfile()

/**
 * El diario mezcla dos cosas distintas en una sola linea de tiempo. Son tablas
 * separadas, asi que el orden se arma aca: cada fila se reduce a "que es" y
 * "cuando fue", y con eso alcanza para intercalarlas.
 */
type Entry =
  | { kind: 'meal'; id: string; at: string; meal: Meal }
  | { kind: 'workout'; id: string; at: string; workout: Workout }

const entries = ref<Entry[]>([])
const urls = ref(new Map<string, string>())
const pending = ref(true)
const error = ref<string | null>(null)

async function load() {
  pending.value = true
  error.value = null
  try {
    // Las dos consultas salen juntas: son independientes y cada una pasa por
    // su propio RLS.
    const [meals, workouts] = await Promise.all([listMeals(), listWorkouts()])

    entries.value = [
      ...meals.map((m): Entry => ({ kind: 'meal', id: m.id, at: m.eaten_at, meal: m })),
      ...workouts.map((w): Entry => ({ kind: 'workout', id: w.id, at: w.done_at, workout: w })),
    ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())

    // Las miniaturas se firman todas juntas, en una sola llamada.
    const paths = meals.map((m) => m.photo_path).filter((p): p is string => Boolean(p))
    urls.value = await signedUrls(paths)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No pudimos cargar tus registros.'
  } finally {
    pending.value = false
  }
}

onMounted(load)

/**
 * Agrupado por dia LOCAL, no por date(eaten_at) en SQL: en UTC una cena de las
 * 22:00 en Argentina caeria en el dia siguiente.
 * La lista ya viene ordenada por fecha desc, asi que el Map conserva ese orden.
 */
const groups = computed(() => {
  const map = new Map<string, Entry[]>()
  for (const e of entries.value) {
    const k = dayKey(e.at)
    const bucket = map.get(k)
    if (bucket) bucket.push(e)
    else map.set(k, [e])
  }
  const today = todayKey()
  return [...map.entries()].map(([key, items]) => ({
    key,
    label: friendlyDayLabel(key, today),
    items,
  }))
})
</script>

<template>
  <div class="flex min-h-dvh flex-col">
    <AppHeader title="Diario" :subtitle="displayName">
      <template #actions>
        <NuxtLink to="/exportar" class="btn-ghost px-3 text-sm" aria-label="Exportar a PDF">
          Exportar
        </NuxtLink>
        <NuxtLink
          to="/perfil"
          class="flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 active:bg-slate-100"
          aria-label="Mi perfil"
        >
          <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path
              d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </NuxtLink>
      </template>
    </AppHeader>

    <main class="flex-1 p-4">
      <!-- Cargando -->
      <div v-if="pending" class="space-y-3">
        <div v-for="i in 3" :key="i" class="card h-24 animate-pulse bg-white" />
      </div>

      <!-- Error -->
      <div v-else-if="error" class="card p-4">
        <p class="text-sm text-red-700">{{ error }}</p>
        <button type="button" class="btn-secondary mt-3 w-full" @click="load">Reintentar</button>
      </div>

      <!-- Vacio -->
      <div v-else-if="!entries.length" class="card mt-8 p-8 text-center">
        <p class="text-base font-semibold text-slate-800">
          {{ firstName ? `${firstName}, todavía no cargaste nada` : 'Todavía no cargaste nada' }}
        </p>
        <p class="mt-1 text-sm text-slate-500">
          Anotá lo que comés apenas terminás. Tarda menos de 30 segundos.
        </p>
      </div>

      <!-- Lista -->
      <div v-else class="space-y-6">
        <section v-for="group in groups" :key="group.key">
          <h2 class="mb-2 text-sm font-bold tracking-wide text-slate-500 uppercase">
            {{ group.label }}
          </h2>
          <div class="space-y-2">
            <template v-for="entry in group.items" :key="entry.id">
              <MealCard
                v-if="entry.kind === 'meal'"
                :meal="entry.meal"
                :photo-url="entry.meal.photo_path ? urls.get(entry.meal.photo_path) : null"
              />
              <WorkoutCard v-else :workout="entry.workout" />
            </template>
          </div>
        </section>
      </div>
    </main>

    <!-- Los dos botones de alta, en la zona del pulgar. La comida es lo que se
         carga varias veces por dia, asi que se queda con el primario. -->
    <div class="sticky-bottom grid grid-cols-2 gap-2 px-4 pt-3">
      <NuxtLink to="/nueva" class="btn-primary px-3">
        <svg class="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M12 5v14M5 12h14" stroke-linecap="round" />
        </svg>
        Comida
      </NuxtLink>
      <NuxtLink to="/entrenamiento/nuevo" class="btn-secondary px-3">
        Entrenamiento
      </NuxtLink>
    </div>
  </div>
</template>
