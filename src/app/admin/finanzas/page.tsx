'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MessageCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useAdminGuard } from '@/lib/useAdminGuard'
import { useTema } from '@/lib/useTema'
import { makeUi, Skeleton } from '@/lib/ui'
import { diasHasta, dinero } from '@/lib/extras'
import { enlaceCobro } from '@/lib/cobro'
import ServicioPunto from '@/components/ServicioPunto'

const corto = (n: number) => (n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${Math.round(n)}`)

export default function FinanzasPage() {
  const autorizado = useAdminGuard()
  const [darkMode] = useTema()
  const ui = makeUi(darkMode)
  const [d, setD] = useState<any>(null)

  useEffect(() => {
    if (!autorizado) return
    const supabase = createClient()
    const ahora = new Date()
    const desde = new Date(ahora.getFullYear(), ahora.getMonth() - 5, 1).toISOString()
    Promise.all([
      supabase.from('pagos').select('monto, nota, created_at').gte('created_at', desde),
      supabase.from('bitacora').select('accion, entidad, created_at').in('accion', ['liberar', 'borrar']).gte('created_at', desde),
      supabase.from('cuentas_clientes').select('id, nombre_completo, servicio, fecha_vencimiento, precio_suscripcion, cuenta_madre_id, telefono'),
      supabase.from('cuentas_madre').select('id, servicio, correo, proveedor, costo, fecha_vencimiento'),
      supabase.from('solicitudes_renovacion').select('cuenta_id').eq('estado', 'pendiente'),
    ]).then(([pg, bi, cl, ma, so]) =>
      setD({ pagos: pg.data || [], bit: bi.data || [], cli: cl.data || [], mad: ma.data || [], sol: so.data || [] })
    )
  }, [autorizado])

  if (!autorizado || !d) {
    return (
      <div className={`min-h-screen p-4 md:p-8 ${ui.page}`}>
        <div className="max-w-5xl mx-auto space-y-4">
          <Skeleton dark={darkMode} className="h-12 w-56" />
          <Skeleton dark={darkMode} className="h-28 w-full" />
          <Skeleton dark={darkMode} className="h-64 w-full" />
        </div>
      </div>
    )
  }

  const ahora = new Date()
  const meses = Array.from({ length: 6 }, (_, i) => {
    const f = new Date(ahora.getFullYear(), ahora.getMonth() - (5 - i), 1)
    return { clave: `${f.getFullYear()}-${f.getMonth()}`, etiqueta: f.toLocaleDateString('es-MX', { month: 'short' }).replace('.', '') }
  })
  const claveDe = (iso: string) => { const f = new Date(iso); return `${f.getFullYear()}-${f.getMonth()}` }

  const serie = meses.map((m) => {
    const pagos = d.pagos.filter((p: any) => claveDe(p.created_at) === m.clave)
    return {
      ...m,
      ingresos: pagos.reduce((t: number, p: any) => t + Number(p.monto || 0), 0),
      nuevos: pagos.filter((p: any) => p.nota === 'Pago inicial').length,
      renovaciones: pagos.filter((p: any) => p.nota !== 'Pago inicial' && Number(p.monto) > 0).length,
      bajas: d.bit.filter((b: any) => b.entidad === 'cliente' && claveDe(b.created_at) === m.clave).length,
    }
  })
  const maximo = Math.max(1, ...serie.map((s) => s.ingresos))
  const esteMes = serie[5].ingresos
  const anterior = serie[4].ingresos
  const cambio = anterior > 0 ? Math.round(((esteMes - anterior) / anterior) * 100) : null

  const vigentes = d.cli.filter((c: any) => c.cuenta_madre_id && diasHasta(c.fecha_vencimiento) >= 0)
  const mrr = vigentes.reduce((t: number, c: any) => t + Number(c.precio_suscripcion || 0), 0)
  const madresVigentes = d.mad.filter((m: any) => diasHasta(m.fecha_vencimiento) >= 0)
  const costo = madresVigentes.reduce((t: number, m: any) => t + Number(m.costo || 0), 0)

  const porMadre = d.mad
    .map((m: any) => {
      const suyos = vigentes.filter((c: any) => c.cuenta_madre_id === m.id)
      const ingreso = suyos.reduce((t: number, c: any) => t + Number(c.precio_suscripcion || 0), 0)
      return { ...m, n: suyos.length, ingreso, margen: m.costo == null ? null : ingreso - Number(m.costo) }
    })
    .sort((a: any, b: any) => (a.margen ?? 1e9) - (b.margen ?? 1e9))

  const conSolicitud = new Set(d.sol.map((s: any) => s.cuenta_id))
  const enRiesgo = d.cli
    .map((c: any) => ({ ...c, dias: diasHasta(c.fecha_vencimiento) }))
    .filter((c: any) => c.dias >= -2 && c.dias <= 7 && !conSolicitud.has(c.id))
    .sort((a: any, b: any) => a.dias - b.dias)
    .slice(0, 10)

  const verde = darkMode ? 'text-emerald-300' : 'text-emerald-700'
  const rojo = darkMode ? 'text-rose-300' : 'text-rose-600'

  return (
    <div className={`min-h-screen transition-colors duration-200 p-4 md:p-8 ${ui.page}`}>
      <div className="max-w-5xl mx-auto space-y-6">
        <header>
          <h1 className="text-4xl">Finanzas</h1>
          <p className={`text-sm ${ui.muted}`}>Cuánto entra, cuánto cuesta y quién está por irse.</p>
        </header>

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { t: 'Ingresos del mes', v: dinero(esteMes), s: cambio === null ? 'Sin mes anterior para comparar' : `${cambio >= 0 ? '+' : ''}${cambio}% vs. mes anterior`, c: cambio !== null && cambio < 0 ? rojo : verde },
            { t: 'Ingreso mensual estimado', v: dinero(mrr), s: `${vigentes.length} cliente(s) vigentes`, c: '' },
            { t: 'Costo de cuentas madre', v: dinero(costo), s: costo === 0 ? 'Agrega el costo en cada cuenta' : `${madresVigentes.length} cuenta(s) vigentes`, c: '' },
            { t: 'Margen estimado', v: dinero(mrr - costo), s: 'Ingreso estimado menos costo', c: mrr - costo < 0 ? rojo : verde },
          ].map((k) => (
            <div key={k.t} className={`p-4 border rounded-2xl ${ui.card}`}>
              <p className={`text-xs ${ui.muted}`}>{k.t}</p>
              <p className={`text-2xl font-bold leading-tight ${k.c}`}>{k.v}</p>
              <p className={`text-[11px] ${ui.muted}`}>{k.s}</p>
            </div>
          ))}
        </section>

        <section className={`p-5 border rounded-2xl ${ui.card}`}>
          <h2 className="text-base font-semibold mb-4">Ingresos por mes</h2>
          <div className="grid grid-cols-6 gap-3 items-end h-44">
            {serie.map((s, i) => (
              <div key={s.clave} className="flex flex-col items-center justify-end h-full gap-1">
                <span className="text-[11px] font-semibold tabular-nums">{corto(s.ingresos)}</span>
                <div
                  className={`w-full max-w-[56px] rounded-t-md transition-all ${i === 5 ? 'bg-indigo-600' : (darkMode ? 'bg-slate-600' : 'bg-slate-300')}`}
                  style={{ height: `${Math.max(3, (s.ingresos / maximo) * 100)}%` }}
                />
                <span className={`text-xs capitalize ${ui.muted}`}>{s.etiqueta}</span>
              </div>
            ))}
          </div>
        </section>

        <section className={`p-5 border rounded-2xl ${ui.card}`}>
          <h2 className="text-base font-semibold mb-3">Clientes que llegan, renuevan y se van</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[420px]">
              <thead className={`text-xs ${ui.muted}`}>
                <tr><th className="text-left py-1.5 font-medium"></th>{serie.map((s) => <th key={s.clave} className="py-1.5 font-medium capitalize">{s.etiqueta}</th>)}</tr>
              </thead>
              <tbody className={`divide-y ${ui.divide}`}>
                {[
                  { t: 'Nuevos', k: 'nuevos', c: verde },
                  { t: 'Renovaciones', k: 'renovaciones', c: '' },
                  { t: 'Bajas', k: 'bajas', c: rojo },
                ].map((f) => (
                  <tr key={f.k}>
                    <td className="py-2 font-medium">{f.t}</td>
                    {serie.map((s: any) => <td key={s.clave} className={`py-2 text-center tabular-nums ${s[f.k] > 0 ? f.c : ui.muted}`}>{s[f.k]}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={`text-[11px] mt-2 ${ui.muted}`}>Nuevos y renovaciones salen de los pagos registrados; bajas, de los perfiles liberados o clientes borrados.</p>
        </section>

        <section className={`p-5 border rounded-2xl ${ui.card}`}>
          <h2 className="text-base font-semibold mb-1">Margen por cuenta madre</h2>
          <p className={`text-xs mb-3 ${ui.muted}`}>Ingreso mensual de sus clientes menos lo que te cuesta. Las que pierden dinero salen primero.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead className={`text-xs text-left ${ui.muted}`}>
                <tr><th className="py-1.5 font-medium">Cuenta</th><th className="font-medium">Clientes</th><th className="font-medium text-right">Ingreso</th><th className="font-medium text-right">Costo</th><th className="font-medium text-right">Margen</th></tr>
              </thead>
              <tbody className={`divide-y ${ui.divide}`}>
                {porMadre.map((m: any) => (
                  <tr key={m.id}>
                    <td className="py-2"><span className="flex items-center gap-2"><ServicioPunto servicio={m.servicio} /><span className="truncate max-w-[220px]">{m.correo}</span></span></td>
                    <td>{m.n}</td>
                    <td className="text-right tabular-nums">{dinero(m.ingreso)}</td>
                    <td className="text-right tabular-nums">{m.costo == null ? '—' : dinero(m.costo)}</td>
                    <td className={`text-right tabular-nums font-semibold ${m.margen == null ? ui.muted : m.margen < 0 ? rojo : verde}`}>{m.margen == null ? '—' : dinero(m.margen)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {porMadre.some((m: any) => m.costo == null) && <p className={`text-[11px] mt-2 ${ui.muted}`}>Las cuentas con “—” todavía no tienen costo: agrégalo al editarlas en el Panel.</p>}
        </section>

        <section className={`p-5 border rounded-2xl ${ui.card}`}>
          <h2 className="text-base font-semibold mb-1">En riesgo de irse</h2>
          <p className={`text-xs mb-2 ${ui.muted}`}>Vencen pronto (o acaban de vencer) y todavía no mandan comprobante.</p>
          {enRiesgo.length === 0 ? (
            <p className={`text-sm py-2 ${ui.muted}`}>Nadie en riesgo por ahora.</p>
          ) : (
            <div className={`divide-y ${ui.divide}`}>
              {enRiesgo.map((c: any) => (
                <div key={c.id} className="flex items-center gap-3 py-2.5">
                  <ServicioPunto servicio={c.servicio} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/admin/dashboard?q=${encodeURIComponent(c.nombre_completo || '')}&tab=clientes`} className="text-sm font-medium hover:underline">{c.nombre_completo || 'Sin nombre'}</Link>
                    <p className={`text-xs ${ui.muted}`}>{c.servicio} · {c.dias < 0 ? `venció hace ${-c.dias} día(s)` : c.dias === 0 ? 'vence hoy' : `vence en ${c.dias} día(s)`}</p>
                  </div>
                  <a href={enlaceCobro(c)} target="_blank" rel="noopener noreferrer" className={ui.btnGhost}><MessageCircle size={15} /> Cobrar</a>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
