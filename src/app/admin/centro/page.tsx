'use client'

import { useState } from 'react'
import { useTema } from '@/lib/useTema'
import { Inbox, Megaphone, Gift, ShoppingBag, Activity } from 'lucide-react'
import { useAdminGuard } from '@/lib/useAdminGuard'
import { makeUi, Skeleton } from '@/lib/ui'
import SolicitudesAdmin from '@/components/admin/SolicitudesAdmin'
import AvisosAdmin from '@/components/admin/AvisosAdmin'
import ReferidosAdmin from '@/components/admin/ReferidosAdmin'
import PedidosAdmin from '@/components/admin/PedidosAdmin'
import EstadoServiciosAdmin from '@/components/admin/EstadoServiciosAdmin'
import PushActivar from '@/components/PushActivar'

const TABS = [
  { id: 'solicitudes', nombre: 'Solicitudes de renovación', icono: Inbox },
  { id: 'pedidos', nombre: 'Pedidos', icono: ShoppingBag },
  { id: 'avisos', nombre: 'Avisos', icono: Megaphone },
  { id: 'estado', nombre: 'Estado de servicios', icono: Activity },
  { id: 'referidos', nombre: 'Referidos', icono: Gift },
] as const

export default function CentroPage() {
  const autorizado = useAdminGuard()
  const [darkMode] = useTema()
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('solicitudes')
  const ui = makeUi(darkMode)

  if (!autorizado) {
    return (
      <div className={`min-h-screen p-4 md:p-8 ${ui.page}`}>
        <div className="max-w-4xl mx-auto space-y-4">
          <Skeleton dark={darkMode} className="h-10 w-64" />
          <Skeleton dark={darkMode} className="h-40 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen transition-colors duration-200 p-4 md:p-8 ${ui.page}`}>
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Centro del cliente</h1>
              <p className={`text-sm ${ui.muted}`}>Pagos con comprobante, pedidos, avisos, estado de servicios y referidos.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <PushActivar dark={darkMode} rol="admin" />
          </div>
        </header>

        <nav className={`flex overflow-x-auto gap-1 border-b ${ui.border}`}>
          {TABS.map((t) => {
            const activo = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`whitespace-nowrap inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition ${
                  activo
                    ? (darkMode ? 'border-indigo-400 text-indigo-300' : 'border-indigo-600 text-indigo-700')
                    : `border-transparent ${ui.muted}`
                }`}
              >
                <t.icono size={16} /> {t.nombre}
              </button>
            )
          })}
        </nav>

        {tab === 'solicitudes' && <SolicitudesAdmin dark={darkMode} />}
        {tab === 'pedidos' && <PedidosAdmin dark={darkMode} />}
        {tab === 'avisos' && <AvisosAdmin dark={darkMode} />}
        {tab === 'estado' && <EstadoServiciosAdmin dark={darkMode} />}
        {tab === 'referidos' && <ReferidosAdmin dark={darkMode} />}
      </div>
    </div>
  )
}
