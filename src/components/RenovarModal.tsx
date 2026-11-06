'use client'

import { useState } from 'react'
import { X, Loader2, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { formatearFecha } from '@/lib/cuentas'
import { makeUi, toneClasses } from '@/lib/ui'
import {
  sumarDiasISO, diasHasta, hoyLocalISO, dinero, registrarPago, registrarBitacora
} from '@/lib/extras'

type Props = {
  item: any
  dark: boolean
  onClose: () => void
  onDone: (texto: string) => void | Promise<void>
}

export default function RenovarModal({ item, dark, onClose, onDone }: Props) {
  const ui = makeUi(dark)
  const supabase = createClient()

  const [dias, setDias] = useState<number | string>(30)
  const [monto, setMonto] = useState<number | string>(item.precio_suscripcion ?? 0)
  const [nota, setNota] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  // Si todavía está vigente, los días se suman al vencimiento actual.
  // Si ya venció, se cuentan desde hoy.
  const vigente = !!item.fecha_vencimiento && diasHasta(item.fecha_vencimiento) >= 0
  const base: string = vigente ? item.fecha_vencimiento : hoyLocalISO()
  const diasNum = Math.max(0, Math.floor(Number(dias) || 0))
  const nuevoVenc = sumarDiasISO(base, diasNum)

  const confirmar = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (diasNum < 1) { setError('Escribe cuántos días vas a sumar.'); return }
    const montoNum = Number(monto)
    if (isNaN(montoNum) || montoNum < 0) { setError('El monto debe ser un número mayor o igual a 0.'); return }

    setGuardando(true)

    const { error: errUpd } = await supabase
      .from('cuentas_clientes')
      .update({ fecha_vencimiento: nuevoVenc })
      .eq('id', item.id)

    if (errUpd) {
      setError(`No se pudo renovar: ${errUpd.message}`)
      setGuardando(false)
      return
    }

    const errPago = await registrarPago({
      clienteId: item.id,
      nombre: item.nombre_completo,
      servicio: item.servicio,
      monto: montoNum,
      dias: diasNum,
      nuevoVencimiento: nuevoVenc,
      nota: nota.trim(),
    })

    await registrarBitacora(
      'renovar',
      'cliente',
      `${item.nombre_completo || 'Cliente'} (${item.servicio || ''}) +${diasNum} días, vence ${formatearFecha(nuevoVenc)} · ${dinero(montoNum)}`
    )

    setGuardando(false)

    if (errPago) {
      alert(`⚠️ La fecha sí se actualizó, pero el pago no se pudo guardar en el historial: ${errPago.message}`)
    }

    await onDone(`Renovado: ${item.nombre_completo || 'cliente'} vence el ${formatearFecha(nuevoVenc)}.`)
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-start sm:items-center justify-center p-4 z-50 overflow-y-auto">
      <form onSubmit={confirmar} className={`border w-full max-w-sm p-6 rounded-2xl shadow-2xl space-y-4 my-8 ${ui.modal}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-lg flex items-center gap-2"><RefreshCw size={18} /> Renovar</h3>
            <p className={`text-xs ${ui.muted}`}>
              {item.nombre_completo || 'Cliente'} · {item.servicio || 'Servicio'}
            </p>
          </div>
          <button type="button" onClick={onClose} className={ui.iconBtn} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-1">
          <span className={`text-xs font-medium ${dark ? 'text-slate-300' : 'text-slate-600'}`}>Días a sumar</span>
          <div className="flex gap-2">
            {[30, 60, 90].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDias(d)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition ${
                  diasNum === d
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : (dark ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600')
                }`}
              >
                +{d}
              </button>
            ))}
          </div>
          <input type="number" min="1" value={dias} onChange={(e) => setDias(e.target.value)} className={ui.input} />
        </div>

        <label className="block space-y-1">
          <span className={`text-xs font-medium ${dark ? 'text-slate-300' : 'text-slate-600'}`}>Monto cobrado (MXN)</span>
          <input type="number" min="0" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} className={ui.input} />
        </label>

        <label className="block space-y-1">
          <span className={`text-xs font-medium ${dark ? 'text-slate-300' : 'text-slate-600'}`}>Nota (opcional)</span>
          <input type="text" placeholder="Ej. Pagó por transferencia" value={nota} onChange={(e) => setNota(e.target.value)} className={ui.input} />
        </label>

        <div className={`p-3.5 rounded-xl border text-sm ${ui.cardInner}`}>
          <p className={`text-xs ${ui.muted}`}>
            {vigente ? 'Vence ahora' : 'Ya venció'}: {formatearFecha(item.fecha_vencimiento)}
          </p>
          <p className={`text-base font-bold mt-0.5 ${dark ? 'text-emerald-300' : 'text-emerald-700'}`}>
            Nuevo vencimiento: {formatearFecha(nuevoVenc)}
          </p>
        </div>

        {error && (
          <div role="alert" className={`p-3 rounded-xl border text-sm ${toneClasses(dark, 'danger')}`}>{error}</div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className={ui.btnGhost}>Cancelar</button>
          <button type="submit" disabled={guardando} className={ui.btnPrimary}>
            {guardando && <Loader2 size={16} className="animate-spin" />}
            Confirmar renovación
          </button>
        </div>
      </form>
    </div>
  )
}
