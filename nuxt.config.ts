import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },

  modules: ['@nuxtjs/supabase'],

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  supabase: {
    // Los tipos los pasamos a mano en cada composable (useSupabaseClient<Database>()),
    // así no dependemos de que el módulo encuentre un archivo generado.
    types: false,

    // El módulo guarda la sesión en cookies (useSsrCookies: true por defecto).
    // Eso es lo que permite que /api/export lea al usuario del lado del servidor.
    redirect: true,
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      // Rutas públicas. /login y /callback ya quedan excluidas solas.
      exclude: ['/registro', '/olvide', '/reset'],
    },

    // Default del módulo: 8 horas. Para un diario que abrís 4 veces por día
    // durante dos semanas, eso significa loguearte todos los días. 30 días.
    cookieOptions: {
      maxAge: 60 * 60 * 24 * 30,
      sameSite: 'lax',
      secure: true,
    },
  },

  nitro: {
    // El PDF con muchas fotos puede tardar. En Vercel el default son 10s.
    vercel: { functions: { maxDuration: 60 } },
  },

  app: {
    head: {
      htmlAttrs: { lang: 'es' },
      title: 'Diario de comidas',
      meta: [
        { charset: 'utf-8' },
        // viewport-fit=cover para poder usar env(safe-area-inset-*) en iPhone
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#0f172a' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'robots', content: 'noindex, nofollow' },
      ],
    },
  },

  typescript: {
    strict: true,
  },
})
