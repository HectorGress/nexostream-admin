'use client'

import { useEffect, useState } from 'react'
import { Bell, BellRing } from 'lucide-react'
import { auth } from '@/lib/firebase'
import { makeUi, toneClasses } from '@/lib/ui'
import { estadoPush, activarPush, esIPhone } from '@/lib/push'
import type { EstadoPush } from '@/lib/push'

export default function PushActivar({ dark, rol }: { dark: boolean; rol: 'admin' | 'cliente' }) {
  const ui = makeUi(dark)
  const [estado, setEstado] = useState<EstadoPush | null>(null)
  const [cargando, setCargando] = useState(false)

  useEffect(() => {
    estadoPush().then(setEstado).catch(() => setEstado('no-soportado'))
  }, [])

  if (estado === null) return null

  if (estado === 'activo') {
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold ${toneClasses(dark, 'success')}`}>
        <BellRing size={14} /> <span className="hidden sm:inline">Avisos activados</span>
      </span>
    )
  }

  const activar = async () => {
    const uid = auth.currentUser?.uid
    if (!uid) return
    if (estado === 'no-soportado') {
      alert(
        esIPhone()
          ? 'En iPhone: abre esta página en Safari, toca Compartir → "Agregar a pantalla de inicio", abre la app desde ahí y vuelve a tocar este botón.'
          : 'Este navegador no permite notificaciones.'
      )
      return
    }
    if (estado === 'bloqueado') {
      alert('Bloqueaste las notificaciones. Actívalas desde el candado junto a la dirección de la página.')
      return
    }
    setCargando(true)
    try {
      await activarPush(uid, rol)
      setEstado('activo')
    } catch (e: any) {
      alert(e?.message || 'No se pudo activar.')
    }
    setCargando(false)
  }

  return (
    <button onClick={activar} disabled={cargando} className={ui.btnGhost} title="Recibir avisos en este dispositivo">
      <Bell size={16} className={cargando ? 'animate-pulse' : ''} />
      <span className="hidden sm:inline">Activar avisos</span>
    </button>
  )
}
