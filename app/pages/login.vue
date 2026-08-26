<script setup lang="ts">
import { authMessage } from '~/utils/authErrors'

definePageMeta({ layout: 'auth' })

const supabase = useSupabaseClient()
const user = useSupabaseUser()

const email = ref('')
const password = ref('')
const busy = ref(false)
const error = ref<string | null>(null)

// Si ya hay sesion (volviste con el back, o expiro el redirect), afuera.
watchEffect(() => {
  if (user.value) navigateTo('/', { replace: true })
})

async function onSubmit() {
  busy.value = true
  error.value = null
  const { error: err } = await supabase.auth.signInWithPassword({
    email: email.value.trim(),
    password: password.value,
  })
  busy.value = false
  if (err) {
    error.value = authMessage(err)
    return
  }
  await navigateTo('/', { replace: true })
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-slate-900">Diario de comidas</h1>
    <p class="mt-1 text-sm text-slate-500">Entrá para ver tus registros.</p>

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

      <div>
        <label class="label" for="password">Contraseña</label>
        <input
          id="password"
          v-model="password"
          type="password"
          class="field"
          autocomplete="current-password"
          required
        />
      </div>

      <p v-if="error" class="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
        {{ error }}
      </p>

      <button type="submit" class="btn-primary w-full" :disabled="busy">
        {{ busy ? 'Entrando…' : 'Entrar' }}
      </button>
    </form>

    <div class="mt-6 flex items-center justify-between text-sm">
      <NuxtLink to="/registro" class="font-semibold text-slate-800 underline">Crear cuenta</NuxtLink>
      <NuxtLink to="/olvide" class="text-slate-500 underline">Olvidé mi contraseña</NuxtLink>
    </div>
  </div>
</template>
