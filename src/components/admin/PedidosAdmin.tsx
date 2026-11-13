'use client'

import { useEffect, useState } from 'react'
import { Check, Inbox, MessageCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { makeUi, Pill, Skeleton } from '@/lib/ui'
import { dinero } from '@/lib/extras'
import { registrarBitacora } from '@/lib/extras'
import ServicioPunto from '@/components/ServicioPunto'

export default function PedidosAdmin({ dark }: { dark: boolean }) {
  const ui = makeUi(dark)
  const supabase = createClient()
  const [lista, setLista] = useState<any[]>([])
  const [ver, setVer] = useState<'nuevo' | 'atendido'>('nuevo')
  const [cargando, setCargando] = useState(true)

  const cargar = async () => {
    const { data } = await supabase.from('pedidos_servicio').select('*').order('created_at', { ascending: false }).limit(100)
    setLista(data || [])
    setCargando(false)
  }

  useEffect(() => {
    cargar()
    const canal = supabase
      .channel('centro-pedidos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos_servicio' }, cargar)
      .subscribe()
    return () => { supabase.removeChannel(canal) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const atender = async (p: any) => {
    const { error } = await supabase.from('pedidos_servicio').update({ estado: 'atendido' }).eq('id', p.id)
    if (error) { alert(`❌ ${error.message}`); return }
    await registrarBitacora('editar', 'cliente', `Atendió el pedido de ${p.servicio} de ${p.cliente_nombre || 'un cliente'}`)
    cargar()
  }

  const visibles = lista.filter((p) => p.estado === ver)
  const nNuevos = lista.filter((p) => p.estado === 'nuevo').length
  const chip = (a: boolean) =>
    `px-3 py-1 rounded-full text-xs font-semibold border transition ${
      a ? 'bg-indigo-600 border-indigo-600 text-white' : (dark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600')
    }`

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button type="button" className={chip(ver === 'nuevo')} onClick={() => setVer('nuevo')}>Nuevos ({nNuevos})</button>
        <button type="button" className={chip(ver === 'atendido')} onClick={() => setVer('atendido')}>Atendidos</button>
      </div>

      {cargando ? (
        <Skeleton dark={dark} className="h-24 w-full" />
      ) : visibles.length === 0 ? (
        <div className={`border rounded-2xl flex flex-col items-center text-center py-14 px-6 ${ui.card}`}>
          <Inbox size={26} className={ui.muted} />
          <p className="font-semibold text-sm mt-2">{ver === 'nuevo' ? 'No hay pedidos nuevos' : 'Todavía no hay pedidos atendidos'}</p>
          <p className={`text-xs mt-1 ${ui.muted}`}>Cuando un cliente toque “Pedir” en tu lista de precios, aparecerá aquí.</p>
        </div>
      ) : (
        visibles.map((p) => {
          const texto = `Hola ${String(p.cliente_nombre || '').split(' ')[0]}, vi que quieres ${p.servicio} ($${p.precio} MXN). ¿Te lo preparo?`
          return (
            <div key={p.id} className={`p-4 border rounded-xl flex flex-wrap items-center gap-3 ${ui.card}`}>
              <div className="flex-1 min-w-[200px] space-y-0.5">
                <p className="font-semibold flex items-center gap-2"><ServicioPunto servicio={p.servicio} /> {p.servicio} <span className={`font-normal text-sm ${ui.muted}`}>· {dinero(p.precio)}</span></p>
                <p className="text-sm">
                  {p.cliente_nombre || 'Cliente'}{p.cliente_handle && <span className={`font-mono text-xs ${dark ? 'text-indigo-300' : 'text-indigo-700'}`}> @{p.cliente_handle}</span>}
                </p>
                <p className={`text-xs ${ui.muted}`}>{new Date(p.created_at).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}</p>
              </div>
              {p.estado === 'nuevo' ? (
                <div className="flex gap-2">
                  <a href={`https://wa.me/?text=${encodeURIComponent(texto)}`} target="_blank" rel="noopener noreferrer" className={ui.btnGhost}><MessageCircle size={15} /> WhatsApp</a>
                  <button type="button" onClick={() => atender(p)} className={ui.btnPrimary}><Check size={15} /> Atendido</button>
                </div>
              ) : (
                <Pill dark={dark} tone="success">Atendido</Pill>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
