<script setup lang="ts">
import { CATEGORY_LABEL } from '#shared/utils/categories'
import { timeLabel } from '#shared/utils/dates'
import type { Meal } from '#shared/types/database'

defineProps<{
  meal: Meal
  /** URL firmada de la miniatura, si tiene foto. */
  photoUrl?: string | null
}>()
</script>

<template>
  <NuxtLink
    :to="`/comida/${meal.id}`"
    class="card flex gap-3 p-3 active:bg-slate-50"
  >
    <div class="min-w-0 flex-1">
      <div class="flex items-baseline gap-2 text-sm">
        <span class="font-semibold text-slate-900">{{ timeLabel(meal.eaten_at) }}</span>
        <span class="text-slate-500">{{ CATEGORY_LABEL[meal.category] }}</span>
      </div>
      <p class="mt-1 text-base leading-snug break-words whitespace-pre-line text-slate-800">
        {{ meal.description }}
      </p>
      <p
        v-if="meal.note"
        class="mt-1.5 line-clamp-2 text-sm leading-snug break-words text-slate-500 italic"
      >
        {{ meal.note }}
      </p>
    </div>

    <img
      v-if="photoUrl"
      :src="photoUrl"
      alt=""
      loading="lazy"
      decoding="async"
      class="h-20 w-20 shrink-0 rounded-lg bg-slate-100 object-cover"
    />
    <div
      v-else-if="meal.photo_path"
      class="h-20 w-20 shrink-0 animate-pulse rounded-lg bg-slate-100"
    />
  </NuxtLink>
</template>
