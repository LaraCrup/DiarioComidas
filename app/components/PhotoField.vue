<script setup lang="ts">
/**
 * Dos inputs y no uno con el `capture` dinamico.
 *
 * `capture="environment"` abre la camara trasera de una, sin pasar por el
 * selector: es lo que queres cuando estas parada frente al plato. Pero el
 * atributo tapa la galeria, y sacarlo y ponerlo antes de cada `.click()` es
 * fragil (Safari se queda con el estado anterior del input). Dos inputs
 * separados son cuatro lineas de HTML y andan siempre.
 *
 * En desktop los dos degradan al mismo selector de archivos.
 */
const props = defineProps<{
  /** URL firmada de la foto que ya estaba guardada. */
  existingUrl?: string | null
}>()

const file = defineModel<File | null>('file', { required: true })
const removed = defineModel<boolean>('removed', { required: true })

const cameraInput = useTemplateRef<HTMLInputElement>('cameraInput')
const galleryInput = useTemplateRef<HTMLInputElement>('galleryInput')
const localPreview = ref<string | null>(null)

const preview = computed(() => {
  if (localPreview.value) return localPreview.value
  if (removed.value) return null
  return props.existingUrl ?? null
})

function onPick(e: Event) {
  const input = e.target as HTMLInputElement
  const picked = input.files?.[0] ?? null
  // Cancelar el selector dispara change con files vacio: no pisamos lo que habia.
  if (!picked) return
  revoke()
  file.value = picked
  removed.value = false
  localPreview.value = URL.createObjectURL(picked)
  // Asi elegir dos veces la misma foto vuelve a disparar el change.
  input.value = ''
}

function clear() {
  revoke()
  file.value = null
  removed.value = true
  if (cameraInput.value) cameraInput.value.value = ''
  if (galleryInput.value) galleryInput.value.value = ''
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
      ref="cameraInput"
      type="file"
      accept="image/*"
      capture="environment"
      class="sr-only"
      tabindex="-1"
      aria-hidden="true"
      @change="onPick"
    />
    <!-- Sin `capture`: abre la galeria (o Fotos en iOS). -->
    <input
      ref="galleryInput"
      type="file"
      accept="image/*"
      class="sr-only"
      tabindex="-1"
      aria-hidden="true"
      @change="onPick"
    />

    <!-- Con foto: la sacamos del medio y dejamos las dos formas de reemplazarla -->
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

      <div class="mt-2 grid grid-cols-2 gap-2">
        <button type="button" class="btn-secondary px-3" @click="cameraInput?.click()">
          <svg
            class="h-5 w-5 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
          >
            <path
              d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.2a1 1 0 0 0 .83-.45l.94-1.4A1 1 0 0 1 9.3 3.7h5.4a1 1 0 0 1 .83.45l.94 1.4A1 1 0 0 0 17.3 6h1.2A2.5 2.5 0 0 1 21 8.5v9A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5v-9Z"
            />
            <circle cx="12" cy="13" r="3.4" />
          </svg>
          Sacar otra
        </button>
        <button type="button" class="btn-secondary px-3" @click="galleryInput?.click()">
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
          Galería
        </button>
      </div>
    </div>

    <!-- Sin foto: las dos opciones con el mismo peso -->
    <div v-else class="grid grid-cols-2 gap-2">
      <button
        type="button"
        class="flex min-h-14 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white px-3 text-base font-semibold text-slate-600 active:bg-slate-50"
        @click="cameraInput?.click()"
      >
        <svg
          class="h-5 w-5 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
        >
          <path
            d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.2a1 1 0 0 0 .83-.45l.94-1.4A1 1 0 0 1 9.3 3.7h5.4a1 1 0 0 1 .83.45l.94 1.4A1 1 0 0 0 17.3 6h1.2A2.5 2.5 0 0 1 21 8.5v9A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5v-9Z"
          />
          <circle cx="12" cy="13" r="3.4" />
        </svg>
        Sacar foto
      </button>

      <button
        type="button"
        class="flex min-h-14 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white px-3 text-base font-semibold text-slate-600 active:bg-slate-50"
        @click="galleryInput?.click()"
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
        Galería
      </button>
    </div>
  </div>
</template>
