'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { createClient } from '@/lib/supabase'
import type { Tone } from '@/lib/cuentas'
import { Sun, Moon, Check, ArrowLeft, RefreshCw, Inbox, LifeBuoy, Clock, CheckCircle2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'

/* ───────────────────────── Helpers (sin lógica de negocio) ───────────────────────── */

// El título del reporte se guarda como primera línea de descripcion_problema
// (la tabla "reportes" no tiene columna "titulo")
const getTituloReporte = (rep: any) => {
  if (rep.titulo) return rep.titulo
  const desc: string = rep.descripcion_problema || rep.descripcion || ''
  if (desc.includes('\n')) return desc.split('\n')[0]
  return 'Reporte de soporte'
}

const getDescripcionReporte = (rep: any) => {
  const desc: string = rep.descripcion_problema || rep.descripcion || ''
  if (rep.titulo) return desc
  if (desc.includes('\n')) return desc.split('\n').slice(1).join('\n')
  return desc
}

const toneClasses = (dark: boolean, tone: Tone) => {
  const map: Record<Tone, string> = {
    success: dark ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: dark ? 'bg-amber-500/10 text-amber-300 border-amber-500/30' : 'bg-amber-50 text-amber-700 border-amber-200',
    danger: dark ? 'bg-rose-500/10 text-rose-300 border-rose-500/30' : 'bg-rose-50 text-rose-700 border-rose-200',
    info: dark ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30' : 'bg-indigo-50 text-indigo-700 border-indigo-200',
    neutral: dark ? 'bg-slate-500/10 text-slate-300 border-slate-500/30' : 'bg-slate-100 text-slate-600 border-slate-200',
  }
  return map[tone]
}

/* ───────────────────────── Componentes de UI ───────────────────────── */

const Pill = ({ dark, tone, children }: { dark: boolean; tone: Tone; children: React.ReactNode }) => (
  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold whitespace-nowrap capitalize ${toneClasses(dark, tone)}`}>
    {children}
  </span>
)

const Skeleton = ({ dark, className = '' }: { dark: boolean; className?: string }) => (
  <div className={`animate-pulse rounded-xl ${dark ? 'bg-slate-800' : 'bg-slate-200'} ${className}`} />
)

const KpiCard = ({
  dark, icon: Icon, label, value, tone
}: { dark: boolean; icon: LucideIcon; label: string; value: number | string; tone: Tone }) => (
  <div className={`p-4 rounded-2xl border flex items-center gap-4 ${dark ? 'bg-slate-800/70 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
    <div className={`w-11 h-11 shrink-0 rounded-xl border flex items-center justify-center ${toneClasses(dark, tone)}`}>
      <Icon size={20} />
    </div>
    <div className="min-w-0">
      <p className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{label}</p>
      <p className="text-2xl font-bold leading-tight">{value}</p>
    </div>
  </div>
)

/* ───────────────────────── Página ───────────────────────── */

export default function AdminReportesPage() {
  const [darkMode, setDarkMode] = useState(false)
  const [reportes, setReportes] = useState<any[]>([])
  const [soluciones, setSoluciones] = useState<{ [key: number]: string }>({})
  const [cargando, setCargando] = useState(true)
  const [autorizado, setAutorizado] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  // Solo administradores: se valida sesión y rol antes de mostrar o cargar nada
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.push('/login')
        return
      }

      const { data: perfilAdmin } = await supabase
        .from('profiles')
        .select('rol')
        .eq('id', u.uid)
        .maybeSingle()

      if (perfilAdmin?.rol !== 'admin') {
        router.push('/cliente/dashboard')
        return
      }

      setAutorizado(true)
      cargarReportes()
    })
    return () => unsub()
  }, [router])

  // Actualización en vivo: cuando llega o cambia un reporte, la lista se recarga sola.
  // Respaldo: cada 30 s y al volver a la pestaña.
  useEffect(() => {
    if (!autorizado) return

    let timer: ReturnType<typeof setTimeout> | null = null
    const refrescar = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => { cargarReportes() }, 300)
    }

    const channel = supabase
      .channel('admin-reportes-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reportes' }, refrescar)
      .subscribe()

    const intervalo = setInterval(() => {
      if (document.visibilityState === 'visible') cargarReportes()
    }, 30000)

    const alVolver = () => {
      if (document.visibilityState === 'visible') cargarReportes()
    }
    document.addEventListener('visibilitychange', alVolver)

    return () => {
      if (timer) clearTimeout(timer)
      clearInterval(intervalo)
      document.removeEventListener('visibilitychange', alVolver)
      supabase.removeChannel(channel)
    }
  }, [autorizado])

  const cargarReportes = async () => {
    setCargando(true)
    const { data } = await supabase
      .from('reportes')
      .select('*')
      .order('created_at', { ascending: false })
    setReportes(data || [])
    setCargando(false)
  }

  const responderReporte = async (id: number) => {
    const solucionTexto = (soluciones[id] || '').trim()
    if (!solucionTexto) return

    const { error } = await supabase
      .from('reportes')
      .update({
        solucion: solucionTexto,
        estado: 'Resuelto',
        atendido: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      alert(`❌ No se pudo responder el reporte: ${error.message}`)
      return
    }

    setSoluciones({ ...soluciones, [id]: '' })
    cargarReportes()
  }

  /* ───────── Tokens visuales ───────── */
  const ui = {
    page: darkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900',
    card: darkMode ? 'bg-slate-800/70 border-slate-700' : 'bg-white border-slate-200 shadow-sm',
    muted: darkMode ? 'text-slate-400' : 'text-slate-500',
    border: darkMode ? 'border-slate-700' : 'border-slate-200',
    input: `flex-1 w-full px-3.5 py-2.5 rounded-xl text-sm border outline-none transition focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 ${
      darkMode ? 'bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
    }`,
    btnGhost: `inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium border transition ${
      darkMode ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm'
    }`,
  }

  /* ───────── Datos derivados ───────── */
  const total = reportes.length
  const atendidos = reportes.filter(r => r.atendido).length
  const pendientes = total - atendidos

  // Mientras se valida la sesión y el rol
  if (!autorizado) {
    return (
      <div className={`min-h-screen p-4 md:p-8 ${ui.page}`}>
        <div className="max-w-5xl mx-auto space-y-6">
          <Skeleton dark={darkMode} className="h-10 w-72" />
          <div className="grid grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => <Skeleton key={i} dark={darkMode} className="h-24" />)}
          </div>
          {[0, 1].map((i) => <Skeleton key={i} dark={darkMode} className="h-44 w-full" />)}
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
              <h1 className="text-2xl font-bold tracking-tight">Atención de reportes</h1>
              <p className={`text-sm ${ui.muted}`}>Responde a tus clientes y marca cada reporte como resuelto.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={cargarReportes} className={ui.btnGhost} title="Actualizar reportes">
              <RefreshCw size={16} className={cargando ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>
            <button onClick={() => setDarkMode(!darkMode)} className={ui.btnGhost}>
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
              <span className="hidden sm:inline">{darkMode ? 'Modo claro' : 'Modo oscuro'}</span>
            </button>
          </div>
        </header>

        {/* KPIs */}
        <section className="grid grid-cols-3 gap-3 sm:gap-4">
          <KpiCard dark={darkMode} icon={LifeBuoy} tone="info" label="Total" value={total} />
          <KpiCard dark={darkMode} icon={Clock} tone={pendientes > 0 ? 'warning' : 'neutral'} label="Pendientes" value={pendientes} />
          <KpiCard dark={darkMode} icon={CheckCircle2} tone="success" label="Resueltos" value={atendidos} />
        </section>

        <main className="space-y-4">
          {cargando && reportes.length === 0 ? (
            <div className="space-y-4">
              {[0, 1, 2].map((i) => <Skeleton key={i} dark={darkMode} className="h-44 w-full" />)}
            </div>
          ) : reportes.length === 0 ? (
            <div className={`border rounded-2xl flex flex-col items-center text-center py-16 px-6 ${ui.card}`}>
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${darkMode ? 'bg-indigo-500/10 text-indigo-300' : 'bg-indigo-50 text-indigo-600'}`}>
                <Inbox size={26} />
              </div>
              <h3 className="font-semibold text-sm">Sin reportes por ahora</h3>
              <p className={`text-xs mt-1 max-w-xs ${ui.muted}`}>Cuando un cliente envíe un reporte aparecerá aquí al instante.</p>
            </div>
          ) : (
            reportes.map((rep) => {
              const estadoTexto = (rep.estado || 'Pendiente') as string
              const tone: Tone = rep.atendido ? 'success' : estadoTexto.toLowerCase() === 'en proceso' ? 'info' : 'warning'
              return (
                <div key={rep.id} className={`p-5 border rounded-2xl space-y-3 ${ui.card}`}>
                  <div className="flex justify-between items-start gap-3">
                    <div className="min-w-0">
                      <span className="font-semibold text-base block">{getTituloReporte(rep)}</span>
                      <p className={`text-xs mt-0.5 ${ui.muted}`}>
                        <span className="font-medium">{rep.nombre_cliente}</span> · Cuenta: {rep.correo_cuenta} · Clave: {rep.contrasena_cuenta}
                      </p>
                    </div>
                    <Pill dark={darkMode} tone={tone}>{estadoTexto}</Pill>
                  </div>

                  <div className={`p-3.5 rounded-xl text-sm border ${
                    darkMode ? 'bg-slate-900/60 border-slate-700 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}>
                    <strong>Falla reportada:</strong> <span className="whitespace-pre-line">{getDescripcionReporte(rep)}</span>
                  </div>

                  {rep.solucion && (
                    <div className={`p-3.5 rounded-xl text-sm border ${toneClasses(darkMode, 'success')}`}>
                      <strong>Solución enviada:</strong> {rep.solucion}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="Escribe la solución para el cliente..."
                      value={soluciones[rep.id] || ''}
                      onChange={(e) => setSoluciones({ ...soluciones, [rep.id]: e.target.value })}
                      className={ui.input}
                    />
                    <button
                      onClick={() => responderReporte(rep.id)}
                      className="bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold px-4 py-2.5 rounded-xl text-sm inline-flex items-center justify-center gap-1.5 transition shadow-sm shrink-0 active:scale-[0.98]"
                    >
                      <Check size={16} /> Responder y resolver
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </main>
      </div>
    </div>
  )
}
