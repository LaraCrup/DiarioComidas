<script setup lang="ts">
import { authMessage } from '~/utils/authErrors'

definePageMeta({ layout: 'auth' })

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const route = useRoute()

const password = ref('')
const password2 = ref('')
const busy = ref(false)
const error = ref<string | null>(null)
const done = ref(false)

/**
 * El link de recuperacion llega como /reset?code=xxx. El cliente del browser
 * (detectSessionInUrl) canjea ese code por una sesion solo, pero es asincrono:
 * mientras tanto mostramos "validando" en vez de un formulario que va a fallar.
 */
const linkError = ref<string | null>(
  route.query.error_description ? String(route.query.error_description) : null,
)
const checking = ref(!linkError.value)

onMounted(() => {
  if (!checking.value) return
  const stop = watch(
    user,
    (u) => {
      if (u) {
        checking.value = false
        stop()
      }
    },
    { immediate: true },
  )
  // Si a los 6 segundos no hay sesion, el link no sirve.
  setTimeout(() => {
    if (checking.value) {
      checking.value = false
      linkError.value = 'El link venció o ya se usó. Pedí uno nuevo.'
      stop()
    }
  }, 6000)
})

async function onSubmit() {
  if (password.value.length < 8) {
    error.value = 'La contraseña tiene que tener al menos 8 caracteres.'
    return
  }
  if (password.value !== password2.value) {
    error.value = 'Las dos contraseñas no coinciden.'
    return
  }
  busy.value = true
  error.value = null
  const { error: err } = await supabase.auth.updateUser({ password: password.value })
  busy.value = false
  if (err) {
    error.value = authMessage(err)
    return
  }
  done.value = true
}
</script>

<template>
  <div>
    <template v-if="done">
      <h1 class="text-2xl font-bold text-slate-900">Contraseña cambiada</h1>
      <p class="mt-2 text-sm text-slate-600">Ya podés seguir usando el diario.</p>
      <NuxtLink to="/" class="btn-primary mt-6 w-full">Ir al diario</NuxtLink>
    </template>

    <template v-else-if="checking">
      <p class="text-center text-sm text-slate-500">Validando el link…</p>
    </template>

    <template v-else-if="linkError">
      <h1 class="text-2xl font-bold text-slate-900">Link inválido</h1>
      <p class="mt-2 text-sm text-slate-600">{{ authMessage(linkError) }}</p>
      <NuxtLink to="/olvide" class="btn-primary mt-6 w-full">Pedir otro link</NuxtLink>
    </template>

    <template v-else>
      <h1 class="text-2xl font-bold text-slate-900">Nueva contraseña</h1>

      <form class="mt-8 space-y-4" @submit.prevent="onSubmit">
        <div>
          <label class="label" for="password">Contraseña</label>
          <input
            id="password"
            v-model="password"
            type="password"
            class="field"
            autocomplete="new-password"
            minlength="8"
            required
          />
        </div>
        <div>
          <label class="label" for="password2">Repetila</label>
          <input
            id="password2"
            v-model="password2"
            type="password"
            class="field"
            autocomplete="new-password"
            minlength="8"
            required
          />
        </div>

        <p v-if="error" class="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {{ error }}
        </p>

        <button type="submit" class="btn-primary w-full" :disabled="busy">
          {{ busy ? 'Guardando…' : 'Guardar contraseña' }}
        </button>
      </form>
    </template>
  </div>
</template>
