<script setup lang="ts">
import type { WorkoutKind } from '#shared/types/database'

defineProps<{ kind: WorkoutKind }>()
</script>

<template>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true">
    <!-- Mancuerna -->
    <g v-if="kind === 'gimnasio'" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 9v6M7 7.5v9M17 7.5v9M20 9v6M7 12h10" />
    </g>
    <!-- Figura corriendo -->
    <g v-else-if="kind === 'correr'" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="14.5" cy="4.6" r="2.1" />
      <path d="m6 21 3-4.6 3.4-2.2-1.4-4.6L8 11.6 6.6 15" />
      <path d="m11 9.6 3.6-1.8 3 3.2 3 1" />
      <path d="m13.5 13.8 1.8 3.4L18 21" />
    </g>
    <!-- Pulso: la sesion de kine -->
    <g v-else stroke-linecap="round" stroke-linejoin="round">
      <path d="M2 12h4l2.5-6 4 13L15 12h7" />
    </g>
  </svg>
</template>
