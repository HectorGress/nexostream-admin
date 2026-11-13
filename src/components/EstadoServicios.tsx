'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { makeUi } from '@/lib/ui'
import ServicioPunto from '@/components/ServicioPunto'

const ETIQUETA: Record<string, string> = { mantenimiento: 'En mantenimiento', falla: 'Con fallas' }

// Muestra solo lo que no funciona; si todo está bien, una línea discreta
export default function EstadoServicios({ dark }: { dark: boolean }) {
  const ui = makeUi(dark)
  const [filas, setFilas] = useState<any[] | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const cargar = async () => {
      const { data } = await supabase.from('estado_servicios').select('*')
      setFilas(data || [])
    }
    cargar()
    const canal = supabase
      .channel('estado-servicios')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'estado_servicios' }, cargar)
      .subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [])

  if (filas === null) return null
  const problemas = filas.filter((f) => f.estado && f.estado !== 'ok')

  if (problemas.length === 0) {
    return (
      <p className={`text-xs flex items-center gap-1.5 ${ui.muted}`}>
        <CheckCircle2 size={14} className={dark ? 'text-emerald-300' : 'text-emerald-600'} /> Todos los servicios funcionan con normalidad.
      </p>
    )
  }

  return (
    <section className={`p-4 rounded-2xl border space-y-2 ${ui.card}`}>
      <h2 className="text-sm font-semibold">Estado de los servicios</h2>
      {problemas.map((p) => (
        <div key={p.servicio} className="flex items-start gap-2.5 text-sm">
          <span className="mt-1.5"><ServicioPunto servicio={p.servicio} /></span>
          <p>
            <strong>{p.servicio}</strong>{' '}
            <span className={p.estado === 'falla' ? 'text-rose-600' : (dark ? 'text-amber-300' : 'text-amber-700')}>· {ETIQUETA[p.estado] || p.estado}</span>
            {p.nota && <span className={`block text-xs ${ui.muted}`}>{p.nota}</span>}
          </p>
        </div>
      ))}
    </section>
  )
}
