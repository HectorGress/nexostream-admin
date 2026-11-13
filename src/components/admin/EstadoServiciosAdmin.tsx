'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { makeUi } from '@/lib/ui'
import { SERVICIOS } from '@/lib/configExtra'
import ServicioPunto from '@/components/ServicioPunto'

const ESTADOS = [
  { valor: 'ok', texto: 'Funciona' },
  { valor: 'mantenimiento', texto: 'Mantenimiento' },
  { valor: 'falla', texto: 'Con fallas' },
]

export default function EstadoServiciosAdmin({ dark }: { dark: boolean }) {
  const ui = makeUi(dark)
  const supabase = createClient()
  const [filas, setFilas] = useState<Record<string, any>>({})
  const [notas, setNotas] = useState<Record<string, string>>({})

  const cargar = async () => {
    const { data } = await supabase.from('estado_servicios').select('*')
    const m: Record<string, any> = {}
    const n: Record<string, string> = {}
    ;(data || []).forEach((f: any) => { m[f.servicio] = f; n[f.servicio] = f.nota || '' })
    setFilas(m)
    setNotas(n)
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const guardar = async (servicio: string, estado: string, nota: string) => {
    const { error } = await supabase
      .from('estado_servicios')
      .upsert([{ servicio, estado, nota: nota.trim() || null, updated_at: new Date().toISOString() }], { onConflict: 'servicio' })
    if (error) { alert(`❌ ${error.message}`); return }
    cargar()
  }

  return (
    <div className="space-y-3">
      <p className={`text-sm ${ui.muted}`}>Marca lo que no funciona y tus clientes lo ven en su Inicio, así no te escriben todos por lo mismo.</p>
      {SERVICIOS.map((s) => {
        const estado = filas[s]?.estado || 'ok'
        return (
          <div key={s} className={`p-3.5 border rounded-xl flex flex-wrap items-center gap-3 ${ui.card}`}>
            <span className="flex items-center gap-2 w-36 font-semibold text-sm"><ServicioPunto servicio={s} /> {s}</span>
            <div className="flex gap-1.5">
              {ESTADOS.map((e) => (
                <button
                  key={e.valor}
                  type="button"
                  onClick={() => guardar(s, e.valor, notas[s] || '')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                    estado === e.valor
                      ? (e.valor === 'ok' ? 'bg-emerald-600 border-emerald-600 text-white' : e.valor === 'falla' ? 'bg-rose-600 border-rose-600 text-white' : 'bg-amber-500 border-amber-500 text-white')
                      : (dark ? 'border-slate-600 text-slate-300' : 'border-slate-300 text-slate-600')
                  }`}
                >
                  {e.texto}
                </button>
              ))}
            </div>
            {estado !== 'ok' && (
              <input
                type="text"
                placeholder="Nota para el cliente (opcional)"
                value={notas[s] || ''}
                onChange={(e) => setNotas({ ...notas, [s]: e.target.value })}
                onBlur={() => guardar(s, estado, notas[s] || '')}
                className={`${ui.input} flex-1 min-w-[200px]`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
