<script setup lang="ts">
/**
 * `capture="environment"` en el input abre directo la camara trasera en el celular.
 * En desktop degrada solo al selector de archivos.
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
  const picked = (e.target as HTMLInputElement).files?.[0] ?? null
  if (!picked) return
  revoke()
  file.value = picked
  removed.value = false
  localPreview.value = URL.createObjectURL(picked)
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
      capture="environment"
      class="sr-only"
      @change="onPick"
    />

    <div v-if="preview" class="relative">
      <img
        :src="preview"
        alt="Foto del plato"
        class="h-56 w-full rounded-xl border border-slate-200 bg-slate-100 object-cover"
      />
      <div class="mt-2 flex gap-2">
        <button type="button" class="btn-secondary flex-1" @click="input?.click()">
          Cambiar
        </button>
        <button type="button" class="btn-ghost px-4" @click="clear">Quitar</button>
      </div>
    </div>

    <button
      v-else
      type="button"
      class="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white text-base font-semibold text-slate-600 active:bg-slate-50"
      @click="input?.click()"
    >
      <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
        <path
          d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.2a1 1 0 0 0 .83-.45l.94-1.4A1 1 0 0 1 9.3 3.7h5.4a1 1 0 0 1 .83.45l.94 1.4A1 1 0 0 0 17.3 6h1.2A2.5 2.5 0 0 1 21 8.5v9A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5v-9Z"
        />
        <circle cx="12" cy="13" r="3.4" />
      </svg>
      Sacar foto
    </button>
  </div>
</template>
