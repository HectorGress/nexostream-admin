'use client'

import { useEffect, useState } from 'react'
import { Check, X, Loader2, Inbox, ExternalLink } from 'lucide-react'
import { auth } from '@/lib/firebase'
import { createClient } from '@/lib/supabase'
import { formatearFecha } from '@/lib/cuentas'
import { makeUi, Pill, Skeleton } from '@/lib/ui'
import type { Tone } from '@/lib/cuentas'
import {
  dinero, diasHasta, diasEntre, hoyLocalISO, registrarBitacora, registrarPago,
} from '@/lib/extras'
import { sumarMesesISO } from '@/lib/utilidades'
import { notificarUsuario } from '@/lib/pushCliente'

const TONO: Record<string, Tone> = { pendiente: 'warning', aprobada: 'success', rechazada: 'danger' }

export default function SolicitudesAdmin({ dark }: { dark: boolean }) {
  const ui = makeUi(dark)
  const supabase = createClient()
  const [lista, setLista] = useState<any[]>([])
  const [ver, setVer] = useState<'pendiente' | 'revisadas'>('pendiente')
  const [cargando, setCargando] = useState(true)
  const [procesando, setProcesando] = useState<number | null>(null)

  const cargar = async () => {
    const { data } = await supabase
      .from('solicitudes_renovacion')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    setLista(data || [])
    setCargando(false)
  }

  useEffect(() => {
    cargar()
    const canal = supabase
      .channel('centro-solicitudes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitudes_renovacion' }, cargar)
      .subscribe()
    return () => {
      supabase.removeChannel(canal)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const aprobar = async (s: any) => {
    if (!confirm(`¿Aprobar la renovación de ${s.cliente_nombre || 'este cliente'}?\n\nSe suman ${s.meses} mes(es) y se registra el pago de ${dinero(s.monto)}.`)) return
    setProcesando(s.id)

    const { data: cta } = await supabase
      .from('cuentas_clientes')
      .select('id, nombre_completo, servicio, fecha_vencimiento')
      .eq('id', s.cuenta_id)
      .maybeSingle()
    if (!cta) {
      alert('No encontré la cuenta de esta solicitud (¿se borró?).')
      setProcesando(null)
      return
    }

    // Si sigue vigente se suma al vencimiento actual; si ya venció, desde hoy
    const vigente = !!cta.fecha_vencimiento && diasHasta(cta.fecha_vencimiento) >= 0
    const base: string = vigente ? cta.fecha_vencimiento : hoyLocalISO()
    const nuevo = sumarMesesISO(base, s.meses)

    const { error } = await supabase.from('cuentas_clientes').update({ fecha_vencimiento: nuevo }).eq('id', cta.id)
    if (error) {
      alert(`❌ No se pudo renovar: ${error.message}`)
      setProcesando(null)
      return
    }

    await registrarPago({
      clienteId: cta.id,
      nombre: cta.nombre_completo || s.cliente_nombre || 'Sin nombre',
      servicio: s.servicio,
      monto: Number(s.monto),
      dias: diasEntre(base, nuevo),
      nuevoVencimiento: nuevo,
      nota: `Renovación por comprobante (${s.meses} ${s.meses === 1 ? 'mes' : 'meses'})`,
    })
    await supabase
      .from('solicitudes_renovacion')
      .update({ estado: 'aprobada', revisado_por: auth.currentUser?.email || null, revisado_at: new Date().toISOString() })
      .eq('id', s.id)
    await registrarBitacora(
      'renovar',
      'cliente',
      `${cta.nombre_completo || s.cliente_nombre} (${s.servicio}) +${s.meses} mes(es), vence ${formatearFecha(nuevo)} · ${dinero(s.monto)} · por comprobante`
    )
    notificarUsuario(s.usuario_id, 'Renovación aprobada ✅', `Tu ${s.servicio || 'cuenta'} ahora vence el ${formatearFecha(nuevo)}.`)

    setProcesando(null)
    cargar()
  }

  const rechazar = async (s: any) => {
    const motivo = prompt('Motivo del rechazo (el cliente lo va a ver):', 'No pudimos validar tu pago.')
    if (motivo === null) return
    setProcesando(s.id)
    const { error } = await supabase
      .from('solicitudes_renovacion')
      .update({ estado: 'rechazada', motivo: motivo.trim() || null, revisado_por: auth.currentUser?.email || null, revisado_at: new Date().toISOString() })
      .eq('id', s.id)
    if (error) alert(`❌ ${error.message}`)
    else {
      await registrarBitacora('editar', 'cliente', `Rechazó la solicitud de ${s.cliente_nombre || 'cliente'} (${s.servicio})${motivo ? `: ${motivo}` : ''}`)
      notificarUsuario(s.usuario_id, 'No pudimos validar tu pago', motivo.trim() || 'Revisa tu solicitud en la pestaña Mis pagos.')
    }
    setProcesando(null)
    cargar()
  }

  const visibles = lista.filter((s) => (ver === 'pendiente' ? s.estado === 'pendiente' : s.estado !== 'pendiente'))
  const nPend = lista.filter((s) => s.estado === 'pendiente').length

  const chip = (activo: boolean) =>
    `px-3 py-1 rounded-full text-xs font-semibold border transition ${
      activo ? 'bg-indigo-600 border-indigo-600 text-white' : (dark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600')
    }`

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button type="button" className={chip(ver === 'pendiente')} onClick={() => setVer('pendiente')}>Pendientes ({nPend})</button>
        <button type="button" className={chip(ver === 'revisadas')} onClick={() => setVer('revisadas')}>Revisadas</button>
      </div>

      {cargando ? (
        <div className="space-y-3">{[0, 1].map((i) => <Skeleton key={i} dark={dark} className="h-40 w-full" />)}</div>
      ) : visibles.length === 0 ? (
        <div className={`border rounded-2xl flex flex-col items-center text-center py-14 px-6 ${ui.card}`}>
          <Inbox size={26} className={ui.muted} />
          <p className="font-semibold text-sm mt-2">{ver === 'pendiente' ? 'No hay solicitudes pendientes' : 'Aún no hay solicitudes revisadas'}</p>
          <p className={`text-xs mt-1 ${ui.muted}`}>Cuando un cliente suba su comprobante aparecerá aquí al instante.</p>
        </div>
      ) : (
        visibles.map((s) => (
          <div key={s.id} className={`p-4 border rounded-2xl flex flex-col sm:flex-row gap-4 ${ui.card}`}>
            {s.comprobante_url && (
              <a href={s.comprobante_url} target="_blank" rel="noopener noreferrer" className="shrink-0 group relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.comprobante_url} alt="Comprobante" loading="lazy" className="h-40 w-full sm:w-32 object-cover rounded-xl border border-slate-300/50" />
                <span className="absolute bottom-1 right-1 bg-black/60 text-white rounded-md p-1"><ExternalLink size={12} /></span>
              </a>
            )}
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold">{s.cliente_nombre || 'Cliente'}</span>
                {s.cliente_handle && <span className={`text-xs font-mono ${dark ? 'text-indigo-300' : 'text-indigo-700'}`}>@{s.cliente_handle}</span>}
                <Pill dark={dark} tone={TONO[s.estado] || 'neutral'}>{s.estado}</Pill>
              </div>
              <p className="text-sm">{s.servicio} · {s.meses} {s.meses === 1 ? 'mes' : 'meses'} · <strong>{dinero(s.monto)}</strong></p>
              <p className={`text-xs ${ui.muted}`}>{new Date(s.created_at).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}</p>
              {s.nota && <p className="text-sm">“{s.nota}”</p>}
              {s.estado === 'rechazada' && s.motivo && <p className="text-xs text-rose-600">Motivo: {s.motivo}</p>}
              {s.revisado_por && <p className={`text-[11px] ${ui.muted}`}>Revisó: {s.revisado_por}</p>}

              {s.estado === 'pendiente' && (
                <div className="flex flex-wrap gap-2 pt-2">
                  <button type="button" disabled={procesando === s.id} onClick={() => aprobar(s)} className={ui.btnPrimary}>
                    {procesando === s.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Aprobar y renovar
                  </button>
                  <button type="button" disabled={procesando === s.id} onClick={() => rechazar(s)} className={ui.btnGhost}>
                    <X size={16} /> Rechazar
                  </button>
                </div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
