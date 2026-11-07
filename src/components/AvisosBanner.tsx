'use client'

import { useEffect, useState } from 'react'
import { Megaphone, X } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { toneClasses } from '@/lib/ui'
import type { Tone } from '@/lib/cuentas'

const TONOS: Record<string, Tone> = { info: 'info', warning: 'warning', danger: 'danger', success: 'success' }

export default function AvisosBanner({ dark }: { dark: boolean }) {
  const [avisos, setAvisos] = useState<any[]>([])
  const [ocultos, setOcultos] = useState<number[]>([])

  useEffect(() => {
    const supabase = createClient()
    const cargar = async () => {
      const { data } = await supabase
        .from('avisos')
        .select('*')
        .eq('activo', true)
        .order('created_at', { ascending: false })
        .limit(3)
      setAvisos(data || [])
    }
    cargar()
    const canal = supabase
      .channel('avisos-cliente')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'avisos' }, cargar)
      .subscribe()
    return () => {
      supabase.removeChannel(canal)
    }
  }, [])

  const visibles = avisos.filter((a) => !ocultos.includes(a.id))
  if (visibles.length === 0) return null

  return (
    <section className="space-y-2">
      {visibles.map((a) => (
        <div key={a.id} className={`p-4 rounded-2xl border flex items-start gap-3 ${toneClasses(dark, TONOS[a.tipo] || 'info')}`}>
          <Megaphone size={20} className="shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">{a.titulo}</p>
            {a.mensaje && <p className="text-xs mt-0.5 whitespace-pre-line">{a.mensaje}</p>}
          </div>
          <button type="button" onClick={() => setOcultos([...ocultos, a.id])} className="p-1 rounded-lg opacity-70 hover:opacity-100" aria-label="Cerrar aviso">
            <X size={16} />
          </button>
        </div>
      ))}
    </section>
  )
}
