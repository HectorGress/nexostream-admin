'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MessageCircle, ArrowRight, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useAdminGuard } from '@/lib/useAdminGuard'
import { useTema } from '@/lib/useTema'
import { makeUi, Skeleton } from '@/lib/ui'
import { diasHasta, dinero, perfilesPorDefecto } from '@/lib/extras'
import { enlaceCobro } from '@/lib/cobro'
import ServicioPunto from '@/components/ServicioPunto'
import PushActivar from '@/components/PushActivar'

const cuando = (d: number) =>
  d < 0 ? `venció hace ${-d} día${d === -1 ? '' : 's'}` : d === 0 ? 'vence hoy' : d === 1 ? 'vence mañana' : `vence en ${d} días`

export default function HoyPage() {
  const autorizado = useAdminGuard()
  const [darkMode] = useTema()
  const ui = makeUi(darkMode)
  const [d, setD] = useState<any>(null)

  const cargar = async () => {
    const supabase = createClient()
    const [cli, mad, sol, rep, ped] = await Promise.all([
      supabase.from('cuentas_clientes').select('id, nombre_completo, servicio, perfil_asignado, fecha_vencimiento, cuenta_madre_id, telefono'),
      supabase.from('cuentas_madre').select('id, servicio, correo, proveedor, fecha_vencimiento, max_perfiles'),
      supabase.from('solicitudes_renovacion').select('id, cliente_nombre, servicio, meses, monto').eq('estado', 'pendiente').order('created_at', { ascending: false }).limit(5),
      supabase.from('reportes').select('id, nombre_cliente, descripcion_problema').eq('atendido', false).order('created_at', { ascending: false }).limit(5),
      supabase.from('pedidos_servicio').select('id, cliente_nombre, servicio').eq('estado', 'nuevo').limit(5),
    ])
    setD({ cli: cli.data || [], mad: mad.data || [], sol: sol.data || [], rep: rep.data || [], ped: ped.data || [] })
  }

  useEffect(() => {
    if (autorizado) cargar()
  }, [autorizado])

  if (!autorizado || !d) {
    return (
      <div className={`min-h-screen p-4 md:p-8 ${ui.page}`}>
        <div className="max-w-5xl mx-auto space-y-4">
          <Skeleton dark={darkMode} className="h-12 w-56" />
          <Skeleton dark={darkMode} className="h-24 w-full" />
          <Skeleton dark={darkMode} className="h-64 w-full" />
        </div>
      </div>
    )
  }

  const conDias = d.cli.map((c: any) => ({ ...c, dias: diasHasta(c.fecha_vencimiento) }))
  const hoy = conDias.filter((c: any) => c.dias === 0)
  const proximos = conDias.filter((c: any) => c.dias >= 1 && c.dias <= 3).sort((a: any, b: any) => a.dias - b.dias)
  const vencidas = conDias.filter((c: any) => c.dias < 0 && c.dias >= -7).sort((a: any, b: any) => b.dias - a.dias)

  const ocupados: Record<string, number> = {}
  d.cli.forEach((c: any) => { if (c.cuenta_madre_id) ocupados[c.cuenta_madre_id] = (ocupados[c.cuenta_madre_id] || 0) + 1 })
  const madresPorVencer = d.mad
    .map((m: any) => ({ ...m, dias: diasHasta(m.fecha_vencimiento), n: ocupados[m.id] || 0 }))
    .filter((m: any) => m.dias <= 5 && m.dias >= -3)
    .sort((a: any, b: any) => a.dias - b.dias)

  const libresPorServicio: Record<string, number> = {}
  d.mad.forEach((m: any) => {
    if (diasHasta(m.fecha_vencimiento) < 0) return
    const libres = (m.max_perfiles || perfilesPorDefecto(m.servicio)) - (ocupados[m.id] || 0)
    if (libres > 0) libresPorServicio[m.servicio] = (libresPorServicio[m.servicio] || 0) + libres
  })

  const fecha = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
  const urgentes = hoy.length + d.sol.length + d.rep.length + d.ped.length

  const Bloque = ({ titulo, n, children }: { titulo: string; n: number; children: React.ReactNode }) => (
    <section className={`p-5 border rounded-2xl ${ui.card}`}>
      <div className="flex items-baseline justify-between mb-1">
        <h2 className="text-base font-semibold">{titulo}</h2>
        <span className={`text-sm font-semibold ${n > 0 ? '' : ui.muted}`}>{n}</span>
      </div>
      {n === 0 ? <p className={`text-sm py-3 ${ui.muted}`}>Nada por aquí.</p> : <div className={`divide-y ${ui.divide}`}>{children}</div>}
    </section>
  )

  const Fila = ({ c }: { c: any }) => (
    <div className="flex items-center gap-3 py-2.5">
      <ServicioPunto servicio={c.servicio} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{c.nombre_completo || 'Sin nombre'}</p>
        <p className={`text-xs truncate ${ui.muted}`}>{c.servicio} · {c.perfil_asignado || 'sin perfil'} · {cuando(c.dias)}</p>
      </div>
      <a href={enlaceCobro(c)} target="_blank" rel="noopener noreferrer" className={ui.iconBtn} title="Cobrar por WhatsApp" aria-label="Cobrar por WhatsApp"><MessageCircle size={16} /></a>
      <Link href={`/admin/dashboard?q=${encodeURIComponent(c.nombre_completo || '')}&tab=clientes`} className={ui.iconBtn} aria-label="Ver en el panel"><ArrowRight size={16} /></Link>
    </div>
  )

  return (
    <div className={`min-h-screen transition-colors duration-200 p-4 md:p-8 ${ui.page}`}>
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className={`text-sm capitalize ${ui.muted}`}>{fecha}</p>
            <h1 className="text-4xl">Hoy</h1>
          </div>
          <PushActivar dark={darkMode} rol="admin" />
        </header>

        {urgentes === 0 ? (
          <div className={`p-5 border rounded-2xl flex items-center gap-3 ${ui.card}`}>
            <CheckCircle2 className={darkMode ? 'text-emerald-300' : 'text-emerald-600'} />
            <p className="text-sm">Todo en orden: no vence nada hoy y no hay solicitudes ni reportes esperando.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { n: hoy.length, t: 'Vencen hoy', href: '/admin/dashboard' },
              { n: d.sol.length, t: 'Solicitudes', href: '/admin/centro' },
              { n: d.ped.length, t: 'Pedidos nuevos', href: '/admin/centro' },
              { n: d.rep.length, t: 'Reportes abiertos', href: '/admin/reportes' },
            ].map((x) => (
              <Link key={x.t} href={x.href} className={`p-4 border rounded-2xl ${ui.card} ${x.n > 0 ? '' : 'opacity-60'}`}>
                <p className="text-3xl font-bold tabular-nums">{x.n}</p>
                <p className={`text-xs ${ui.muted}`}>{x.t}</p>
              </Link>
            ))}
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-4 items-start">
          <Bloque titulo="Vencen hoy" n={hoy.length}>{hoy.map((c: any) => <Fila key={c.id} c={c} />)}</Bloque>
          <Bloque titulo="Vencen en los próximos 3 días" n={proximos.length}>{proximos.map((c: any) => <Fila key={c.id} c={c} />)}</Bloque>
          <Bloque titulo="Vencieron esta semana" n={vencidas.length}>{vencidas.map((c: any) => <Fila key={c.id} c={c} />)}</Bloque>

          <Bloque titulo="Cuentas madre por vencer" n={madresPorVencer.length}>
            {madresPorVencer.map((m: any) => (
              <div key={m.id} className="flex items-center gap-3 py-2.5">
                <ServicioPunto servicio={m.servicio} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{m.correo}</p>
                  <p className={`text-xs ${ui.muted}`}>{m.servicio} · {cuando(m.dias)} · {m.n} cliente{m.n === 1 ? '' : 's'} dentro</p>
                </div>
                <Link href={`/admin/dashboard?q=${encodeURIComponent(m.correo || '')}&tab=madres`} className={ui.iconBtn} aria-label="Ver cuenta madre"><ArrowRight size={16} /></Link>
              </div>
            ))}
          </Bloque>

          <Bloque titulo="Solicitudes de renovación" n={d.sol.length}>
            {d.sol.map((s: any) => (
              <Link key={s.id} href="/admin/centro" className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="truncate">{s.cliente_nombre || 'Cliente'} · {s.servicio} · {s.meses} {s.meses === 1 ? 'mes' : 'meses'}</span>
                <span className="font-semibold shrink-0">{dinero(s.monto)}</span>
              </Link>
            ))}
          </Bloque>

          <Bloque titulo="Reportes sin resolver" n={d.rep.length}>
            {d.rep.map((r: any) => (
              <Link key={r.id} href="/admin/reportes" className="block py-2.5 text-sm">
                <span className="font-medium">{r.nombre_cliente || 'Cliente'}</span>
                <span className={`block text-xs truncate ${ui.muted}`}>{String(r.descripcion_problema || '').split('\n')[0]}</span>
              </Link>
            ))}
          </Bloque>
        </div>

        <section className={`p-5 border rounded-2xl ${ui.card}`}>
          <h2 className="text-base font-semibold mb-3">Perfiles libres para vender</h2>
          {Object.keys(libresPorServicio).length === 0 ? (
            <p className={`text-sm ${ui.muted}`}>No queda ningún perfil libre en cuentas vigentes.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {Object.entries(libresPorServicio).map(([s, n]) => (
                <span key={s} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm ${ui.cardInner}`}>
                  <ServicioPunto servicio={s} /> {s} <strong>{n}</strong>
                </span>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
