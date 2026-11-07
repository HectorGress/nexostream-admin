const aISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// Suma meses de calendario (5 de agosto + 1 mes = 5 de septiembre; 31 de enero + 1 mes = 28/29 de febrero)
export function sumarMesesISO(iso: string, meses: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const f = new Date(y, (m || 1) - 1 + meses, 1)
  const ultimo = new Date(f.getFullYear(), f.getMonth() + 1, 0).getDate()
  f.setDate(Math.min(d || 1, ultimo))
  return aISO(f)
}

export const redondear = (n: number) => Math.round(n * 100) / 100

// Reduce la foto del comprobante para que pese poco (máx. 1400 px, JPEG)
export async function comprimirImagen(file: File, maxLado = 1400, calidad = 0.82): Promise<Blob> {
  const bmp = await createImageBitmap(file)
  const escala = Math.min(1, maxLado / Math.max(bmp.width, bmp.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * escala)
  canvas.height = Math.round(bmp.height * escala)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo procesar la imagen.')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height)
  return await new Promise<Blob>((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('No se pudo procesar la imagen.'))), 'image/jpeg', calidad)
  )
}

export function descargarBlob(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
