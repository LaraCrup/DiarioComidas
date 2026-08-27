<script setup lang="ts">
/**
 * Un solo input, sin `capture`.
 *
 * `capture="environment"` abria la camara de una y tapaba la galeria, asi que
 * habia dos botones. Pero el selector de iOS ya ofrece "Sacar foto" adentro del
 * mismo menu, o sea que el boton de camara era un atajo a algo que el sistema
 * pregunta igual. Con uno solo se llega a las dos cosas y la pantalla queda
 * mas limpia.
 */
const props = defineProps<{
  /** URL firmada de la foto que ya estaba guardada. */
  existingUrl?: string | null
}>()

const file = defineModel<File | null>('file', { required: true })
const removed = defineModel<boolean>('removed', { required: true })

const input = useTemplateRef<HTMLInputElement>('input')
const localPreview = ref<string | null>(null)

const preview = computed(() => {
  if (localPreview.value) return localPreview.value
  if (removed.value) return null
  return props.existingUrl ?? null
})

function onPick(e: Event) {
  const el = e.target as HTMLInputElement
  const picked = el.files?.[0] ?? null
  // Cancelar el selector dispara change con files vacio: no pisamos lo que habia.
  if (!picked) return
  revoke()
  file.value = picked
  removed.value = false
  localPreview.value = URL.createObjectURL(picked)
  // Asi elegir dos veces la misma foto vuelve a disparar el change.
  el.value = ''
}

function clear() {
  revoke()
  file.value = null
  removed.value = true
  if (input.value) input.value.value = ''
}

function revoke() {
  if (localPreview.value) URL.revokeObjectURL(localPreview.value)
  localPreview.value = null
}

onBeforeUnmount(revoke)
</script>

<template>
  <div>
    <input
      ref="input"
      type="file"
      accept="image/*"
      class="sr-only"
      tabindex="-1"
      aria-hidden="true"
      @change="onPick"
    />

    <div v-if="preview">
      <div class="relative">
        <img
          :src="preview"
          alt="Foto del plato"
          class="h-56 w-full rounded-xl border border-slate-200 bg-slate-100 object-cover"
        />
        <button
          type="button"
          class="absolute top-2 right-2 flex h-11 w-11 items-center justify-center rounded-full bg-slate-900/70 text-white backdrop-blur active:bg-slate-900"
          aria-label="Quitar foto"
          @click="clear"
        >
          <svg
            class="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
          >
            <path d="M18 6 6 18M6 6l12 12" stroke-linecap="round" />
          </svg>
        </button>
      </div>

      <button type="button" class="btn-secondary mt-2 w-full" @click="input?.click()">
        <svg
          class="h-5 w-5 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
        >
          <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
          <circle cx="8.5" cy="9.5" r="1.6" />
          <path d="m4 17 4.5-4.5a1.5 1.5 0 0 1 2.1 0L15 17" stroke-linecap="round" />
          <path d="m13.5 14 2-2a1.5 1.5 0 0 1 2.1 0L20 14.5" stroke-linecap="round" />
        </svg>
        Cambiar foto
      </button>
    </div>

    <button
      v-else
      type="button"
      class="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white px-3 text-base font-semibold text-slate-600 active:bg-slate-50"
      @click="input?.click()"
    >
      <svg
        class="h-5 w-5 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
      >
        <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
        <circle cx="8.5" cy="9.5" r="1.6" />
        <path d="m4 17 4.5-4.5a1.5 1.5 0 0 1 2.1 0L15 17" stroke-linecap="round" />
        <path d="m13.5 14 2-2a1.5 1.5 0 0 1 2.1 0L20 14.5" stroke-linecap="round" />
      </svg>
      Agregar foto
    </button>
  </div>
</template>
