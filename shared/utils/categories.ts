import type { MealCategory } from '../types/database'

export const CATEGORIES: readonly MealCategory[] = [
  'desayuno',
  'almuerzo',
  'merienda',
  'cena',
  'snack',
  'otros',
] as const

export const CATEGORY_LABEL: Record<MealCategory, string> = {
  desayuno: 'Desayuno',
  almuerzo: 'Almuerzo',
  merienda: 'Merienda',
  cena: 'Cena',
  snack: 'Snack',
  otros: 'Otros',
}

export function isCategory(value: unknown): value is MealCategory {
  return typeof value === 'string' && (CATEGORIES as readonly string[]).includes(value)
}

/**
 * Categoria sugerida segun la hora. Es solo un default: la pantalla de alta
 * la muestra ya seleccionada y se cambia con un toque.
 * Franja horaria pensada para Argentina (se cena tarde).
 *
 * `otros` nunca se sugiere: es la salida para lo que no entra en ninguna franja
 * (un picoteo largo, una comida de viaje con horario corrido), y eso lo decide
 * la persona, no el reloj.
 */
export function suggestCategory(date: Date = new Date()): MealCategory {
  const h = date.getHours()
  if (h >= 5 && h < 11) return 'desayuno'
  if (h >= 11 && h < 15) return 'almuerzo'
  if (h >= 15 && h < 19) return 'merienda'
  if (h >= 19 && h < 24) return 'cena'
  return 'snack' // 00:00 - 05:00
}
