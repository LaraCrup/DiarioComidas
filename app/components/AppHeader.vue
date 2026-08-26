<script setup lang="ts">
defineProps<{
  title: string
  /** Ruta del boton "atras". Si no viene, no se muestra. */
  back?: string
}>()
</script>

<template>
  <header
    class="sticky top-0 z-30 flex h-14 items-center gap-1 border-b border-slate-200 bg-white/95 px-2 backdrop-blur"
  >
    <NuxtLink
      v-if="back"
      :to="back"
      class="flex h-11 w-11 items-center justify-center rounded-xl text-slate-700 active:bg-slate-100"
      aria-label="Volver"
    >
      <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="m15 18-6-6 6-6" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </NuxtLink>
    <div v-else class="w-2" />

    <h1 class="min-w-0 flex-1 truncate text-lg font-bold text-slate-900">{{ title }}</h1>

    <slot name="actions" />
  </header>
</template>
