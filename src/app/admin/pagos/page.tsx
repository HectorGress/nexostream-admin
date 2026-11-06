'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronLeft, ChevronRight, RefreshCw, Sun, Moon, Search, Wallet } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { formatearFecha } from '@/lib/cuentas'
import { useAdminGuard } from '@/lib/useAdminGuard'
import { makeUi, toneClasses, Skeleton } from '@/lib/ui'
import { dinero } from '@/lib/extras'

export default function PagosPage() {
  const autorizado = useAdminGuard()
  const supabase = createClient()

  const [darkMode, setDarkMode] = useState(false)
  const [mes, setMes] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [pagos, setPagos] = useState<any[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState('')

  const ui = makeUi(darkMode)

  const cargar = async () => {
    setCargando(true)
    setErrorCarga('')
    const inicio = new Date(mes.getFullYear(), mes.getMonth(), 1)
    const fin = new Date(mes.getFullYear(), mes.getMonth() + 1, 1)
    const { data, error } = await supabase
      .from('pagos')
      .select('*')
      .gte('created_at', inicio.toISOString())
      .lt('created_at', fin.toISOString())
      .order('created_at', { ascending: false })
    if (error) setErrorCarga(error.message)
    setPagos(data || [])
    setCargando(false)
  }

  useEffect(() => {
    if (autorizado) cargar()
  }, [autorizado, mes])

  const cambiarMes = (delta: number) => setMes(new Date(mes.getFullYear(), mes.getMonth() + delta, 1))

  const q = busqueda.trim().toLowerCase()
  const visibles = pagos.filter((p) =>
    !q || [p.cliente_nombre, p.servicio, p.nota, p.admin_email].some((v: any) => String(v || '').toLowerCase().includes(q))
  )

  const total = visibles.reduce((t, p) => t + Number(p.monto || 0), 0)
  const porServicio: Record<string, number> = {}
  visibles.forEach((p) => {
    const k = p.servicio || 'Otro'
    porServicio[k] = (porServicio[k] || 0) + Number(p.monto || 0)
  })

  if (!autorizado) {
    return (
      <div className={`min-h-screen p-4 md:p-8 ${ui.page}`}>
        <div className="max-w-5xl mx-auto space-y-4">
          <Skeleton dark={darkMode} className="h-10 w-64" />
          <Skeleton dark={darkMode} className="h-24 w-full" />
          <Skeleton dark={darkMode} className="h-64 w-full" />
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
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Wallet size={22} /> Pagos</h1>
              <p className={`text-sm ${ui.muted}`}>Cada renovación y cada pago inicial queda registrado aquí.</p>
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

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div className={`inline-flex items-center gap-1 rounded-xl border px-1 py-1 ${ui.card}`}>
            <button onClick={() => cambiarMes(-1)} className={ui.iconBtn} aria-label="Mes anterior"><ChevronLeft size={18} /></button>
            <span className="w-44 text-center font-semibold capitalize">
              {mes.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={() => cambiarMes(1)} className={ui.iconBtn} aria-label="Mes siguiente"><ChevronRight size={18} /></button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${ui.muted}`} />
            <input
              type="text"
              placeholder="Buscar cliente, servicio o nota"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className={`${ui.input} pl-10`}
            />
          </div>
        </div>

        {errorCarga && (
          <div role="alert" className={`p-3 rounded-xl border text-sm ${toneClasses(darkMode, 'danger')}`}>
            No se pudieron cargar los pagos: {errorCarga}. ¿Ya corriste el SQL en Supabase?
          </div>
        )}

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className={`col-span-2 p-4 rounded-2xl border ${ui.card}`}>
            <p className={`text-xs ${ui.muted}`}>Total del mes</p>
            <p className={`text-3xl font-bold ${darkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>{dinero(total)}</p>
            <p className={`text-xs mt-1 ${ui.muted}`}>{visibles.length} pago(s)</p>
          </div>
          {Object.entries(porServicio).map(([servicio, monto]) => (
            <div key={servicio} className={`p-4 rounded-2xl border ${ui.card}`}>
              <p className={`text-xs ${ui.muted}`}>{servicio}</p>
              <p className="text-xl font-bold">{dinero(monto)}</p>
            </div>
          ))}
        </section>

        <div className={`border rounded-2xl overflow-hidden ${ui.card}`}>
          {cargando ? (
            <div className="p-4 space-y-3">
              {[0, 1, 2].map((i) => <Skeleton key={i} dark={darkMode} className="h-12 w-full" />)}
            </div>
          ) : visibles.length === 0 ? (
            <p className={`text-center text-sm py-14 ${ui.muted}`}>No hay pagos registrados en este mes.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[720px]">
                <thead className={`${ui.thead} border-b text-xs font-semibold`}>
                  <tr>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Servicio</th>
                    <th className="px-4 py-3">Días</th>
                    <th className="px-4 py-3">Nuevo vencimiento</th>
                    <th className="px-4 py-3 text-right">Monto</th>
                    <th className="px-4 py-3">Lo registró</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${ui.divide}`}>
                  {visibles.map((p) => (
                    <tr key={p.id} className={ui.rowHover}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {new Date(p.created_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        {p.cliente_nombre}
                        {p.nota && <div className={`text-[11px] font-normal ${ui.muted}`}>{p.nota}</div>}
                      </td>
                      <td className="px-4 py-3">{p.servicio || '-'}</td>
                      <td className="px-4 py-3">{p.dias}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{formatearFecha(p.nuevo_vencimiento)}</td>
                      <td className={`px-4 py-3 text-right font-semibold whitespace-nowrap ${darkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>
                        {dinero(p.monto)}
                      </td>
                      <td className={`px-4 py-3 text-xs ${ui.muted}`}>{p.admin_email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
