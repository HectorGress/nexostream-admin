'use client'

import { useMemo, useState } from 'react'
import { X, Loader2, ArrowRightLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { makeUi, toneClasses } from '@/lib/ui'
import { registrarBitacora, siguientePerfilLibre, perfilesPorDefecto } from '@/lib/extras'
import { notificarUsuario } from '@/lib/pushCliente'
import ServicioPunto from '@/components/ServicioPunto'

type Props = {
  madre: any
  madres: any[]
  clientes: any[]
  dark: boolean
  onClose: () => void
  onDone: (texto: string) => void | Promise<void>
}

// Pasa clientes de una cuenta madre a otra (por ejemplo cuando una se cae)
export default function MoverClientes({ madre, madres, clientes, dark, onClose, onDone }: Props) {
  const ui = makeUi(dark)
  const supabase = createClient()

  const delOrigen = useMemo(() => clientes.filter((c) => c.cuenta_madre_id === madre.id), [clientes, madre.id])
  const [marcados, setMarcados] = useState<number[]>(delOrigen.map((c) => c.id))
  const [destinoId, setDestinoId] = useState<string>('')
  const [avisar, setAvisar] = useState(true)
  const [moviendo, setMoviendo] = useState(false)
  const [error, setError] = useState('')

  const ocupados = (id: number) => clientes.filter((c) => c.cuenta_madre_id === id).length
  const libres = (m: any) => (m.max_perfiles || perfilesPorDefecto(m.servicio)) - ocupados(m.id)

  const posibles = madres.filter((m) => m.id !== madre.id && (m.servicio || '').toLowerCase() === (madre.servicio || '').toLowerCase())
  const destino = posibles.find((m) => String(m.id) === destinoId)

  const alternar = (id: number) => setMarcados(marcados.includes(id) ? marcados.filter((x) => x !== id) : [...marcados, id])

  const mover = async () => {
    setError('')
    if (!destino) { setError('Elige la cuenta madre de destino.'); return }
    if (marcados.length === 0) { setError('Marca al menos un cliente.'); return }
    if (marcados.length > libres(destino)) {
      setError(`La cuenta de destino solo tiene ${libres(destino)} perfil(es) libre(s).`)
      return
    }

    setMoviendo(true)
    const usados = clientes.filter((c) => c.cuenta_madre_id === destino.id).map((c) => c.perfil_asignado || '')
    let hechos = 0

    for (const c of delOrigen.filter((x) => marcados.includes(x.id))) {
      const perfilActual = (c.perfil_asignado || '').trim()
      const choca = perfilActual && usados.some((u: string) => u.trim().toLowerCase() === perfilActual.toLowerCase())
      const perfilNuevo = !perfilActual || choca ? siguientePerfilLibre(usados) : perfilActual
      usados.push(perfilNuevo)

      const { error: err } = await supabase
        .from('cuentas_clientes')
        .update({
          cuenta_madre_id: destino.id,
          correo_cuenta: destino.correo,
          contrasena_cuenta: destino.contrasena,
          perfil_asignado: perfilNuevo,
        })
        .eq('id', c.id)
      if (err) { setError(`Se movieron ${hechos}. Falló "${c.nombre_completo}": ${err.message}`); setMoviendo(false); return }
      hechos++
      if (avisar && c.usuario_id) {
        notificarUsuario(c.usuario_id, 'Cambió tu cuenta', `Tu ${c.servicio || 'servicio'} ahora usa otra cuenta. Entra a Mis cuentas para ver tus datos nuevos.`)
      }
    }

    await registrarBitacora('editar', 'cliente', `Movió ${hechos} cliente(s) de ${madre.correo} a ${destino.correo} (${madre.servicio})`)
    setMoviendo(false)
    await onDone(`Listo: ${hechos} cliente(s) pasaron a ${destino.correo}.`)
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-start sm:items-center justify-center p-4 z-50 overflow-y-auto">
      <div className={`border w-full max-w-lg p-6 rounded-2xl shadow-2xl space-y-4 my-8 ${ui.modal}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-lg flex items-center gap-2"><ArrowRightLeft size={18} /> Mover clientes</h3>
            <p className={`text-xs flex items-center gap-1.5 ${ui.muted}`}><ServicioPunto servicio={madre.servicio} /> Desde {madre.correo}</p>
          </div>
          <button type="button" onClick={onClose} className={ui.iconBtn} aria-label="Cerrar"><X size={18} /></button>
        </div>

        {delOrigen.length === 0 ? (
          <p className={`text-sm ${ui.muted}`}>Esta cuenta madre no tiene clientes que mover.</p>
        ) : (
          <>
            <div className="space-y-1.5">
              <p className="text-sm font-semibold">1. ¿A quiénes?</p>
              {delOrigen.map((c) => (
                <label key={c.id} className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer text-sm ${ui.cardInner}`}>
                  <input type="checkbox" checked={marcados.includes(c.id)} onChange={() => alternar(c.id)} className="h-4 w-4 accent-indigo-600" />
                  <span className="flex-1 min-w-0 truncate">{c.nombre_completo || 'Sin nombre'}</span>
                  <span className={`font-mono text-xs ${ui.muted}`}>{c.perfil_asignado || '-'}</span>
                </label>
              ))}
            </div>

            <div className="space-y-1.5">
              <p className="text-sm font-semibold">2. ¿A qué cuenta?</p>
              {posibles.length === 0 ? (
                <p className={`text-sm ${ui.muted}`}>No hay otra cuenta madre de {madre.servicio}. Registra una primero.</p>
              ) : (
                <select value={destinoId} onChange={(e) => setDestinoId(e.target.value)} className={ui.input}>
                  <option value="">Elige una cuenta madre</option>
                  {posibles.map((m) => (
                    <option key={m.id} value={m.id}>{m.correo} · {libres(m)} libre(s)</option>
                  ))}
                </select>
              )}
            </div>

            <label className="flex items-center gap-2.5 text-sm cursor-pointer">
              <input type="checkbox" checked={avisar} onChange={(e) => setAvisar(e.target.checked)} className="h-4 w-4 accent-indigo-600" />
              Avisarles al celular que cambiaron sus datos
            </label>
            <p className={`text-xs ${ui.muted}`}>
              Se actualizan el correo y la contraseña de cada cliente. Si su perfil ya existe en la cuenta nueva, se le asigna el siguiente libre.
            </p>
          </>
        )}

        {error && <div role="alert" className={`p-3 rounded-xl border text-sm ${toneClasses(dark, 'danger')}`}>{error}</div>}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className={ui.btnGhost}>Cancelar</button>
          <button type="button" onClick={mover} disabled={moviendo || delOrigen.length === 0} className={ui.btnPrimary}>
            {moviendo && <Loader2 size={16} className="animate-spin" />} Mover {marcados.length > 0 ? `(${marcados.length})` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
