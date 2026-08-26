/**
 * Todo lo de fechas pasa por aca.
 *
 * Ojo con esto: eaten_at es timestamptz, o sea un instante absoluto. Si agrupamos
 * por dia en SQL (`date(eaten_at)`) Postgres agrupa en UTC y una cena de las 22:00
 * en Argentina (UTC-3) cae al dia siguiente. Por eso el dia se calcula siempre en
 * la zona horaria del usuario: en el browser con la local, en el servidor con la
 * `tz` que el browser manda en el request del PDF.
 */

/** 'YYYY-MM-DD' del instante, en la zona indicada (default: la del dispositivo). */
export function dayKey(iso: string | Date, timeZone?: string): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  // en-CA formatea justo como YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

/** 'HH:mm' 24hs. */
export function timeLabel(iso: string | Date, timeZone?: string): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  return new Intl.DateTimeFormat('es-AR', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d)
}

/** 'martes 26 de agosto' (+ ' de 2025' si no es el año en curso). */
export function longDayLabel(key: string, timeZone?: string): string {
  // key es 'YYYY-MM-DD'; lo leemos a mediodia UTC para que ningun offset lo corra de dia
  const d = new Date(`${key}T12:00:00Z`)
  const thisYear = new Date().getUTCFullYear()
  const sameYear = d.getUTCFullYear() === thisYear
  const s = new Intl.DateTimeFormat('es-AR', {
    timeZone: timeZone ?? 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    ...(sameYear ? {} : { year: 'numeric' }),
  }).format(d)
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** '12 de agosto de 2026'. Para el rango del encabezado del PDF, sin dia de la semana. */
export function monthDayLabel(key: string, withYear = true): string {
  const d = new Date(`${key}T12:00:00Z`)
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'long',
    ...(withYear ? { year: 'numeric' } : {}),
  }).format(d)
}

/** 'Hoy' / 'Ayer' / dia largo. `today` se pasa para poder testear. */
export function friendlyDayLabel(key: string, today: string = dayKey(new Date())): string {
  if (key === today) return 'Hoy'
  const y = new Date(`${today}T12:00:00Z`)
  y.setUTCDate(y.getUTCDate() - 1)
  if (key === y.toISOString().slice(0, 10)) return 'Ayer'
  return longDayLabel(key)
}

/** ISO -> 'YYYY-MM-DDTHH:mm' para un <input type="datetime-local"> (hora local). */
export function toDatetimeLocal(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 'YYYY-MM-DDTHH:mm' (hora local) -> ISO UTC. */
export function fromDatetimeLocal(value: string): string {
  // new Date('2026-08-26T14:30') se interpreta como hora local. Eso es lo que queremos.
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) throw new Error('Fecha invalida')
  return d.toISOString()
}

/** 'YYYY-MM-DD' del dia local de hoy, con un corrimiento opcional de dias. */
export function todayKey(offsetDays = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return dayKey(d)
}

/** Inicio del dia local de 'YYYY-MM-DD', en ISO UTC. */
export function startOfLocalDay(key: string): string {
  return new Date(`${key}T00:00:00`).toISOString()
}

/** Fin del dia local de 'YYYY-MM-DD' (23:59:59.999), en ISO UTC. */
export function endOfLocalDay(key: string): string {
  return new Date(`${key}T23:59:59.999`).toISOString()
}

/** Zona horaria del dispositivo, ej. 'America/Argentina/Buenos_Aires'. */
export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}
