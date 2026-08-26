/**
 * Registra el service worker que hace instalable la app.
 *
 * Solo en produccion: en dev el SW se queda con assets viejos y termina tapando
 * cambios que ya guardaste, que es de las cosas mas molestas de debuggear.
 */
export default defineNuxtPlugin(() => {
  if (import.meta.dev || !('serviceWorker' in navigator)) return

  // Despues del load: registrarlo antes compite por ancho de banda con el
  // primer render, justo cuando la app todavia no pinto nada.
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Sin SW la app anda igual, solo deja de ser instalable. No molestamos.
    })
  })
})
