/*
 * Service worker del Diario de comidas. A mano, sin Workbox: el proyecto no
 * suma dependencias y aca lo que importa es controlar exactamente qué se
 * guarda en el disco del teléfono.
 *
 * La regla que manda: NADA que tenga datos de la persona toca el cache. Son
 * datos de salud, y un cache es un archivo que queda en el dispositivo después
 * de cerrar sesión. Se cachean solo tres cosas, todas anónimas:
 *   - los assets del build (/_nuxt/*), que llevan hash en el nombre
 *   - los iconos y el manifest
 *   - la página de "sin conexión"
 * El HTML de las pantallas, /api/* y todo lo que va a Supabase (otro origen)
 * pasan siempre por la red.
 *
 * Al cambiar algo de lo precacheado, subí VERSION: `activate` borra los viejos.
 */

const VERSION = 'v1'
const CACHE = `diario-${VERSION}`
const OFFLINE_URL = '/offline.html'

const PRECACHE = [OFFLINE_URL, '/manifest.webmanifest', '/icon-192.png', '/icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      // Sin esto, una versión nueva espera a que se cierren todas las pestañas.
      // Como solo cacheamos assets con hash, entrar de una no deja nada inconsistente.
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Otro origen (Supabase: Auth, PostgREST, Storage): no lo tocamos siquiera.
  if (url.origin !== self.location.origin) return

  // El PDF y cualquier endpoint autenticado: siempre red, nunca cache.
  if (url.pathname.startsWith('/api/')) return

  // Assets del build. El nombre lleva hash del contenido, así que lo que está
  // en cache siempre es el archivo correcto: no hace falta revalidar.
  if (url.pathname.startsWith('/_nuxt/')) {
    event.respondWith(cacheFirst(request))
    return
  }

  // Navegación: siempre a la red. Sin conexión mostramos una página que lo dice.
  // No cacheamos el HTML a propósito: los registros viven en Supabase, así que
  // una app abierta sin conexión sería un cascarón vacío. Preferimos decirlo.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => (await caches.match(OFFLINE_URL)) ?? Response.error()),
    )
    return
  }

  // El resto de public/: iconos, manifest, favicon.
  event.respondWith(cacheFirst(request))
})

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached

  const response = await fetch(request)
  // `basic` = mismo origen y respuesta completa. Un opaque o un 404 no se guardan.
  if (response.ok && response.type === 'basic') {
    const cache = await caches.open(CACHE)
    cache.put(request, response.clone())
  }
  return response
}
