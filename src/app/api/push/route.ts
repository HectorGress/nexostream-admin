import { NextResponse } from 'next/server'
import { sb, configurarWebPush, enviarA, verificarToken } from '@/lib/pushServer'

export const runtime = 'nodejs'

// Lo que un cliente puede avisarle a los administradores (textos fijos, no se pueden inventar)
const EVENTOS: Record<string, { titulo: string; url: string }> = {
  solicitud: { titulo: 'Nueva solicitud de renovación', url: '/admin/centro' },
  reporte: { titulo: 'Nuevo reporte de soporte', url: '/admin/dashboard' },
  mensaje: { titulo: 'Nuevo mensaje de un cliente', url: '/admin/dashboard' },
}

const rutaSegura = (u: unknown, defecto: string) => {
  const s = String(u || '')
  return s.startsWith('/') && !s.startsWith('//') ? s : defecto
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const usuario = await verificarToken(String(body?.idToken || ''))
    if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    configurarWebPush()
    const supabase = sb()

    // Cliente -> administradores
    if (body.modo === 'admins') {
      const ev = EVENTOS[String(body.evento)]
      if (!ev) return NextResponse.json({ error: 'Evento no válido' }, { status: 400 })
      const { data: subs } = await supabase.from('push_suscripciones').select('*').eq('rol', 'admin')
      const r = await enviarA(subs || [], {
        title: ev.titulo,
        body: String(body.detalle || '').slice(0, 100),
        url: ev.url,
      })
      return NextResponse.json(r)
    }

    // Administrador -> un cliente
    if (body.modo === 'usuario') {
      const { data: perfil } = await supabase.from('profiles').select('rol').eq('id', usuario.uid).maybeSingle()
      if (perfil?.rol !== 'admin') return NextResponse.json({ error: 'Solo administradores' }, { status: 403 })

      const uid = String(body.uid || '')
      if (!uid) return NextResponse.json({ error: 'Falta el destinatario' }, { status: 400 })

      const { data: subs } = await supabase.from('push_suscripciones').select('*').eq('usuario_id', uid)
      const r = await enviarA(subs || [], {
        title: String(body.titulo || 'Aviso').slice(0, 80),
        body: String(body.cuerpo || '').slice(0, 140),
        url: rutaSegura(body.url, '/cliente/dashboard'),
      })
      return NextResponse.json(r)
    }

    return NextResponse.json({ error: 'Modo no válido' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Error' }, { status: 500 })
  }
}
