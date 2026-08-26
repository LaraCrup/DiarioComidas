<script setup lang="ts">
import { CATEGORIES, CATEGORY_LABEL } from '#shared/utils/categories'
import type { MealCategory } from '#shared/types/database'

const model = defineModel<MealCategory>({ required: true })
</script>

<template>
  <div class="grid grid-cols-3 gap-2">
    <button
      v-for="cat in CATEGORIES"
      :key="cat"
      type="button"
      class="min-h-14 rounded-xl border-2 px-2 text-base font-semibold transition-colors"
      :class="
        model === cat
          ? 'border-slate-900 bg-slate-900 text-white'
          : 'border-slate-200 bg-white text-slate-700 active:bg-slate-100'
      "
      :aria-pressed="model === cat"
      @click="model = cat"
    >
      {{ CATEGORY_LABEL[cat] }}
    </button>
  </div>
</template>
