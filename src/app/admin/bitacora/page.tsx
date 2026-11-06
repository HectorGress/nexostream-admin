'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, RefreshCw, Sun, Moon, History } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useAdminGuard } from '@/lib/useAdminGuard'
import { makeUi, toneClasses, Pill, Skeleton } from '@/lib/ui'
import type { Tone } from '@/lib/cuentas'

const TONOS: Record<string, Tone> = {
  crear: 'success',
  editar: 'info',
  renovar: 'success',
  liberar: 'warning',
  borrar: 'danger',
}

export default function BitacoraPage() {
  const autorizado = useAdminGuard()
  const supabase = createClient()

  const [darkMode, setDarkMode] = useState(false)
  const [registros, setRegistros] = useState<any[]>([])
  const [filtroAccion, setFiltroAccion] = useState('todas')
  const [filtroAdmin, setFiltroAdmin] = useState('todos')
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState('')

  const ui = makeUi(darkMode)

  const cargar = async () => {
    setCargando(true)
    setErrorCarga('')
    const { data, error } = await supabase
      .from('bitacora')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(300)
    if (error) setErrorCarga(error.message)
    setRegistros(data || [])
    setCargando(false)
  }

  useEffect(() => {
    if (autorizado) cargar()
  }, [autorizado])

  const admins = Array.from(new Set(registros.map((r) => r.admin_email).filter(Boolean)))
  const visibles = registros
    .filter((r) => filtroAccion === 'todas' || r.accion === filtroAccion)
    .filter((r) => filtroAdmin === 'todos' || r.admin_email === filtroAdmin)

  if (!autorizado) {
    return (
      <div className={`min-h-screen p-4 md:p-8 ${ui.page}`}>
        <div className="max-w-5xl mx-auto space-y-4">
          <Skeleton dark={darkMode} className="h-10 w-64" />
          <Skeleton dark={darkMode} className="h-16 w-full" />
          <Skeleton dark={darkMode} className="h-16 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen transition-colors duration-200 p-4 md:p-8 ${ui.page}`}>
      <div className="max-w-5xl mx-auto space-y-6">

        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard" className={`p-2.5 rounded-xl border transition ${
              darkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 bg-white hover:bg-slate-50 shadow-sm'
            }`} aria-label="Volver al panel">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><History size={22} /> Bitácora</h1>
              <p className={`text-sm ${ui.muted}`}>Quién creó, editó, renovó, liberó o borró algo, y cuándo.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={cargar} className={ui.btnGhost} title="Actualizar">
              <RefreshCw size={16} className={cargando ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>
            <button onClick={() => setDarkMode(!darkMode)} className={ui.btnGhost}>
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
              <span className="hidden sm:inline">{darkMode ? 'Modo claro' : 'Modo oscuro'}</span>
            </button>
          </div>
        </header>

        <div className="flex flex-wrap gap-3">
          <select value={filtroAccion} onChange={(e) => setFiltroAccion(e.target.value)} className={`${ui.input} sm:w-auto`}>
            <option value="todas">Todas las acciones</option>
            {Object.keys(TONOS).map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={filtroAdmin} onChange={(e) => setFiltroAdmin(e.target.value)} className={`${ui.input} sm:w-auto`}>
            <option value="todos">Todos los administradores</option>
            {admins.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        {errorCarga && (
          <div role="alert" className={`p-3 rounded-xl border text-sm ${toneClasses(darkMode, 'danger')}`}>
            No se pudo cargar la bitácora: {errorCarga}. ¿Ya corriste el SQL en Supabase?
          </div>
        )}

        {cargando ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} dark={darkMode} className="h-16 w-full" />)}
          </div>
        ) : visibles.length === 0 ? (
          <div className={`border rounded-2xl text-center text-sm py-14 ${ui.card} ${ui.muted}`}>
            Todavía no hay actividad registrada.
          </div>
        ) : (
          <div className="space-y-2">
            {visibles.map((r) => (
              <div key={r.id} className={`p-3.5 border rounded-xl flex flex-wrap items-center gap-3 ${ui.card}`}>
                <Pill dark={darkMode} tone={TONOS[r.accion] || 'neutral'}>{r.accion}</Pill>
                <span className={`text-xs ${ui.muted}`}>{r.entidad === 'cuenta_madre' ? 'cuenta madre' : r.entidad}</span>
                <p className="text-sm flex-1 min-w-[200px]">{r.detalle}</p>
                <div className={`text-right text-xs ${ui.muted}`}>
                  <p>{r.admin_email}</p>
                  <p>{new Date(r.created_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
