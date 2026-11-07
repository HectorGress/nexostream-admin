'use client'

import { useEffect, useState } from 'react'
import { Gift, Loader2, Inbox } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { formatearFecha } from '@/lib/cuentas'
import { makeUi, Pill, Skeleton } from '@/lib/ui'
import { diasHasta, hoyLocalISO, sumarDiasISO, diasEntre, registrarBitacora, registrarPago } from '@/lib/extras'
import { notificarUsuario } from '@/lib/pushCliente'
import { DIAS_PREMIO_REFERIDO } from '@/lib/config'

export default function ReferidosAdmin({ dark }: { dark: boolean }) {
  const ui = makeUi(dark)
  const supabase = createClient()
  const [filas, setFilas] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [procesando, setProcesando] = useState<number | null>(null)

  const cargar = async () => {
    const { data: refs } = await supabase.from('referidos').select('*').order('created_at', { ascending: false }).limit(100)
    const lista = refs || []
    const uids = Array.from(new Set(lista.flatMap((r) => [r.referidor_uid, r.referido_uid])))
    const referidos = lista.map((r) => r.referido_uid)

    const [pf, ct] = await Promise.all([
      uids.length ? supabase.from('profiles').select('id, nombre, cliente_id').in('id', uids) : Promise.resolve({ data: [] as any[] }),
      referidos.length ? supabase.from('cuentas_clientes').select('usuario_id').in('usuario_id', referidos) : Promise.resolve({ data: [] as any[] }),
    ])
    const perfiles: Record<string, any> = {}
    ;(pf.data || []).forEach((p: any) => { perfiles[p.id] = p })
    const compraron = new Set((ct.data || []).map((c: any) => c.usuario_id))

    setFilas(lista.map((r) => ({ ...r, referidor: perfiles[r.referidor_uid], referido: perfiles[r.referido_uid], elegible: compraron.has(r.referido_uid) })))
    setCargando(false)
  }

  useEffect(() => {
    cargar()
    const canal = supabase
      .channel('centro-referidos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'referidos' }, cargar)
      .subscribe()
    return () => {
      supabase.removeChannel(canal)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const premiar = async (r: any) => {
    const quien = r.referidor?.nombre || 'el cliente'
    if (!confirm(`¿Darle ${DIAS_PREMIO_REFERIDO} días gratis a ${quien}?\n\nSe suman a su cuenta que vence más pronto.`)) return
    setProcesando(r.id)

    const { data: cuentas } = await supabase
      .from('cuentas_clientes')
      .select('id, nombre_completo, servicio, fecha_vencimiento')
      .eq('usuario_id', r.referidor_uid)
      .order('fecha_vencimiento', { ascending: true })
    const lista = cuentas || []
    const cta = lista.find((c) => c.fecha_vencimiento && diasHasta(c.fecha_vencimiento) >= 0) || lista[0]
    if (!cta) {
      alert(`${quien} todavía no tiene ninguna cuenta enviada, así que no hay a cuál sumarle los días.`)
      setProcesando(null)
      return
    }

    const vigente = !!cta.fecha_vencimiento && diasHasta(cta.fecha_vencimiento) >= 0
    const base: string = vigente ? cta.fecha_vencimiento : hoyLocalISO()
    const nuevo = sumarDiasISO(base, DIAS_PREMIO_REFERIDO)

    const { error } = await supabase.from('cuentas_clientes').update({ fecha_vencimiento: nuevo }).eq('id', cta.id)
    if (error) { alert(`❌ ${error.message}`); setProcesando(null); return }

    await registrarPago({
      clienteId: cta.id,
      nombre: cta.nombre_completo || quien,
      servicio: cta.servicio,
      monto: 0,
      dias: diasEntre(base, nuevo),
      nuevoVencimiento: nuevo,
      nota: 'Premio por referido',
    })
    await supabase.from('referidos').update({ estado: 'premiado', premiado_at: new Date().toISOString() }).eq('id', r.id)
    await registrarBitacora('renovar', 'cliente', `Premio por referido: ${quien} +${DIAS_PREMIO_REFERIDO} días en ${cta.servicio}, vence ${formatearFecha(nuevo)}`)
    notificarUsuario(r.referidor_uid, '¡Ganaste días gratis! 🎁', `Tu amigo ya compró. Te sumamos ${DIAS_PREMIO_REFERIDO} días a tu ${cta.servicio || 'cuenta'}.`)

    setProcesando(null)
    cargar()
  }

  if (cargando) return <div className="space-y-3">{[0, 1].map((i) => <Skeleton key={i} dark={dark} className="h-20 w-full" />)}</div>

  if (filas.length === 0) {
    return (
      <div className={`border rounded-2xl flex flex-col items-center text-center py-14 px-6 ${ui.card}`}>
        <Inbox size={26} className={ui.muted} />
        <p className="font-semibold text-sm mt-2">Aún no hay referidos</p>
        <p className={`text-xs mt-1 ${ui.muted}`}>Aparecen cuando un cliente nuevo escribe el ID de quien lo invitó.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {filas.map((r) => (
        <div key={r.id} className={`p-4 border rounded-xl flex flex-wrap items-center gap-3 ${ui.card}`}>
          <div className="flex-1 min-w-[220px] space-y-0.5">
            <p className="text-sm">
              <strong>{r.referidor?.nombre || 'Cliente'}</strong>{r.referidor?.cliente_id && <span className="font-mono text-xs"> @{r.referidor.cliente_id}</span>}
              {' '}invitó a{' '}
              <strong>{r.referido?.nombre || 'Cliente'}</strong>{r.referido?.cliente_id && <span className="font-mono text-xs"> @{r.referido.cliente_id}</span>}
            </p>
            <p className={`text-xs ${ui.muted}`}>{new Date(r.created_at).toLocaleDateString('es-MX', { dateStyle: 'medium' })}</p>
          </div>
          {r.estado === 'premiado' ? (
            <Pill dark={dark} tone="success">Premiado</Pill>
          ) : r.elegible ? (
            <button type="button" disabled={procesando === r.id} onClick={() => premiar(r)} className={ui.btnPrimary}>
              {procesando === r.id ? <Loader2 size={16} className="animate-spin" /> : <Gift size={16} />} Premiar +{DIAS_PREMIO_REFERIDO} días
            </button>
          ) : (
            <Pill dark={dark} tone="neutral">Aún no compra</Pill>
          )}
        </div>
      ))}
    </div>
  )
}
