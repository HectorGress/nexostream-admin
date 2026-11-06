import { auth } from '@/lib/firebase'
import { createClient } from '@/lib/supabase'

/* ───────── Perfiles por servicio ───────── */

// Perfiles típicos por servicio. Se pueden cambiar en cada cuenta madre.
export function perfilesPorDefecto(servicio?: string | null): number {
  const s = (servicio || '').toLowerCase()
  if (s.includes('netflix')) return 5
  if (s.includes('prime') || s.includes('amazon')) return 6
  if (s.includes('paramount')) return 6
  if (s.includes('disney')) return 7
  if (s.includes('hbo') || s.includes('max')) return 5
  if (s.includes('vix')) return 5
  return 5
}

// PIN aleatorio de 4 dígitos
export function generarPin(digitos = 4): string {
  const arr = new Uint32Array(1)
  crypto.getRandomValues(arr)
  return String(arr[0] % 10 ** digitos).padStart(digitos, '0')
}

// Sugiere el primer nombre de perfil libre: P1, P2, P3...
export function siguientePerfilLibre(usados: string[]): string {
  const set = new Set(usados.map((u) => (u || '').trim().toLowerCase()))
  let i = 1
  while (set.has(`p${i}`)) i++
  return `P${i}`
}

/* ───────── Fechas (sin librerías, sin errores de zona horaria) ───────── */

const aISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const desdeISO = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

export const hoyLocalISO = () => aISO(new Date())

export const sumarDiasISO = (iso: string, dias: number) => {
  const f = desdeISO(iso)
  f.setDate(f.getDate() + dias)
  return aISO(f)
}

// Días que faltan para una fecha (negativo si ya pasó)
export const diasHasta = (iso?: string | null) => {
  if (!iso) return 9999
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  return Math.round((desdeISO(iso).getTime() - hoy.getTime()) / 86400000)
}

export const diasEntre = (desde: string, hasta: string) =>
  Math.round((desdeISO(hasta).getTime() - desdeISO(desde).getTime()) / 86400000)

// Cambia 'MXN' si cobras en otra moneda
export const dinero = (n: number | string | null | undefined) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(n || 0))

/* ───────── Bitácora y pagos ───────── */

const emailAdmin = () => auth.currentUser?.email || 'desconocido'

// accion: crear | editar | borrar | renovar | liberar
// entidad: cliente | cuenta_madre
export async function registrarBitacora(accion: string, entidad: string, detalle: string) {
  try {
    const supabase = createClient()
    const { error } = await supabase
      .from('bitacora')
      .insert([{ admin_email: emailAdmin(), accion, entidad, detalle }])
    if (error) console.error('Bitácora:', error.message)
  } catch (e) {
    console.error('Bitácora:', e)
  }
}

export async function registrarPago(p: {
  clienteId: number | null
  nombre: string
  servicio?: string | null
  monto: number
  dias: number
  nuevoVencimiento?: string | null
  nota?: string
}) {
  const supabase = createClient()
  const { error } = await supabase.from('pagos').insert([
    {
      cliente_id: p.clienteId,
      cliente_nombre: p.nombre || 'Sin nombre',
      servicio: p.servicio || null,
      monto: Number(p.monto) || 0,
      dias: p.dias,
      nuevo_vencimiento: p.nuevoVencimiento || null,
      nota: p.nota || null,
      admin_email: emailAdmin(),
    },
  ])
  return error
}
