/** Supabase devuelve los errores de auth en ingles. Los pocos que se ven seguido, traducidos. */
const MAP: Array<[RegExp, string]> = [
  [/invalid login credentials/i, 'Email o contraseña incorrectos.'],
  [/email not confirmed/i, 'Falta confirmar el email. Buscá el mail de Supabase en tu bandeja.'],
  [/user already registered|already been registered/i, 'Ese email ya tiene cuenta. Entrá desde el login.'],
  [/password should be at least (\d+)/i, 'La contraseña tiene que tener al menos $1 caracteres.'],
  [/should be different from the old password/i, 'La contraseña nueva tiene que ser distinta de la anterior.'],
  [/rate limit|too many requests/i, 'Demasiados intentos seguidos. Esperá un minuto.'],
  [/unable to validate email|invalid email/i, 'Ese email no es válido.'],
  [/token has expired|invalid or has expired|otp_expired/i, 'El link venció. Pedí uno nuevo.'],
  [/signups not allowed|signup is disabled/i, 'El registro está cerrado en este proyecto.'],
  [/failed to fetch|network/i, 'No hay conexión con el servidor.'],
]

export function authMessage(err: unknown, fallback = 'Algo falló. Probá de nuevo.'): string {
  const raw = err instanceof Error ? err.message : typeof err === 'string' ? err : ''
  if (!raw) return fallback
  for (const [re, msg] of MAP) {
    const m = raw.match(re)
    if (m) return msg.replace('$1', m[1] ?? '')
  }
  return raw
}
