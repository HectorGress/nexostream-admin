// Reporte de cuentas vencidas y por vencer (PDF o imagen), sin librerías externas.
// Muestra: perfil, correo, fecha de adquisición y fecha de vencimiento.

import { armarPDF } from '@/lib/pdfMini'
import { descargarBlob } from '@/lib/utilidades'
import { NEGOCIO_NOMBRE } from '@/lib/config'

export type FilaReporte = {
  perfil: string
  correo: string
  adquisicion: string
  vencimiento: string
  detalle?: string
}
export type SeccionReporte = { titulo: string; tono: 'danger' | 'warning'; filas: FilaReporte[] }

const ANCHO = 1240
const ALTO_A4 = 1754
const M = 60
const H_TITULO = 170
const H_SEC = 78
const H_CAB = 48
const H_FILA = 50
const H_PIE = 70
const H_VACIO = 60

const COLS = [
  { clave: 'perfil', titulo: 'PERFIL', w: 150 },
  { clave: 'correo', titulo: 'CORREO', w: 400 },
  { clave: 'adquisicion', titulo: 'ADQUISICIÓN', w: 170 },
  { clave: 'vencimiento', titulo: 'VENCIMIENTO', w: 170 },
  { clave: 'detalle', titulo: 'ESTADO', w: 230 },
] as const

const TONOS = {
  danger: { fondo: '#ffe4e6', texto: '#be123c' },
  warning: { fondo: '#fef3c7', texto: '#b45309' },
}

type Item =
  | { t: 'titulo'; y: number }
  | { t: 'seccion'; y: number; sec: SeccionReporte; cont: boolean }
  | { t: 'cabecera'; y: number }
  | { t: 'fila'; y: number; fila: FilaReporte; i: number; tono: 'danger' | 'warning' }
  | { t: 'vacio'; y: number }
type Pagina = { items: Item[]; alto: number }

// Reparte las filas en páginas (con alto infinito sale una sola página larga)
export function distribuir(secciones: SeccionReporte[], altoPagina: number): Pagina[] {
  const limite = altoPagina - M - H_PIE
  const paginas: Pagina[] = []
  let pag: Pagina = { items: [], alto: 0 }
  let y = M

  const cerrar = () => {
    pag.alto = Number.isFinite(altoPagina) ? altoPagina : y + M + H_PIE
    paginas.push(pag)
    pag = { items: [], alto: 0 }
    y = M
  }

  pag.items.push({ t: 'titulo', y })
  y += H_TITULO

  for (const sec of secciones) {
    if (y + H_SEC + H_CAB + H_FILA > limite) cerrar()
    pag.items.push({ t: 'seccion', y, sec, cont: false })
    y += H_SEC
    if (sec.filas.length === 0) {
      pag.items.push({ t: 'vacio', y })
      y += H_VACIO + 30
      continue
    }
    pag.items.push({ t: 'cabecera', y })
    y += H_CAB
    sec.filas.forEach((fila, i) => {
      if (y + H_FILA > limite) {
        cerrar()
        pag.items.push({ t: 'seccion', y, sec, cont: true })
        y += H_SEC
        pag.items.push({ t: 'cabecera', y })
        y += H_CAB
      }
      pag.items.push({ t: 'fila', y, fila, i, tono: sec.tono })
      y += H_FILA
    })
    y += 40
  }
  cerrar()
  return paginas
}

function ajustar(ctx: CanvasRenderingContext2D, texto: string, max: number) {
  if (ctx.measureText(texto).width <= max) return texto
  let t = texto
  while (t.length > 1 && ctx.measureText(t + '…').width > max) t = t.slice(0, -1)
  return t + '…'
}

function pintar(pag: Pagina, alto: number, nPag: number, totalPag: number, fechaTxt: string, totalFilas: number) {
  const canvas = document.createElement('canvas')
  canvas.width = ANCHO
  canvas.height = alto
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo crear el reporte.')
  const fuente = 'Arial, Helvetica, sans-serif'

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, ANCHO, alto)
  ctx.textBaseline = 'middle'

  for (const it of pag.items) {
    if (it.t === 'titulo') {
      ctx.fillStyle = '#4f46e5'
      ctx.fillRect(M, it.y, 10, 92)
      ctx.fillStyle = '#0f172a'
      ctx.font = `bold 46px ${fuente}`
      ctx.fillText('Reporte de vencimientos', M + 28, it.y + 30)
      ctx.fillStyle = '#64748b'
      ctx.font = `24px ${fuente}`
      ctx.fillText(`Generado el ${fechaTxt}  ·  ${totalFilas} cuenta${totalFilas === 1 ? '' : 's'}`, M + 28, it.y + 76)
      ctx.fillStyle = '#e2e8f0'
      ctx.fillRect(M, it.y + 118, ANCHO - M * 2, 2)
    } else if (it.t === 'seccion') {
      const tono = TONOS[it.sec.tono]
      const texto = `${it.sec.titulo} (${it.sec.filas.length})${it.cont ? ' · continuación' : ''}`
      ctx.font = `bold 28px ${fuente}`
      const w = ctx.measureText(texto).width + 48
      ctx.fillStyle = tono.fondo
      ctx.beginPath()
      ctx.roundRect(M, it.y + 8, w, 52, 26)
      ctx.fill()
      ctx.fillStyle = tono.texto
      ctx.fillText(texto, M + 24, it.y + 35)
    } else if (it.t === 'cabecera') {
      ctx.fillStyle = '#f1f5f9'
      ctx.fillRect(M, it.y, ANCHO - M * 2, H_CAB - 4)
      ctx.fillStyle = '#475569'
      ctx.font = `bold 20px ${fuente}`
      let x = M
      for (const c of COLS) {
        ctx.fillText(c.titulo, x + 14, it.y + H_CAB / 2 - 2)
        x += c.w
      }
    } else if (it.t === 'fila') {
      if (it.i % 2 === 1) {
        ctx.fillStyle = '#f8fafc'
        ctx.fillRect(M, it.y, ANCHO - M * 2, H_FILA)
      }
      ctx.fillStyle = '#e2e8f0'
      ctx.fillRect(M, it.y + H_FILA - 1, ANCHO - M * 2, 1)
      let x = M
      for (const c of COLS) {
        const valor = (it.fila[c.clave] as string | undefined) || '—'
        ctx.font = `${c.clave === 'perfil' ? 'bold ' : ''}23px ${fuente}`
        ctx.fillStyle = c.clave === 'detalle' ? TONOS[it.tono].texto : '#0f172a'
        ctx.fillText(ajustar(ctx, valor, c.w - 28), x + 14, it.y + H_FILA / 2)
        x += c.w
      }
    } else if (it.t === 'vacio') {
      ctx.fillStyle = '#94a3b8'
      ctx.font = `italic 24px ${fuente}`
      ctx.fillText('No hay cuentas en esta categoría.', M + 14, it.y + H_VACIO / 2)
    }
  }

  ctx.fillStyle = '#94a3b8'
  ctx.font = `20px ${fuente}`
  ctx.textAlign = 'left'
  ctx.fillText(NEGOCIO_NOMBRE, M, alto - M)
  ctx.textAlign = 'right'
  ctx.fillText(`Página ${nPag} de ${totalPag}`, ANCHO - M, alto - M)
  ctx.textAlign = 'left'
  return canvas
}

export async function descargarReporte(secciones: SeccionReporte[], formato: 'pdf' | 'png') {
  const totalFilas = secciones.reduce((t, s) => t + s.filas.length, 0)
  if (totalFilas === 0) throw new Error('No hay cuentas para el reporte.')

  const ahora = new Date()
  const fechaTxt = ahora.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })
  const iso = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`
  const nombre = `reporte-vencimientos-${iso}`

  if (formato === 'png') {
    const [pag] = distribuir(secciones, Infinity)
    const alto = Math.ceil(pag.alto)
    if (alto > 15000) throw new Error('Hay demasiadas cuentas para una sola imagen. Descarga el PDF.')
    const canvas = pintar(pag, alto, 1, 1, fechaTxt, totalFilas)
    const blob = await new Promise<Blob>((res, rej) =>
      canvas.toBlob((b) => (b ? res(b) : rej(new Error('No se pudo crear la imagen.'))), 'image/png')
    )
    descargarBlob(blob, `${nombre}.png`)
    return
  }

  const paginas = distribuir(secciones, ALTO_A4)
  const jpegs = paginas.map((p, i) => {
    const canvas = pintar(p, ALTO_A4, i + 1, paginas.length, fechaTxt, totalFilas)
    const bin = atob(canvas.toDataURL('image/jpeg', 0.92).split(',')[1])
    const bytes = new Uint8Array(bin.length)
    for (let k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k)
    return { jpeg: bytes, w: ANCHO, h: ALTO_A4 }
  })
  descargarBlob(armarPDF(jpegs), `${nombre}.pdf`)
}
