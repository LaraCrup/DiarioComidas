<script setup lang="ts">
import { dayKey, friendlyDayLabel, todayKey } from '#shared/utils/dates'
import type { Meal } from '#shared/types/database'

const { list, signedUrls } = useMeals()
const supabase = useSupabaseClient()

const meals = ref<Meal[]>([])
const urls = ref(new Map<string, string>())
const pending = ref(true)
const error = ref<string | null>(null)

async function load() {
  pending.value = true
  error.value = null
  try {
    meals.value = await list()
    // Las miniaturas se firman todas juntas, en una sola llamada.
    const paths = meals.value.map((m) => m.photo_path).filter((p): p is string => Boolean(p))
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
 * Como la query ya viene ordenada por eaten_at desc, el Map conserva ese orden.
 */
const groups = computed(() => {
  const map = new Map<string, Meal[]>()
  for (const m of meals.value) {
    const k = dayKey(m.eaten_at)
    const bucket = map.get(k)
    if (bucket) bucket.push(m)
    else map.set(k, [m])
  }
  const today = todayKey()
  return [...map.entries()].map(([key, items]) => ({
    key,
    label: friendlyDayLabel(key, today),
    items,
  }))
})

async function logout() {
  await supabase.auth.signOut()
  await navigateTo('/login')
}
</script>

<template>
  <div class="flex min-h-dvh flex-col">
    <AppHeader title="Diario">
      <template #actions>
        <NuxtLink
          to="/exportar"
          class="btn-ghost px-3 text-sm"
          aria-label="Exportar a PDF"
        >
          Exportar
        </NuxtLink>
        <button
          type="button"
          class="flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 active:bg-slate-100"
          aria-label="Cerrar sesión"
          @click="logout"
        >
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path
              d="M15 17l5-5-5-5M20 12H9M12 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
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
      <div v-else-if="!meals.length" class="card mt-8 p-8 text-center">
        <p class="text-base font-semibold text-slate-800">Todavía no cargaste nada</p>
        <p class="mt-1 text-sm text-slate-500">
          Anotá lo que comés apenas terminás. Tarda menos de 30 segundos.
        </p>
      </div>

      <!-- Lista -->
      <div v-else class="space-y-6">
        <section v-for="group in groups" :key="group.key">
          <h2
            class="mb-2 text-sm font-bold tracking-wide text-slate-500 uppercase"
          >
            {{ group.label }}
          </h2>
          <div class="space-y-2">
            <MealCard
              v-for="meal in group.items"
              :key="meal.id"
              :meal="meal"
              :photo-url="meal.photo_path ? urls.get(meal.photo_path) : null"
            />
          </div>
        </section>
      </div>
    </main>

    <!-- El unico boton que importa, en la zona del pulgar -->
    <div class="sticky-bottom px-4 pt-3">
      <NuxtLink to="/nueva" class="btn-primary w-full text-lg">
        <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M12 5v14M5 12h14" stroke-linecap="round" />
        </svg>
        Cargar comida
      </NuxtLink>
    </div>
  </div>
</template>
