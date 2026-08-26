import { compressImage } from '~/utils/image'
import { PHOTO_BUCKET, MEAL_COLUMNS } from '#shared/types/database'
import type { Database, Meal, MealCategory } from '#shared/types/database'

export interface MealPayload {
  category: MealCategory
  description: string
  note: string | null
  eaten_at: string
  /** Foto nueva elegida en el formulario (todavia sin subir). */
  photoFile: File | null
  /** El usuario borro la foto que ya tenia. */
  removePhoto: boolean
}

/**
 * Todo el acceso a datos de comidas.
 *
 * En ningun metodo se manda `user_id`: la columna tiene `default auth.uid()` y las
 * policies de RLS filtran por el uid del JWT. El cliente ni siquiera tiene la
 * oportunidad de mentir.
 */
export function useMeals() {
  const supabase = useSupabaseClient<Database>()
  const user = useSupabaseUser()

  async function list(limit = 400): Promise<Meal[]> {
    const { data, error } = await supabase
      .from('meals')
      .select(MEAL_COLUMNS)
      .order('eaten_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return (data ?? []) as Meal[]
  }

  async function get(id: string): Promise<Meal | null> {
    const { data, error } = await supabase
      .from('meals')
      .select(MEAL_COLUMNS)
      .eq('id', id)
      .maybeSingle()
    if (error) throw error
    return (data as Meal | null) ?? null
  }

  async function create(payload: MealPayload): Promise<string> {
    const photo_path = payload.photoFile ? await uploadPhoto(payload.photoFile) : null
    try {
      const { data, error } = await supabase
        .from('meals')
        .insert({
          category: payload.category,
          description: payload.description.trim(),
          note: emptyToNull(payload.note),
          photo_path,
          eaten_at: payload.eaten_at,
        })
        .select('id')
        .single()
      if (error) throw error
      return data!.id as string
    } catch (err) {
      // Si la fila no entro, no dejamos la foto colgada en Storage.
      if (photo_path) await removePhoto(photo_path)
      throw err
    }
  }

  async function update(id: string, current: Meal, payload: MealPayload): Promise<void> {
    let photo_path = current.photo_path
    let toDelete: string | null = null

    if (payload.photoFile) {
      photo_path = await uploadPhoto(payload.photoFile)
      toDelete = current.photo_path
    } else if (payload.removePhoto && current.photo_path) {
      photo_path = null
      toDelete = current.photo_path
    }

    const { error } = await supabase
      .from('meals')
      .update({
        category: payload.category,
        description: payload.description.trim(),
        note: emptyToNull(payload.note),
        photo_path,
        eaten_at: payload.eaten_at,
      })
      .eq('id', id)

    if (error) {
      // La foto nueva quedo huerfana: la limpiamos y dejamos la fila como estaba.
      if (payload.photoFile && photo_path) await removePhoto(photo_path)
      throw error
    }

    if (toDelete) await removePhoto(toDelete)
  }

  async function remove(meal: Meal): Promise<void> {
    const { error } = await supabase.from('meals').delete().eq('id', meal.id)
    if (error) throw error
    if (meal.photo_path) await removePhoto(meal.photo_path)
  }

  // --- Storage ---------------------------------------------------------

  async function uploadPhoto(file: File): Promise<string> {
    const uid = user.value?.id
    if (!uid) throw new Error('Se venció la sesión. Volvé a entrar.')

    const photo = await compressImage(file)
    // El primer segmento del path es el uid: es lo que chequea la policy del bucket.
    const path = `${uid}/${crypto.randomUUID()}.jpg`

    const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, photo.blob, {
      contentType: photo.contentType,
      cacheControl: '3600',
      upsert: false,
    })
    if (error) throw error
    return path
  }

  /** Best effort: si falla, queda un archivo huerfano pero no rompemos el flujo. */
  async function removePhoto(path: string): Promise<void> {
    try {
      await supabase.storage.from(PHOTO_BUCKET).remove([path])
    } catch {
      /* noop */
    }
  }

  /**
   * Signed URLs en batch: una sola llamada para todas las miniaturas de la lista.
   * Duran 5 minutos, lo justo para que el <img> las consuma. El bucket es privado,
   * asi que no existe una URL permanente que se pueda filtrar por ahi.
   */
  async function signedUrls(paths: string[], expiresIn = 300): Promise<Map<string, string>> {
    const out = new Map<string, string>()
    const unique = [...new Set(paths.filter(Boolean))]
    if (!unique.length) return out

    const { data, error } = await supabase.storage
      .from(PHOTO_BUCKET)
      .createSignedUrls(unique, expiresIn)
    if (error) return out

    for (const item of data ?? []) {
      if (item.path && item.signedUrl) out.set(item.path, item.signedUrl)
    }
    return out
  }

  async function signedUrl(path: string, expiresIn = 300): Promise<string | null> {
    const map = await signedUrls([path], expiresIn)
    return map.get(path) ?? null
  }

  return { list, get, create, update, remove, signedUrls, signedUrl }
}

function emptyToNull(v: string | null): string | null {
  const t = (v ?? '').trim()
  return t.length ? t : null
}
