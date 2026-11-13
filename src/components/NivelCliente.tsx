'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { makeUi } from '@/lib/ui'
import { nivelPorMeses, mesesDesde } from '@/lib/configExtra'

// Nivel del cliente según cuánto tiempo lleva con nosotros
export default function NivelCliente({ uid, dark }: { uid: string; dark: boolean }) {
  const ui = makeUi(dark)
  const [meses, setMeses] = useState<number | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('cuentas_clientes')
      .select('fecha_adquisicion')
      .eq('usuario_id', uid)
      .order('fecha_adquisicion', { ascending: true })
      .limit(1)
      .then(({ data }: any) => setMeses(data?.[0]?.fecha_adquisicion ? mesesDesde(data[0].fecha_adquisicion) : 0))
  }, [uid])

  if (meses === null) return null
  const { actual, siguiente } = nivelPorMeses(meses)
  const avance = siguiente ? Math.min(100, ((meses - actual.desde) / (siguiente.desde - actual.desde)) * 100) : 100

  return (
    <section className={`p-5 rounded-2xl border flex flex-wrap items-center gap-x-6 gap-y-3 ${ui.card}`}>
      <div>
        <p className={`text-[11px] uppercase tracking-wide ${ui.muted}`}>Tu nivel</p>
        <p className="text-2xl font-bold leading-tight" style={{ fontFamily: 'var(--font-display)' }}>{actual.nombre}</p>
        <p className={`text-xs ${ui.muted}`}>{meses} {meses === 1 ? 'mes' : 'meses'} con nosotros</p>
      </div>
      <div className="flex-1 min-w-[200px] space-y-1.5">
        <div className={`h-1.5 rounded-full overflow-hidden ${dark ? 'bg-slate-700' : 'bg-slate-200'}`}>
          <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${avance}%` }} />
        </div>
        <p className="text-xs">
          {actual.extra > 0 && <span className={`font-semibold ${dark ? 'text-emerald-300' : 'text-emerald-700'}`}>{Math.round(actual.extra * 100)}% extra de descuento al renovar. </span>}
          {siguiente ? (
            <span className={ui.muted}>
              Con {siguiente.desde} meses llegas a “{siguiente.nombre}”{siguiente.extra > 0 ? ` y ganas ${Math.round(siguiente.extra * 100)}% extra al renovar` : ''}.
            </span>
          ) : (
            <span className={ui.muted}>Ya estás en el nivel más alto. ¡Gracias por quedarte!</span>
          )}
        </p>
      </div>
    </section>
  )
}
