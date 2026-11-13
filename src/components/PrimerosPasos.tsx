'use client'

import { useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'
import { auth } from '@/lib/firebase'
import { makeUi } from '@/lib/ui'
import { estadoPush, activarPush, esIPhone } from '@/lib/push'

const CLAVE = 'nexo-pasos-ocultos'

type Props = { dark: boolean; perfil: any; cuentas: any[]; onPerfil: () => void }

// Lista de primeros pasos para clientes nuevos (se oculta sola al terminar)
export default function PrimerosPasos({ dark, perfil, cuentas, onPerfil }: Props) {
  const ui = makeUi(dark)
  const [oculto, setOculto] = useState(true)
  const [avisosOk, setAvisosOk] = useState(false)
  const [instalada, setInstalada] = useState(false)
  const [evento, setEvento] = useState<any>(null)
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    try { setOculto(localStorage.getItem(CLAVE) === '1') } catch { setOculto(false) }
    estadoPush().then((e) => setAvisosOk(e === 'activo')).catch(() => undefined)
    setInstalada(window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true)
    const antes = (e: Event) => { e.preventDefault(); setEvento(e) }
    window.addEventListener('beforeinstallprompt', antes)
    return () => window.removeEventListener('beforeinstallprompt', antes)
  }, [])

  const activar = async () => {
    const uid = auth.currentUser?.uid
    if (!uid) return
    const e = await estadoPush()
    if (e === 'no-soportado') {
      alert(esIPhone() ? 'En iPhone primero instala la app: Compartir → "Agregar a pantalla de inicio". Luego ábrela desde ahí y activa los avisos.' : 'Este navegador no permite notificaciones.')
      return
    }
    setOcupado(true)
    try { await activarPush(uid, 'cliente'); setAvisosOk(true) } catch (err: any) { alert(err?.message || 'No se pudo activar.') }
    setOcupado(false)
  }

  const instalar = async () => {
    if (evento) {
      evento.prompt()
      try { await evento.userChoice } catch { /* nada */ }
      setEvento(null)
    } else {
      alert(esIPhone() ? 'En Safari: toca Compartir y luego "Agregar a pantalla de inicio".' : 'En el menú de tu navegador elige "Instalar app" o "Agregar a pantalla de inicio".')
    }
  }

  const boton = (texto: string, fn: () => void) => (
    <button type="button" onClick={fn} disabled={ocupado} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60">
      {texto}
    </button>
  )

  const pasos = [
    { id: 'id', titulo: 'Elige tu nombre e ID', ayuda: 'Así te encontramos para enviarte tus cuentas.', hecho: !!perfil?.cliente_id, accion: boton('Elegir', onPerfil) },
    { id: 'avisos', titulo: 'Activa los avisos', ayuda: 'Te avisamos cuando tu cuenta esté lista o por vencer.', hecho: avisosOk, accion: boton('Activar', activar) },
    { id: 'app', titulo: 'Instala la app', ayuda: 'Entra con un toque desde tu pantalla de inicio.', hecho: instalada, accion: boton('Instalar', instalar) },
    { id: 'cuenta', titulo: 'Recibe tu primera cuenta', ayuda: 'Paga y avisa tu ID: aparecerá aquí sola.', hecho: cuentas.length > 0, accion: null },
  ]
  const hechos = pasos.filter((p) => p.hecho).length

  if (oculto || hechos === pasos.length) return null

  return (
    <section className={`p-5 rounded-2xl border space-y-3 ${ui.card}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Primeros pasos</h2>
          <p className={`text-xs ${ui.muted}`}>{hechos} de {pasos.length} listos</p>
        </div>
        <button
          type="button"
          onClick={() => { try { localStorage.setItem(CLAVE, '1') } catch { /* nada */ } setOculto(true) }}
          className={ui.iconBtn}
          aria-label="Ocultar primeros pasos"
        >
          <X size={16} />
        </button>
      </div>
      <div className={`h-1.5 rounded-full overflow-hidden ${dark ? 'bg-slate-700' : 'bg-slate-200'}`}>
        <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${(hechos / pasos.length) * 100}%` }} />
      </div>
      <ul className="space-y-2">
        {pasos.map((p) => (
          <li key={p.id} className="flex items-center gap-3">
            <span className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${p.hecho ? 'bg-emerald-600 border-emerald-600 text-white' : (dark ? 'border-slate-600' : 'border-slate-300')}`}>
              {p.hecho && <Check size={12} />}
            </span>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${p.hecho ? 'line-through opacity-60' : ''}`}>{p.titulo}</p>
              {!p.hecho && <p className={`text-xs ${ui.muted}`}>{p.ayuda}</p>}
            </div>
            {!p.hecho && p.accion}
          </li>
        ))}
      </ul>
    </section>
  )
}
