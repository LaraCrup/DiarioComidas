import type { WorkoutKind } from '../types/database'

export const WORKOUT_KINDS: readonly WorkoutKind[] = ['gimnasio', 'correr', 'kinesiologia'] as const

export const WORKOUT_LABEL: Record<WorkoutKind, string> = {
  gimnasio: 'Gimnasio',
  correr: 'Correr',
  kinesiologia: 'Kinesiología',
}
