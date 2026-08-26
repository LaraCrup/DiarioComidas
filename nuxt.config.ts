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
        // slate-900, el mismo del boton primario: la barra del browser sigue al header.
        { name: 'theme-color', content: '#0f172a' },
        { name: 'robots', content: 'noindex, nofollow' },

        // --- PWA -------------------------------------------------------
        // El estandar es mobile-web-app-capable; el prefijo apple sigue
        // haciendo falta para iOS, que no lee el otro.
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        // Como se llama el icono en la pantalla de inicio del iPhone.
        { name: 'apple-mobile-web-app-title', content: 'Diario' },
        // `default` = barra de estado blanca con texto negro, igual que el
        // header. Con `black-translucent` el contenido se le mete abajo.
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
      ],
      link: [
        { rel: 'manifest', href: '/manifest.webmanifest' },
        { rel: 'icon', href: '/favicon.ico', sizes: '32x32' },
        { rel: 'icon', type: 'image/svg+xml', href: '/icon.svg' },
        // iOS ignora los iconos del manifest: usa este y nada mas.
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      ],
    },
  },

  typescript: {
    strict: true,
  },
})
