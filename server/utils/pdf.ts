import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type { PDFFont, PDFImage, PDFPage } from 'pdf-lib'
import { CATEGORY_LABEL } from '#shared/utils/categories'
import { WORKOUT_LABEL } from '#shared/utils/workouts'
import { dayKey, longDayLabel, monthDayLabel, timeLabel } from '#shared/utils/dates'
import type { MealCategory, WorkoutKind } from '#shared/types/database'

export interface PdfMeal {
  kind: 'meal'
  id: string
  category: MealCategory
  description: string
  note: string | null
  /** Momento del registro. Se llama igual en los dos para poder ordenarlos juntos. */
  at: string
  /** Bytes de la foto ya bajados de Storage. */
  photo: Uint8Array | null
}

export interface PdfWorkout {
  kind: 'workout'
  id: string
  workoutKind: WorkoutKind
  note: string | null
  at: string
}

export type PdfEntry = PdfMeal | PdfWorkout

export interface PdfOptions {
  /** Comidas y entrenamientos ya mezclados y ordenados por fecha ascendente. */
  entries: PdfEntry[]
  /** Zona horaria del usuario: sin esto el servidor agruparia los dias en UTC. */
  timeZone: string
  fromKey: string
  toKey: string
  ownerLabel: string
}

// A4 en puntos
const PAGE_W = 595.28
const PAGE_H = 841.89
const MARGIN = 42
const CONTENT_W = PAGE_W - MARGIN * 2
const FOOTER_H = 26
const FLOOR = MARGIN + FOOTER_H

const PHOTO_W = 128
const PHOTO_MAX_H = 124
const PHOTO_GAP = 14
const TEXT_W_WITH_PHOTO = CONTENT_W - PHOTO_W - PHOTO_GAP

const SIZE_TIME = 9.5
const SIZE_DESC = 10.5
const SIZE_NOTE = 9.5
const LH_DESC = 13.5
const LH_NOTE = 12
const DAY_HEADER_H = 30
const MEAL_GAP = 15

const INK = rgb(0.06, 0.09, 0.16)
const MUTED = rgb(0.42, 0.45, 0.5)
const RULE = rgb(0.83, 0.85, 0.88)

interface Block {
  entry: PdfEntry
  header: string
  descLines: string[]
  noteLines: string[]
  missingPhoto: boolean
  image: PDFImage | null
  imgW: number
  imgH: number
  height: number
}

export async function buildDiaryPdf(opts: PdfOptions): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.setTitle('Diario de comidas')
  doc.setSubject(`Registros del ${opts.fromKey} al ${opts.toKey}`)
  doc.setCreator('Diario de comidas')
  doc.setProducer('Diario de comidas')

  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique)

  // Las imagenes se embeben una sola vez, antes de paginar.
  const images = new Map<string, PDFImage>()
  for (const entry of opts.entries) {
    if (entry.kind !== 'meal' || !entry.photo) continue
    const image = await embedImage(doc, entry.photo)
    if (image) images.set(entry.id, image)
  }

  const pages: PDFPage[] = []
  let page!: PDFPage
  let y = 0

  function newPage() {
    page = doc.addPage([PAGE_W, PAGE_H])
    pages.push(page)
    y = PAGE_H - MARGIN
  }

  /** Mide un registro sin dibujarlo, para poder decidir el salto de pagina antes. */
  function measure(entry: PdfEntry): Block {
    const image = entry.kind === 'meal' ? (images.get(entry.id) ?? null) : null
    const missingPhoto = entry.kind === 'meal' && Boolean(entry.photo) && !image
    const textW = image ? TEXT_W_WITH_PHOTO : CONTENT_W

    const time = timeLabel(entry.at, opts.timeZone)
    // El entrenamiento se marca en el encabezado del bloque: en una hoja en
    // blanco y negro es lo unico que lo distingue de una comida.
    const label =
      entry.kind === 'meal'
        ? CATEGORY_LABEL[entry.category]
        : `ENTRENAMIENTO - ${WORKOUT_LABEL[entry.workoutKind]}`

    const header = clean(`${time}   ${label}`)
    // Un entrenamiento no tiene cuerpo: el encabezado ya dice todo lo que hay.
    const descLines =
      entry.kind === 'meal' ? wrap(clean(entry.description), font, SIZE_DESC, textW) : []
    const noteLines = entry.note ? wrap(`Nota: ${clean(entry.note)}`, italic, SIZE_NOTE, textW) : []

    let textH = 10 + descLines.length * LH_DESC
    if (noteLines.length) textH += 4 + noteLines.length * LH_NOTE
    if (missingPhoto) textH += 4 + LH_NOTE
    textH += 3

    let imgW = 0
    let imgH = 0
    if (image) {
      const scale = Math.min(PHOTO_W / image.width, PHOTO_MAX_H / image.height)
      imgW = image.width * scale
      imgH = image.height * scale
    }

    return {
      entry,
      header,
      descLines,
      noteLines,
      missingPhoto,
      image,
      imgW,
      imgH,
      height: Math.max(textH, imgH),
    }
  }

  function drawDayHeader(key: string, count: number, continued: boolean) {
    const label = clean(longDayLabel(key, opts.timeZone)) + (continued ? ' (continúa)' : '')
    page.drawText(label, { x: MARGIN, y: y - 12, size: 12.5, font: bold, color: INK })

    if (!continued) {
      const right = `${count} ${count === 1 ? 'registro' : 'registros'}`
      page.drawText(right, {
        x: PAGE_W - MARGIN - font.widthOfTextAtSize(right, 9),
        y: y - 11,
        size: 9,
        font,
        color: MUTED,
      })
    }

    page.drawLine({
      start: { x: MARGIN, y: y - 19 },
      end: { x: PAGE_W - MARGIN, y: y - 19 },
      thickness: 0.9,
      color: RULE,
    })
    y -= DAY_HEADER_H
  }

  function drawBlock(block: Block) {
    const top = y
    let baseline = top - 10

    page.drawText(block.header, {
      x: MARGIN,
      y: baseline,
      size: SIZE_TIME,
      font: bold,
      color: MUTED,
    })

    for (const line of block.descLines) {
      baseline -= LH_DESC
      page.drawText(line, { x: MARGIN, y: baseline, size: SIZE_DESC, font, color: INK })
    }

    if (block.noteLines.length) {
      baseline -= 4
      for (const line of block.noteLines) {
        baseline -= LH_NOTE
        page.drawText(line, { x: MARGIN, y: baseline, size: SIZE_NOTE, font: italic, color: MUTED })
      }
    }

    if (block.missingPhoto) {
      baseline -= 4 + LH_NOTE
      page.drawText('[la foto no se pudo incluir]', {
        x: MARGIN,
        y: baseline,
        size: SIZE_NOTE,
        font: italic,
        color: MUTED,
      })
    }

    if (block.image) {
      page.drawImage(block.image, {
        x: PAGE_W - MARGIN - block.imgW,
        y: top - block.imgH,
        width: block.imgW,
        height: block.imgH,
      })
    }

    y = top - block.height - MEAL_GAP
  }

  // --- Encabezado del documento ---------------------------------------
  newPage()
  page.drawText('Diario de comidas', { x: MARGIN, y: y - 18, size: 18, font: bold, color: INK })
  y -= 26

  const sameYear = opts.fromKey.slice(0, 4) === opts.toKey.slice(0, 4)
  const rangeLabel =
    opts.fromKey === opts.toKey
      ? monthDayLabel(opts.fromKey)
      : `${monthDayLabel(opts.fromKey, !sameYear)} a ${monthDayLabel(opts.toKey)}`
  const subtitle = clean(
    `${opts.ownerLabel}   ·   ${rangeLabel}   ·   ${opts.entries.length} ${
      opts.entries.length === 1 ? 'registro' : 'registros'
    }`,
  )
  page.drawText(subtitle, { x: MARGIN, y: y - 10, size: 9.5, font, color: MUTED })
  y -= 24

  // --- Dias -------------------------------------------------------------
  for (const [key, items] of groupByDay(opts.entries, opts.timeZone)) {
    const blocks = items.map(measure)

    // Un titulo de dia no puede quedar solo al pie: reservamos el alto real
    // del primer registro del dia antes de escribirlo.
    if (y - (DAY_HEADER_H + blocks[0]!.height) < FLOOR) newPage()
    drawDayHeader(key, items.length, false)

    for (const block of blocks) {
      if (y - block.height < FLOOR) {
        // El dia sigue en la pagina que viene: repetimos el titulo para que una
        // hoja suelta se entienda sola.
        newPage()
        drawDayHeader(key, items.length, true)
      }
      drawBlock(block)

      // Separador fino entre registros del mismo dia
      if (block !== blocks[blocks.length - 1] && y + MEAL_GAP / 2 > FLOOR) {
        page.drawLine({
          start: { x: MARGIN, y: y + MEAL_GAP / 2 },
          end: { x: PAGE_W - MARGIN, y: y + MEAL_GAP / 2 },
          thickness: 0.5,
          color: RULE,
        })
      }
    }

    y -= 8
  }

  // --- Pie de pagina ----------------------------------------------------
  const generated = clean(`Generado el ${monthDayLabel(dayKey(new Date(), opts.timeZone))}`)
  pages.forEach((p, i) => {
    p.drawText(generated, { x: MARGIN, y: MARGIN - 12, size: 8, font, color: MUTED })
    const n = `${i + 1} / ${pages.length}`
    p.drawText(n, {
      x: PAGE_W - MARGIN - font.widthOfTextAtSize(n, 8),
      y: MARGIN - 12,
      size: 8,
      font,
      color: MUTED,
    })
  })

  return doc.save()
}

// ----------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------

function groupByDay(entries: PdfEntry[], timeZone: string): Array<[string, PdfEntry[]]> {
  const map = new Map<string, PdfEntry[]>()
  for (const entry of entries) {
    const key = dayKey(entry.at, timeZone)
    const bucket = map.get(key)
    if (bucket) bucket.push(entry)
    else map.set(key, [entry])
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
}

/**
 * Helvetica en pdf-lib usa WinAnsi. Los acentos y la ñ entran sin problema, pero
 * un emoji en una nota hace que drawText tire una excepcion y se caiga el export
 * entero. Sacamos todo lo que no sea codificable.
 */
const REPLACEMENTS: Record<string, string> = {
  '‘': "'",
  '’': "'",
  '‚': "'",
  '‛': "'",
  '“': '"',
  '”': '"',
  '„': '"',
  '–': '-',
  '—': '-',
  '−': '-',
  '…': '...',
  ' ': ' ',
  '•': '-',
  '​': '',
  '­': '',
}

export function clean(input: string): string {
  let out = ''
  for (const ch of input ?? '') {
    const replacement = REPLACEMENTS[ch]
    if (replacement !== undefined) {
      out += replacement
      continue
    }
    const code = ch.codePointAt(0)!
    if (code === 10 || code === 13) {
      out += '\n'
      continue
    }
    if (code === 9) {
      out += ' '
      continue
    }
    if ((code >= 32 && code <= 126) || (code >= 160 && code <= 255)) out += ch
    // el resto (emoji, simbolos raros) se descarta
  }
  return out
}

export function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = []
  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(/\s+/).filter(Boolean)
    if (!words.length) continue
    let line = ''
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        line = candidate
        continue
      }
      if (line) lines.push(line)
      if (font.widthOfTextAtSize(word, size) > maxWidth) {
        // Una sola palabra mas ancha que la caja (una URL, por ejemplo): la partimos.
        let chunk = ''
        for (const ch of word) {
          if (chunk && font.widthOfTextAtSize(chunk + ch, size) > maxWidth) {
            lines.push(chunk)
            chunk = ch
          } else {
            chunk += ch
          }
        }
        line = chunk
      } else {
        line = word
      }
    }
    if (line) lines.push(line)
  }
  return lines.length ? lines : ['']
}

async function embedImage(doc: PDFDocument, bytes: Uint8Array): Promise<PDFImage | null> {
  try {
    if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8) return await doc.embedJpg(bytes)
    if (bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50) return await doc.embedPng(bytes)
  } catch {
    // imagen corrupta o formato que pdf-lib no soporta (webp): seguimos sin ella
  }
  return null
}
