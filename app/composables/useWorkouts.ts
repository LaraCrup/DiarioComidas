import { WORKOUT_COLUMNS } from '#shared/types/database'
import type { Database, Workout, WorkoutKind } from '#shared/types/database'

export interface WorkoutPayload {
  kind: WorkoutKind
  note: string | null
  done_at: string
}

/**
 * Acceso a datos de entrenamientos. Mismo criterio que useMeals: en ningun
 * metodo se manda `user_id`, lo pone `default auth.uid()` y lo filtra RLS.
 *
 * Sin Storage: un entrenamiento no tiene foto, asi que es CRUD y nada mas.
 */
export function useWorkouts() {
  const supabase = useSupabaseClient<Database>()

  async function list(limit = 400): Promise<Workout[]> {
    const { data, error } = await supabase
      .from('workouts')
      .select(WORKOUT_COLUMNS)
      .order('done_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return (data ?? []) as Workout[]
  }

  async function get(id: string): Promise<Workout | null> {
    const { data, error } = await supabase
      .from('workouts')
      .select(WORKOUT_COLUMNS)
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return (data as Workout | null) ?? null
  }

  async function create(payload: WorkoutPayload): Promise<string> {
    const { data, error } = await supabase
      .from('workouts')
      .insert({ kind: payload.kind, note: emptyToNull(payload.note), done_at: payload.done_at })
      .select('id')
      .single()
    if (error) throw error
    return data!.id as string
  }

  async function update(id: string, payload: WorkoutPayload): Promise<void> {
    const { error } = await supabase
      .from('workouts')
      .update({ kind: payload.kind, note: emptyToNull(payload.note), done_at: payload.done_at })
      .eq('id', id)
    if (error) throw error
  }

  async function remove(id: string): Promise<void> {
    const { error } = await supabase.from('workouts').delete().eq('id', id)
    if (error) throw error
  }

  return { list, get, create, update, remove }
}

function emptyToNull(v: string | null): string | null {
  const t = (v ?? '').trim()
  return t.length ? t : null
}
