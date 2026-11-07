import { NEGOCIO_NOMBRE } from '@/lib/config'
import { dinero } from '@/lib/extras'
import { formatearFecha } from '@/lib/cuentas'
import { descargarBlob } from '@/lib/utilidades'

// Genera el recibo de un pago como imagen PNG
export async function descargarRecibo(p: any, cliente: { nombre: string; handle?: string | null }) {
  const W = 900
  const H = 1020
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo crear el recibo.')
  const f = 'Arial, Helvetica, sans-serif'

  ctx.fillStyle = '#f1f5f9'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.roundRect(40, 40, W - 80, H - 80, 28)
  ctx.fill()

  ctx.save()
  ctx.beginPath()
  ctx.roundRect(40, 40, W - 80, 170, [28, 28, 0, 0])
  ctx.clip()
  ctx.fillStyle = '#4f46e5'
  ctx.fillRect(40, 40, W - 80, 170)
  ctx.restore()

  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#ffffff'
  ctx.font = `bold 46px ${f}`
  ctx.fillText(NEGOCIO_NOMBRE, 90, 100)
  ctx.font = `26px ${f}`
  ctx.fillText('Recibo de pago', 90, 155)
  ctx.textAlign = 'right'
  ctx.fillText(`Folio N° ${String(p.id).padStart(6, '0')}`, W - 90, 155)
  ctx.textAlign = 'left'

  const monto = Number(p.monto) > 0 ? dinero(p.monto) : 'Cortesía'
  ctx.fillStyle = '#64748b'
  ctx.font = `24px ${f}`
  ctx.fillText('Monto', 90, 270)
  ctx.fillStyle = '#047857'
  ctx.font = `bold 72px ${f}`
  ctx.fillText(monto, 90, 335)

  const fecha = new Date(p.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })
  const filas: [string, string][] = [
    ['Cliente', cliente.nombre || '—'],
    ...(cliente.handle ? ([['ID', `@${cliente.handle}`]] as [string, string][]) : []),
    ['Servicio', p.servicio || '—'],
    ['Fecha de pago', fecha],
    ['Vigente hasta', p.nuevo_vencimiento ? formatearFecha(p.nuevo_vencimiento) : '—'],
    ...(p.nota ? ([['Concepto', String(p.nota)]] as [string, string][]) : []),
  ]
  let y = 430
  for (const [etiqueta, valor] of filas) {
    ctx.fillStyle = '#e2e8f0'
    ctx.fillRect(90, y - 38, W - 180, 2)
    ctx.fillStyle = '#64748b'
    ctx.font = `22px ${f}`
    ctx.fillText(etiqueta, 90, y)
    ctx.fillStyle = '#0f172a'
    ctx.font = `bold 28px ${f}`
    ctx.textAlign = 'right'
    ctx.fillText(valor.length > 34 ? valor.slice(0, 33) + '…' : valor, W - 90, y)
    ctx.textAlign = 'left'
    y += 82
  }

  ctx.fillStyle = '#94a3b8'
  ctx.font = `22px ${f}`
  ctx.textAlign = 'center'
  ctx.fillText('Gracias por tu preferencia', W / 2, H - 110)
  ctx.fillText('Recibo generado desde tu panel de cliente', W / 2, H - 78)

  const blob = await new Promise<Blob>((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('No se pudo crear el recibo.'))), 'image/png')
  )
  descargarBlob(blob, `recibo-${String(p.id).padStart(6, '0')}.png`)
}
