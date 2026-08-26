import { displayName, firstName, fullName } from '#shared/utils/profile'

/**
 * Nombre y apellido de la sesion actual, reactivos.
 *
 * No consulta nada: sale del `user_metadata` que ya trae la sesion, asi que no
 * agrega un request por pantalla.
 */
export function useProfile() {
  const user = useSupabaseUser()

  return {
    /** Para saludar: "Hola, Lara". */
    firstName: computed(() => firstName(user.value)),
    /** "Nombre Apellido", o '' en cuentas viejas sin el dato. */
    fullName: computed(() => fullName(user.value)),
    /** Lo que se muestra: el nombre completo y, si no hay, el email. */
    displayName: computed(() => displayName(user.value)),
  }
}
