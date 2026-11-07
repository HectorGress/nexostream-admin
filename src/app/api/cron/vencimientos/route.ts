import { NextResponse } from 'next/server'
import { sb, configurarWebPush, enviarA } from '@/lib/pushServer'
import { DIAS_AVISO_VENCIMIENTO } from '@/lib/config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const aUTC = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}
const sumar = (iso: string, dias: number) => new Date(aUTC(iso) + dias * 86400000).toISOString().slice(0, 10)
const cuando = (d: number) => (d === 0 ? 'hoy' : d === 1 ? 'mañana' : `en ${d} días`)

// Vercel lo llama una vez al día (ver vercel.json). Avisa a los clientes y a los administradores.
export async function GET(req: Request) {
  try {
    const secreto = process.env.CRON_SECRET
    if (!secreto) return NextResponse.json({ error: 'Falta CRON_SECRET' }, { status: 500 })
    if (req.headers.get('authorization') !== `Bearer ${secreto}`) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    configurarWebPush()
    const supabase = sb()

    const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' })
    const limite = sumar(hoy, Math.max(...DIAS_AVISO_VENCIMIENTO))

    const { data: cuentas, error } = await supabase
      .from('cuentas_clientes')
      .select('id, usuario_id, servicio, fecha_vencimiento')
      .gte('fecha_vencimiento', hoy)
      .lte('fecha_vencimiento', limite)
    if (error) throw new Error(error.message)

    const toca = (cuentas || [])
      .map((c) => ({ ...c, dias: Math.round((aUTC(c.fecha_vencimiento) - aUTC(hoy)) / 86400000) }))
      .filter((c) => DIAS_AVISO_VENCIMIENTO.includes(c.dias))

    // Avisos a cada cliente
    const porUsuario: Record<string, typeof toca> = {}
    toca.forEach((c) => {
      if (c.usuario_id) (porUsuario[c.usuario_id] ||= []).push(c)
    })
    const uids = Object.keys(porUsuario)
    let aClientes = 0
    if (uids.length > 0) {
      const { data: subs } = await supabase.from('push_suscripciones').select('*').in('usuario_id', uids)
      for (const uid of uids) {
        const lista = porUsuario[uid]
        const misSubs = (subs || []).filter((s) => s.usuario_id === uid)
        const cuerpo =
          lista.length === 1
            ? `Tu ${lista[0].servicio || 'cuenta'} vence ${cuando(lista[0].dias)}. Renueva desde tu panel.`
            : `Tienes ${lista.length} cuentas por vencer. Entra a tu panel para renovarlas.`
        const r = await enviarA(misSubs, { title: 'Tu cuenta está por vencer', body: cuerpo, url: '/cliente/dashboard' })
        aClientes += r.enviados
      }
    }

    // Resumen para los administradores
    let aAdmins = 0
    if (toca.length > 0) {
      const { data: subsAdmin } = await supabase.from('push_suscripciones').select('*').eq('rol', 'admin')
      const hoyN = toca.filter((c) => c.dias === 0).length
      const r = await enviarA(subsAdmin || [], {
        title: 'Cuentas por vencer',
        body: `${toca.length} cuenta(s) vencen pronto${hoyN ? ` (${hoyN} hoy)` : ''}.`,
        url: '/admin/dashboard',
      })
      aAdmins = r.enviados
    }

    return NextResponse.json({ ok: true, hoy, cuentas: toca.length, aClientes, aAdmins })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error' }, { status: 500 })
  }
}
