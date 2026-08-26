/**
 * Nombre y apellido de la persona.
 *
 * Viven en el `user_metadata` de Supabase Auth y no en una tabla aparte: se
 * escriben una sola vez en el alta, viajan en el JWT y quedan igual de a mano
 * en el browser (`useSupabaseUser()`) y en el servidor del PDF
 * (`serverSupabaseUser()`), sin una consulta extra ni una tabla mas con su
 * propio RLS.
 *
 * Es un dato de presentacion, no de autorizacion: nada depende de el. El
 * aislamiento entre usuarios sigue colgando de `auth.uid()` y de las policies.
 * Por eso tampoco importa que la propia persona pueda cambiarselo.
 */

/** Tope por campo. Entra cualquier nombre real y corta un pegado accidental. */
export const NAME_MAX = 60

/** Lo minimo que necesitamos de un usuario: sirve para el `User` de supabase-js. */
export type UserLike =
  | { email?: string | null; user_metadata?: Record<string, unknown> | null }
  | null
  | undefined

/** Saca espacios de sobra (incluido el doble espacio al tipear) y recorta. */
export function normalizeName(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim().replace(/\s+/g, ' ').slice(0, NAME_MAX)
}

export function firstName(user: UserLike): string {
  return normalizeName(user?.user_metadata?.first_name)
}

export function lastName(user: UserLike): string {
  return normalizeName(user?.user_metadata?.last_name)
}

/** "Nombre Apellido", o '' si la cuenta es vieja y no los tiene cargados. */
export function fullName(user: UserLike): string {
  return [firstName(user), lastName(user)].filter(Boolean).join(' ')
}

/**
 * Como se nombra a la persona en pantalla y en el PDF.
 * Las cuentas creadas antes de que el alta pidiera nombre caen al email.
 */
export function displayName(user: UserLike, fallback = ''): string {
  return fullName(user) || normalizeName(user?.email) || fallback
}

/** El `options.data` del signUp. `full_name` es la clave que leen las integraciones. */
export function nameMetadata(first: string, last: string) {
  const first_name = normalizeName(first)
  const last_name = normalizeName(last)
  return { first_name, last_name, full_name: [first_name, last_name].filter(Boolean).join(' ') }
}
