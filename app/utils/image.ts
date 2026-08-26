/**
 * Compresion de fotos en el browser, sin dependencias.
 *
 * Por que a mano y no una libreria: son 40 lineas de canvas. Lo unico no obvio es
 * `imageOrientation: 'from-image'`, que aplica el EXIF de rotacion del iPhone al
 * bitmap; sin eso las fotos verticales se suben acostadas.
 *
 * Una foto de iPhone son 3-5 MB. Esto la deja en ~150-300 KB, que con 4G lento
 * es la diferencia entre subir en 1 segundo o en 20.
 */

export interface CompressedPhoto {
  blob: Blob
  contentType: string
  width: number
  height: number
}

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']

export async function compressImage(
  file: File,
  maxSide = 1280,
  quality = 0.7,
): Promise<CompressedPhoto> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Ese archivo no es una imagen.')
  }

  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('sin contexto 2d')

    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    let blob = await toBlob(canvas, quality)
    // Segunda pasada solo si quedo gorda (fotos con mucho detalle).
    if (blob.size > 1_200_000) blob = await toBlob(canvas, 0.5)

    return { blob, contentType: 'image/jpeg', width, height }
  } catch {
    // Fallback: el canvas no pudo decodificar el formato (algun HEIC raro).
    // Subimos el original si el bucket lo acepta.
    if (!ALLOWED.includes(file.type)) {
      throw new Error(
        'No pudimos procesar esa foto. Saca la foto con la camara desde la app, o pasala a JPG.',
      )
    }
    if (file.size > 8 * 1024 * 1024) {
      throw new Error('La foto pesa mas de 8 MB y no se pudo comprimir.')
    }
    return { blob: file, contentType: file.type, width: 0, height: 0 }
  }
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('El navegador no pudo generar el JPEG.'))),
      'image/jpeg',
      quality,
    )
  })
}
