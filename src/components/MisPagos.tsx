'use client'

import { useEffect, useState } from 'react'
import { Download, Inbox, Receipt, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { formatearFecha } from '@/lib/cuentas'
import { makeUi, Pill, Skeleton } from '@/lib/ui'
import { dinero } from '@/lib/extras'
import { descargarRecibo } from '@/lib/recibo'
import type { Tone } from '@/lib/cuentas'

const TONO_ESTADO: Record<string, Tone> = { pendiente: 'warning', aprobada: 'success', rechazada: 'danger' }

export default function MisPagos({ uid, cuentas, perfil, dark }: { uid: string; cuentas: any[]; perfil: any; dark: boolean }) {
  const ui = makeUi(dark)
  const supabase = createClient()
  const [pagos, setPagos] = useState<any[]>([])
  const [solicitudes, setSolicitudes] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)

  const ids = cuentas.map((c) => c.id).join(',')

  const cargar = async () => {
    const idsNum = cuentas.map((c) => c.id)
    const [pg, so] = await Promise.all([
      idsNum.length
        ? supabase.from('pagos').select('*').in('cliente_id', idsNum).order('created_at', { ascending: false })
        : Promise.resolve({ data: [] as any[] }),
      supabase.from('solicitudes_renovacion').select('*').eq('usuario_id', uid).order('created_at', { ascending: false }).limit(20),
    ])
    setPagos(pg.data || [])
    setSolicitudes(so.data || [])
    setCargando(false)
  }

  useEffect(() => {
    cargar()
    const canal = supabase
      .channel(`mis-pagos-${uid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitudes_renovacion', filter: `usuario_id=eq.${uid}` }, cargar)
      .subscribe()
    return () => {
      supabase.removeChannel(canal)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, ids])

  const bajar = async (p: any) => {
    try {
      await descargarRecibo(p, { nombre: perfil?.nombre || p.cliente_nombre, handle: perfil?.cliente_id })
    } catch (e: any) {
      alert(e?.message || 'No se pudo crear el recibo.')
    }
  }

  if (cargando) {
    return <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} dark={dark} className="h-20 w-full" />)}</div>
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Mis pagos</h2>
        <p className={`text-sm ${ui.muted}`}>Tus solicitudes de renovación y el historial de lo que has pagado, con recibo para descargar.</p>
      </div>

      {solicitudes.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold flex items-center gap-1.5"><Clock size={15} /> Solicitudes de renovación</h3>
          {solicitudes.map((s) => (
            <div key={s.id} className={`p-3.5 border rounded-xl flex flex-wrap items-center justify-between gap-2 ${ui.card}`}>
              <div className="min-w-0">
                <p className="font-semibold text-sm">{s.servicio} · {s.meses} {s.meses === 1 ? 'mes' : 'meses'} · {dinero(s.monto)}</p>
                <p className={`text-xs ${ui.muted}`}>{new Date(s.created_at).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                {s.estado === 'rechazada' && s.motivo && <p className="text-xs mt-1 text-rose-600">Motivo: {s.motivo}</p>}
              </div>
              <Pill dark={dark} tone={TONO_ESTADO[s.estado] || 'neutral'}>
                {s.estado === 'pendiente' ? 'En revisión' : s.estado === 'aprobada' ? 'Aprobada' : 'Rechazada'}
              </Pill>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-semibold flex items-center gap-1.5"><Receipt size={15} /> Historial de pagos</h3>
        {pagos.length === 0 ? (
          <div className={`border rounded-2xl flex flex-col items-center text-center py-10 px-6 ${ui.card}`}>
            <Inbox size={24} className={ui.muted} />
            <p className="font-semibold text-sm mt-2">Aún no hay pagos registrados</p>
            <p className={`text-xs mt-1 ${ui.muted}`}>Cuando tu renovación sea aprobada, aparecerá aquí con su recibo.</p>
          </div>
        ) : (
          pagos.map((p) => (
            <div key={p.id} className={`p-3.5 border rounded-xl flex flex-wrap items-center justify-between gap-3 ${ui.card}`}>
              <div className="min-w-0">
                <p className="font-semibold text-sm">
                  {p.servicio || 'Servicio'} ·{' '}
                  <span className={dark ? 'text-emerald-300' : 'text-emerald-700'}>{Number(p.monto) > 0 ? dinero(p.monto) : 'Cortesía'}</span>
                </p>
                <p className={`text-xs ${ui.muted}`}>
                  {new Date(p.created_at).toLocaleDateString('es-MX', { dateStyle: 'medium' })}
                  {p.nuevo_vencimiento && ` · Vigente hasta ${formatearFecha(p.nuevo_vencimiento)}`}
                </p>
                {p.nota && <p className={`text-[11px] ${ui.muted}`}>{p.nota}</p>}
              </div>
              <button type="button" onClick={() => bajar(p)} className={ui.btnGhost}>
                <Download size={15} /> Recibo
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
