<script setup lang="ts">
import { deviceTimeZone, endOfLocalDay, startOfLocalDay, todayKey } from '#shared/utils/dates'

// Default: las últimas dos semanas.
const from = ref(todayKey(-13))
const to = ref(todayKey())

const busy = ref(false)
const error = ref<string | null>(null)

async function generar() {
  error.value = null
  if (from.value > to.value) {
    error.value = 'La fecha de inicio es posterior a la de fin.'
    return
  }
  busy.value = true
  try {
    // Los limites del rango se calculan en hora local y se mandan como instantes:
    // asi el "26 de agosto" del usuario no se corre por el offset del servidor.
    const params = new URLSearchParams({
      from: startOfLocalDay(from.value),
      to: endOfLocalDay(to.value),
      tz: deviceTimeZone(),
    })

    const res = await fetch(`/api/export?${params}`, { credentials: 'same-origin' })

    if (!res.ok) {
      const body = await res.json().catch(() => null)
      throw new Error(
        body?.data?.message ?? body?.statusMessage ?? 'No pudimos generar el PDF.',
      )
    }

    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `diario-comidas-${from.value}-a-${to.value}.pdf`
    document.body.appendChild(a)
    a.click()
    a.remove()
    // Damos un respiro antes de revocar: Safari lee la URL despues del click.
    setTimeout(() => URL.revokeObjectURL(url), 30_000)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No pudimos generar el PDF.'
  } finally {
    busy.value = false
  }
}

function preset(days: number) {
  from.value = todayKey(-(days - 1))
  to.value = todayKey()
}
</script>

<template>
  <div>
    <AppHeader title="Exportar" back="/" />

    <div class="space-y-5 p-4">
      <p class="text-sm text-slate-600">
        Un PDF con tus registros agrupados por día, con las fotos incluidas. Se arma en el
        servidor, así que podés mandarlo por mail o imprimirlo tal cual.
      </p>

      <div class="flex gap-2">
        <button type="button" class="btn-secondary flex-1 text-sm" @click="preset(7)">
          Última semana
        </button>
        <button type="button" class="btn-secondary flex-1 text-sm" @click="preset(14)">
          Últimas 2 semanas
        </button>
      </div>

      <div class="card space-y-4 p-4">
        <div>
          <label class="label" for="from">Desde</label>
          <input id="from" v-model="from" type="date" class="field" :max="to" />
        </div>
        <div>
          <label class="label" for="to">Hasta</label>
          <input id="to" v-model="to" type="date" class="field" :min="from" />
        </div>
      </div>

      <p v-if="error" class="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
        {{ error }}
      </p>

      <p v-if="busy" class="text-center text-sm text-slate-500">
        Armando el PDF. Con muchas fotos puede tardar unos segundos.
      </p>
    </div>

    <div class="sticky-bottom px-4 pt-3">
      <button type="button" class="btn-primary w-full" :disabled="busy" @click="generar">
        <span
          v-if="busy"
          class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
        />
        {{ busy ? 'Generando…' : 'Generar PDF' }}
      </button>
    </div>
  </div>
</template>
