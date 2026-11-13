'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { notificarAdmins } from '@/lib/pushCliente'

type Props = { item: any; uid?: string; perfil: any; dark: boolean }

// Precio de un servicio con botón para pedirlo
export default function PedirServicio({ item, uid, perfil, dark }: Props) {
  const [estado, setEstado] = useState<'libre' | 'enviando' | 'listo'>('libre')

  const pedir = async () => {
    if (!uid) return
    if (!perfil?.cliente_id) { alert('Primero elige tu nombre e ID en "Mi perfil".'); return }
    if (!confirm(`¿Quieres pedir ${item.nombre} por $${item.precio} MXN? Te contactaremos para dártelo.`)) return
    setEstado('enviando')
    const supabase = createClient()
    const { error } = await supabase.from('pedidos_servicio').insert([{
      usuario_id: uid,
      cliente_nombre: perfil?.nombre || null,
      cliente_handle: perfil?.cliente_id || null,
      servicio: item.nombre,
      precio: Number(item.precio) || 0,
    }])
    if (error) { alert(`❌ No se pudo enviar tu pedido: ${error.message}`); setEstado('libre'); return }
    notificarAdmins('pedido', `${perfil?.nombre || 'Cliente'} quiere ${item.nombre}`)
    setEstado('listo')
  }

  return (
    <span className="flex items-center gap-2">
      <span className={`font-bold ${dark ? 'text-indigo-300' : 'text-indigo-700'}`}>${item.precio} MXN</span>
      <button
        type="button"
        onClick={pedir}
        disabled={estado !== 'libre'}
        className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition ${
          estado === 'listo'
            ? (dark ? 'border-emerald-500/40 text-emerald-300' : 'border-emerald-300 text-emerald-700')
            : (dark ? 'border-slate-600 text-slate-200 hover:bg-slate-700' : 'border-slate-300 text-slate-700 hover:bg-slate-100')
        }`}
      >
        {estado === 'listo' ? <><Check size={12} className="inline" /> Pedido</> : estado === 'enviando' ? '...' : 'Pedir'}
      </button>
    </span>
  )
}
