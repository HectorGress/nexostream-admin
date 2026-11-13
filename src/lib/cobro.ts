import { PAGO } from '@/lib/config'
import { diasHasta } from '@/lib/extras'
import { formatearFecha } from '@/lib/cuentas'

// Mensaje de cobro listo para WhatsApp
export function mensajeCobro(c: any): string {
  const d = diasHasta(c.fecha_vencimiento)
  const cuando =
    d < 0 ? `venció hace ${-d} día(s)` : d === 0 ? 'vence hoy' : d === 1 ? 'vence mañana' : `vence el ${formatearFecha(c.fecha_vencimiento)}`
  const nombre = String(c.nombre_completo || '').trim().split(' ')[0]
  return (
    `Hola${nombre ? ' ' + nombre : ''}, tu ${c.servicio || 'cuenta'} ${cuando}. ` +
    `Para renovar: ${PAGO.banco} · CLABE ${PAGO.clabe} (${PAGO.titular}). ` +
    `Cuando pagues, sube tu comprobante desde tu panel o mándamelo por aquí. ¡Gracias!`
  )
}

// Si el cliente tiene WhatsApp guardado abre su chat; si no, deja elegir el contacto
export function enlaceCobro(c: any): string {
  const tel = String(c.telefono || '').replace(/\D/g, '')
  const numero = tel.length === 10 ? '52' + tel : tel
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensajeCobro(c))}`
}
