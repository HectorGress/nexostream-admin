'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Sun, Moon, Inbox, Megaphone, Gift } from 'lucide-react'
import { useAdminGuard } from '@/lib/useAdminGuard'
import { makeUi, Skeleton } from '@/lib/ui'
import SolicitudesAdmin from '@/components/admin/SolicitudesAdmin'
import AvisosAdmin from '@/components/admin/AvisosAdmin'
import ReferidosAdmin from '@/components/admin/ReferidosAdmin'
import PushActivar from '@/components/PushActivar'

const TABS = [
  { id: 'solicitudes', nombre: 'Solicitudes de renovación', icono: Inbox },
  { id: 'avisos', nombre: 'Avisos', icono: Megaphone },
  { id: 'referidos', nombre: 'Referidos', icono: Gift },
] as const

export default function CentroPage() {
  const autorizado = useAdminGuard()
  const [darkMode, setDarkMode] = useState(false)
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
            <Link href="/admin/dashboard" className={`p-2.5 rounded-xl border transition ${
              darkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 bg-white hover:bg-slate-50 shadow-sm'
            }`} aria-label="Volver al panel">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Centro del cliente</h1>
              <p className={`text-sm ${ui.muted}`}>Pagos con comprobante, avisos para tus clientes y referidos.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <PushActivar dark={darkMode} rol="admin" />
            <button onClick={() => setDarkMode(!darkMode)} className={ui.btnGhost}>
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
              <span className="hidden sm:inline">{darkMode ? 'Modo claro' : 'Modo oscuro'}</span>
            </button>
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
        {tab === 'avisos' && <AvisosAdmin dark={darkMode} />}
        {tab === 'referidos' && <ReferidosAdmin dark={darkMode} />}
      </div>
    </div>
  )
}
