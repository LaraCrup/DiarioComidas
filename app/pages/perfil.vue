<script setup lang="ts">
import { authMessage } from '~/utils/authErrors'
import { NAME_MAX, nameMetadata } from '#shared/utils/profile'

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const { fullName } = useProfile()

// --- Nombre y apellido -------------------------------------------------
// Editables y no de solo lectura porque si no, las cuentas creadas antes de
// que el alta los pidiera no tienen forma de cargarlos nunca, y el header y
// el PDF se les quedan mostrando el email para siempre.
const first = ref('')
const last = ref('')
const savingName = ref(false)
const nameError = ref<string | null>(null)
const nameSaved = ref(false)

// Se llenan una sola vez, no en cada cambio del usuario: la sesion se renueva
// sola cada tanto y con un watchEffect eso te borra lo que estas tipeando.
watch(
  user,
  (u, prev) => {
    if (prev && prev.id === u?.id) return
    first.value = String(u?.user_metadata?.first_name ?? '')
    last.value = String(u?.user_metadata?.last_name ?? '')
  },
  { immediate: true },
)

async function saveName() {
  nameError.value = null
  nameSaved.value = false

  const names = nameMetadata(first.value, last.value)
  if (!names.first_name || !names.last_name) {
    nameError.value = 'Nombre y apellido no pueden quedar vacíos.'
    return
  }

  savingName.value = true
  const { error } = await supabase.auth.updateUser({ data: names })
  savingName.value = false

  if (error) {
    nameError.value = authMessage(error)
    return
  }
  nameSaved.value = true
}

// --- Contraseña --------------------------------------------------------
const password = ref('')
const password2 = ref('')
const savingPass = ref(false)
const passError = ref<string | null>(null)
const passSaved = ref(false)

async function savePassword() {
  passError.value = null
  passSaved.value = false

  if (password.value.length < 8) {
    passError.value = 'La contraseña tiene que tener al menos 8 caracteres.'
    return
  }
  if (password.value !== password2.value) {
    passError.value = 'Las dos contraseñas no coinciden.'
    return
  }

  savingPass.value = true
  const { error } = await supabase.auth.updateUser({ password: password.value })
  savingPass.value = false

  if (error) {
    passError.value = authMessage(error)
    return
  }
  password.value = ''
  password2.value = ''
  passSaved.value = true
}

async function logout() {
  await supabase.auth.signOut()
  await navigateTo('/login')
}
</script>

<template>
  <div>
    <AppHeader title="Mi perfil" back="/" />

    <div class="space-y-5 p-4">
      <!-- Quién sos -->
      <div class="card p-4">
        <p class="text-lg font-bold text-slate-900">
          {{ fullName || 'Sin nombre cargado' }}
        </p>
        <p class="mt-0.5 text-sm break-all text-slate-500">{{ user?.email }}</p>
      </div>

      <!-- Nombre y apellido -->
      <form class="card space-y-4 p-4" @submit.prevent="saveName">
        <h2 class="text-sm font-bold tracking-wide text-slate-500 uppercase">Nombre y apellido</h2>

        <div>
          <label class="label" for="first">Nombre</label>
          <input
            id="first"
            v-model="first"
            type="text"
            class="field"
            autocomplete="given-name"
            autocapitalize="words"
            :maxlength="NAME_MAX"
          />
        </div>

        <div>
          <label class="label" for="last">Apellido</label>
          <input
            id="last"
            v-model="last"
            type="text"
            class="field"
            autocomplete="family-name"
            autocapitalize="words"
            :maxlength="NAME_MAX"
          />
        </div>

        <p v-if="nameError" class="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {{ nameError }}
        </p>
        <p
          v-else-if="nameSaved"
          class="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"
        >
          Listo. Ya aparece en el diario y en los PDF que generes.
        </p>

        <button type="submit" class="btn-secondary w-full" :disabled="savingName">
          {{ savingName ? 'Guardando…' : 'Guardar' }}
        </button>
      </form>

      <!-- Contraseña -->
      <form class="card space-y-4 p-4" @submit.prevent="savePassword">
        <h2 class="text-sm font-bold tracking-wide text-slate-500 uppercase">Cambiar contraseña</h2>

        <!-- Un campo de usuario oculto: sin esto el llavero guarda la contraseña
             nueva sin saber de qué cuenta es. -->
        <input
          type="text"
          class="sr-only"
          autocomplete="username"
          tabindex="-1"
          aria-hidden="true"
          :value="user?.email ?? ''"
          readonly
        />

        <div>
          <label class="label" for="pass">Contraseña nueva</label>
          <input
            id="pass"
            v-model="password"
            type="password"
            class="field"
            autocomplete="new-password"
            minlength="8"
          />
          <p class="mt-1.5 text-xs text-slate-500">Mínimo 8 caracteres.</p>
        </div>

        <div>
          <label class="label" for="pass2">Repetila</label>
          <input
            id="pass2"
            v-model="password2"
            type="password"
            class="field"
            autocomplete="new-password"
            minlength="8"
          />
        </div>

        <p v-if="passError" class="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {{ passError }}
        </p>
        <p
          v-else-if="passSaved"
          class="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"
        >
          Contraseña cambiada.
        </p>

        <button type="submit" class="btn-secondary w-full" :disabled="savingPass">
          {{ savingPass ? 'Cambiando…' : 'Cambiar contraseña' }}
        </button>
      </form>

      <button type="button" class="btn-ghost w-full text-red-600" @click="logout">
        Cerrar sesión
      </button>
    </div>
  </div>
</template>
