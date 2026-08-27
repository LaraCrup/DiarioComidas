// Tipos de la base. Escritos a mano porque el esquema son dos tablas.
// Si crece, regeneralos con:
//   npx supabase gen types typescript --project-id <ref> > shared/types/database.ts
//
// Ojo: van como `type` y no como `interface` a proposito. supabase-js pide que
// cada Row sea asignable a Record<string, unknown>, y TypeScript solo le da index
// signature implicita a los type alias, no a las interfaces. Con `interface` el
// cliente degrada a `never` y todos los .insert() dejan de tipar.

// ---------------------------------------------------------------------
// Comidas
// ---------------------------------------------------------------------

export type MealCategory = 'desayuno' | 'almuerzo' | 'merienda' | 'cena' | 'snack' | 'postre'

export type MealRow = {
  id: string
  user_id: string
  category: MealCategory
  description: string
  note: string | null
  photo_path: string | null
  eaten_at: string
  created_at: string
  updated_at: string
}

// Lo que la app manda al crear: sin user_id (lo pone `default auth.uid()` en la
// base) y sin id/created_at/updated_at.
export type MealInsert = {
  category: MealCategory
  description: string
  note?: string | null
  photo_path?: string | null
  eaten_at?: string
}

export type MealUpdate = {
  category?: MealCategory
  description?: string
  note?: string | null
  photo_path?: string | null
  eaten_at?: string
}

// ---------------------------------------------------------------------
// Entrenamientos
// ---------------------------------------------------------------------

export type WorkoutKind = 'gimnasio' | 'correr' | 'kinesiologia'

export type WorkoutRow = {
  id: string
  user_id: string
  kind: WorkoutKind
  note: string | null
  done_at: string
  created_at: string
  updated_at: string
}

export type WorkoutInsert = {
  kind: WorkoutKind
  note?: string | null
  done_at?: string
}

export type WorkoutUpdate = {
  kind?: WorkoutKind
  note?: string | null
  done_at?: string
}

// ---------------------------------------------------------------------

export type Database = {
  public: {
    Tables: {
      meals: {
        Row: MealRow
        Insert: MealInsert
        Update: MealUpdate
        Relationships: []
      }
      workouts: {
        Row: WorkoutRow
        Insert: WorkoutInsert
        Update: WorkoutUpdate
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      meal_category: MealCategory
      workout_kind: WorkoutKind
    }
    CompositeTypes: Record<string, never>
  }
}

/** Lo que realmente pinta la UI y el PDF. */
export type Meal = Pick<
  MealRow,
  'id' | 'category' | 'description' | 'note' | 'photo_path' | 'eaten_at'
>

export type Workout = Pick<WorkoutRow, 'id' | 'kind' | 'note' | 'done_at'>

export const MEAL_COLUMNS = 'id, category, description, note, photo_path, eaten_at' as const
export const WORKOUT_COLUMNS = 'id, kind, note, done_at' as const

export const PHOTO_BUCKET = 'meal-photos'
