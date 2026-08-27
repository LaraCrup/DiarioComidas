import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server'
import { buildDiaryPdf, type PdfEntry } from '../utils/pdf'
import { pool } from '../utils/pool'
import { MEAL_COLUMNS, PHOTO_BUCKET, WORKOUT_COLUMNS } from '#shared/types/database'
import type { Database, Meal, Workout } from '#shared/types/database'
import { dayKey } from '#shared/utils/dates'
import { displayName } from '#shared/utils/profile'

const MAX_ROWS = 500
const MAX_SPAN_DAYS = 400
const DOWNLOAD_CONCURRENCY = 6

/**
 * Genera el PDF del lado del servidor.
 *
 * Por que aca y no en el browser: con 60 fotos, armar el PDF en el cliente
 * significa tener 60 imagenes decodificadas en memoria en un celular. Aca las
 * fotos van directo de Storage al PDF como bytes, sin decodificar.
 *
 * El aislamiento no depende de nada que mande el cliente:
 *  - `serverSupabaseUser` saca el usuario de la cookie de sesion.
 *  - `serverSupabaseClient` habla con PostgREST con el JWT de ESE usuario, asi
 *    que la query pasa por RLS igual que desde el browser.
 *  - las fotos se bajan con el mismo cliente, o sea que pasan por las policies
 *    del bucket.
 * El unico input del cliente son las fechas y la zona horaria.
 */
export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event).catch(() => null)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'No autenticado' })
  }

  const query = getQuery(event)
  const from = parseInstant(query.from, 'from')
  const to = parseInstant(query.to, 'to')
  const timeZone = safeTimeZone(String(query.tz ?? 'UTC'))

  if (to < from) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Rango invalido',
      data: { message: 'La fecha de fin es anterior a la de inicio.' },
    })
  }
  if ((to - from) / 86_400_000 > MAX_SPAN_DAYS) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Rango demasiado largo',
      data: { message: `El rango no puede superar los ${MAX_SPAN_DAYS} días.` },
    })
  }

  const client = await serverSupabaseClient<Database>(event)

  // Las dos consultas llevan `.eq('user_id', user.id)` redundante con RLS a
  // proposito: user.id sale de la sesion del servidor, nunca del request. Si
  // alguna vez alguien afloja una policy, esto aguanta.
  const [mealsRes, workoutsRes] = await Promise.all([
    client
      .from('meals')
      .select(MEAL_COLUMNS)
      .eq('user_id', user.id)
      .gte('eaten_at', new Date(from).toISOString())
      .lte('eaten_at', new Date(to).toISOString())
      .order('eaten_at', { ascending: true })
      .limit(MAX_ROWS),
    client
      .from('workouts')
      .select(WORKOUT_COLUMNS)
      .eq('user_id', user.id)
      .gte('done_at', new Date(from).toISOString())
      .lte('done_at', new Date(to).toISOString())
      .order('done_at', { ascending: true })
      .limit(MAX_ROWS),
  ])

  const failed = mealsRes.error ?? workoutsRes.error
  if (failed) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Error consultando los registros',
      data: { message: failed.message },
    })
  }

  const rows = (mealsRes.data ?? []) as Meal[]
  const workoutRows = (workoutsRes.data ?? []) as Workout[]

  if (!rows.length && !workoutRows.length) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Sin registros',
      data: { message: 'No hay registros cargados en ese rango.' },
    })
  }

  // Fotos: en paralelo pero acotado.
  const photos = new Map<string, Uint8Array>()
  const withPhoto = rows.filter((row) => row.photo_path)
  await pool(withPhoto, DOWNLOAD_CONCURRENCY, async (row) => {
    const { data: blob, error: downloadError } = await client.storage
      .from(PHOTO_BUCKET)
      .download(row.photo_path!)
    if (downloadError || !blob) return // una foto que falla no rompe el export
    photos.set(row.id, new Uint8Array(await blob.arrayBuffer()))
  })

  const entries: PdfEntry[] = [
    ...rows.map(
      (row): PdfEntry => ({
        kind: 'meal',
        id: row.id,
        category: row.category,
        description: row.description,
        note: row.note,
        at: row.eaten_at,
        photo: photos.get(row.id) ?? null,
      }),
    ),
    ...workoutRows.map(
      (row): PdfEntry => ({
        kind: 'workout',
        id: row.id,
        workoutKind: row.kind,
        note: row.note,
        at: row.done_at,
      }),
    ),
  ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())

  const fromKey = dayKey(new Date(from), timeZone)
  const toKey = dayKey(new Date(to), timeZone)

  const pdf = await buildDiaryPdf({
    entries,
    timeZone,
    fromKey,
    toKey,
    // El PDF se manda al medico o se imprime: va a nombre de la persona, no
    // de su email. Las cuentas viejas, sin nombre cargado, caen al email.
    ownerLabel: displayName(user, 'Mi diario'),
  })

  setHeader(event, 'content-type', 'application/pdf')
  setHeader(
    event,
    'content-disposition',
    `attachment; filename="diario-comidas-${fromKey}-a-${toKey}.pdf"`,
  )
  setHeader(event, 'content-length', pdf.byteLength)
  setHeader(event, 'cache-control', 'no-store, private')
  return Buffer.from(pdf)
})

function parseInstant(value: unknown, field: string): number {
  const ms = Date.parse(String(value ?? ''))
  if (!Number.isFinite(ms)) {
    throw createError({
      statusCode: 400,
      statusMessage: `Parametro ${field} invalido`,
      data: { message: 'Las fechas del rango no son válidas.' },
    })
  }
  return ms
}

/** Una tz invalida haria explotar Intl. Si no la reconoce, UTC. */
function safeTimeZone(tz: string): string {
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone: tz })
    return tz
  } catch {
    return 'UTC'
  }
}
