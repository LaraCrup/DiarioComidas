<script setup lang="ts">
/**
 * Landing del link de confirmacion de mail. El cliente de Supabase canjea el
 * ?code= de la URL solo; aca nomas esperamos a que aparezca la sesion.
 */
definePageMeta({ layout: 'auth' })

const user = useSupabaseUser()
const failed = ref(false)

watchEffect(() => {
  if (user.value) navigateTo('/', { replace: true })
})

onMounted(() => {
  setTimeout(() => {
    if (!user.value) failed.value = true
  }, 6000)
})
</script>

<template>
  <div class="text-center">
    <template v-if="failed">
      <h1 class="text-2xl font-bold text-slate-900">No pudimos confirmar</h1>
      <p class="mt-2 text-sm text-slate-600">El link venció o ya se usó.</p>
      <NuxtLink to="/login" class="btn-primary mt-6 w-full">Ir al login</NuxtLink>
    </template>
    <p v-else class="text-sm text-slate-500">Confirmando tu cuenta…</p>
  </div>
</template>
