<script setup lang="ts">
import { authMessage } from '~/utils/authErrors'

definePageMeta({ layout: 'auth' })

const supabase = useSupabaseClient()

const email = ref('')
const busy = ref(false)
const sent = ref(false)
const error = ref<string | null>(null)

async function onSubmit() {
  busy.value = true
  error.value = null
  const { error: err } = await supabase.auth.resetPasswordForEmail(email.value.trim(), {
    // Supabase vuelve a esta URL con ?code=...; el cliente del browser lo canjea solo.
    redirectTo: `${window.location.origin}/reset`,
  })
  busy.value = false
  if (err) {
    error.value = authMessage(err)
    return
  }
  sent.value = true
}
</script>

<template>
  <div>
    <template v-if="sent">
      <h1 class="text-2xl font-bold text-slate-900">Listo</h1>
      <p class="mt-2 text-sm text-slate-600">
        Si <strong>{{ email }}</strong> tiene cuenta, te llega un link para poner una contraseña
        nueva. <strong>Abrilo en este mismo navegador</strong>: el link se valida contra algo que
        quedó guardado acá.
      </p>
      <NuxtLink to="/login" class="btn-secondary mt-6 w-full">Volver</NuxtLink>
    </template>

    <template v-else>
      <h1 class="text-2xl font-bold text-slate-900">Recuperar contraseña</h1>
      <p class="mt-1 text-sm text-slate-500">Te mandamos un link por mail.</p>

      <form class="mt-8 space-y-4" @submit.prevent="onSubmit">
        <div>
          <label class="label" for="email">Email</label>
          <input
            id="email"
            v-model="email"
            type="email"
            class="field"
            autocomplete="username"
            inputmode="email"
            autocapitalize="off"
            required
          />
        </div>

        <p v-if="error" class="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {{ error }}
        </p>

        <button type="submit" class="btn-primary w-full" :disabled="busy">
          {{ busy ? 'Enviando…' : 'Mandar link' }}
        </button>
      </form>

      <NuxtLink to="/login" class="mt-6 block text-center text-sm text-slate-500 underline">
        Volver al login
      </NuxtLink>
    </template>
  </div>
</template>
