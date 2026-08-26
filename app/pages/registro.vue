<script setup lang="ts">
import { authMessage } from '~/utils/authErrors'
import { NAME_MAX, nameMetadata, normalizeName } from '#shared/utils/profile'

definePageMeta({ layout: 'auth' })

const supabase = useSupabaseClient()

const firstName = ref('')
const lastName = ref('')
const email = ref('')
const password = ref('')
const busy = ref(false)
const error = ref<string | null>(null)
const checkEmail = ref(false)

const firstNameEl = useTemplateRef<HTMLInputElement>('firstNameEl')
const lastNameEl = useTemplateRef<HTMLInputElement>('lastNameEl')

async function onSubmit() {
  error.value = null

  // El `required` del input ya frena el campo vacio, pero no un espacio suelto.
  const names = nameMetadata(firstName.value, lastName.value)
  if (!names.first_name) {
    error.value = 'Escribí tu nombre.'
    firstNameEl.value?.focus()
    return
  }
  if (!names.last_name) {
    error.value = 'Escribí tu apellido.'
    lastNameEl.value?.focus()
    return
  }
  if (password.value.length < 8) {
    error.value = 'La contraseña tiene que tener al menos 8 caracteres.'
    return
  }

  busy.value = true

  const { data, error: err } = await supabase.auth.signUp({
    email: email.value.trim(),
    password: password.value,
    // Queda en el user_metadata del usuario, o sea que viaja en la sesion:
    // la app lo lee sin consultar nada y el PDF lo firma con ese nombre.
    options: { data: names, emailRedirectTo: `${window.location.origin}/confirm` },
  })
  busy.value = false

  if (err) {
    error.value = authMessage(err)
    return
  }
  // Con "Confirm email" apagado en Supabase, signUp ya devuelve sesion y entramos derecho.
  // Si esta prendido, data.session viene null y hay que pasar por el mail.
  if (data.session) {
    await navigateTo('/', { replace: true })
  } else {
    checkEmail.value = true
  }
}

// Para el cartel de "revisá tu mail", cuando ya no queda el formulario a la vista.
const greetName = computed(() => normalizeName(firstName.value))
</script>

<template>
  <div>
    <template v-if="checkEmail">
      <h1 class="text-2xl font-bold text-slate-900">
        Listo{{ greetName ? `, ${greetName}` : '' }}: revisá tu mail
      </h1>
      <p class="mt-2 text-sm text-slate-600">
        Te mandamos un link a <strong>{{ email }}</strong> para confirmar la cuenta. Abrilo en este
        mismo teléfono.
      </p>
      <NuxtLink to="/login" class="btn-secondary mt-6 w-full">Ir al login</NuxtLink>
    </template>

    <template v-else>
      <h1 class="text-2xl font-bold text-slate-900">Crear cuenta</h1>
      <p class="mt-1 text-sm text-slate-500">Tus registros son solo tuyos.</p>

      <form class="mt-8 space-y-4" @submit.prevent="onSubmit">
        <div>
          <label class="label" for="first-name">Nombre</label>
          <input
            id="first-name"
            ref="firstNameEl"
            v-model="firstName"
            type="text"
            class="field"
            autocomplete="given-name"
            autocapitalize="words"
            :maxlength="NAME_MAX"
            required
          />
        </div>

        <div>
          <label class="label" for="last-name">Apellido</label>
          <input
            id="last-name"
            ref="lastNameEl"
            v-model="lastName"
            type="text"
            class="field"
            autocomplete="family-name"
            autocapitalize="words"
            :maxlength="NAME_MAX"
            required
          />
        </div>

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
            autocomplete="new-password"
            minlength="8"
            required
          />
          <p class="mt-1.5 text-xs text-slate-500">Mínimo 8 caracteres.</p>
        </div>

        <p v-if="error" class="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {{ error }}
        </p>

        <button type="submit" class="btn-primary w-full" :disabled="busy">
          {{ busy ? 'Creando…' : 'Crear cuenta' }}
        </button>
      </form>

      <NuxtLink to="/login" class="mt-6 block text-center text-sm text-slate-500 underline">
        Ya tengo cuenta
      </NuxtLink>
    </template>
  </div>
</template>
