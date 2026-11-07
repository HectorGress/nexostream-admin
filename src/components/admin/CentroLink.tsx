'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Inbox } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { makeUi } from '@/lib/ui'

// Botón del panel que lleva al Centro del cliente y muestra cuántas solicitudes esperan revisión
export default function CentroLink({ dark }: { dark: boolean }) {
  const ui = makeUi(dark)
  const [pendientes, setPendientes] = useState(0)

  useEffect(() => {
    const supabase = createClient()
    const contar = async () => {
      const { count } = await supabase
        .from('solicitudes_renovacion')
        .select('id', { count: 'exact', head: true })
        .eq('estado', 'pendiente')
      setPendientes(count || 0)
    }
    contar()
    const canal = supabase
      .channel('centro-link')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitudes_renovacion' }, contar)
      .subscribe()
    return () => {
      supabase.removeChannel(canal)
    }
  }, [])

  return (
    <Link href="/admin/centro" className={`${ui.btnGhost} relative`}>
      <Inbox size={16} /> <span>Centro del cliente</span>
      {pendientes > 0 && (
        <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-rose-600 text-white text-[11px] font-bold flex items-center justify-center">
          {pendientes}
        </span>
      )}
    </Link>
  )
}
