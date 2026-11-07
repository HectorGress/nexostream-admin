'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { createClient } from '@/lib/supabase'
import {
  getSemaforoStatus, formatearFecha, textoDias, normalizarUrl, validarClienteId
} from '@/lib/cuentas'
import type { Tone } from '@/lib/cuentas'
import {
  Sun, Moon, LogOut, Copy, Check, Landmark, Sparkles, UserRound, Crown, LifeBuoy,
  Send, Search, Inbox, SearchX, Lightbulb, Loader2, Home, Tv, Eye, EyeOff,
  ExternalLink, KeyRound, X, AtSign, AlertCircle
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/* ───────────────────────── Helpers visuales ───────────────────────── */

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
  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold whitespace-nowrap ${toneClasses(dark, tone)}`}>
    {children}
  </span>
)

const Skeleton = ({ dark, className = '' }: { dark: boolean; className?: string }) => (
  <div className={`animate-pulse rounded-xl ${dark ? 'bg-slate-800' : 'bg-slate-200'} ${className}`} />
)

const EmptyState = ({
  dark, icon: Icon, title, text, action
}: { dark: boolean; icon: LucideIcon; title: string; text: string; action?: React.ReactNode }) => (
  <div className="flex flex-col items-center justify-center text-center py-10 px-6">
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${dark ? 'bg-indigo-500/10 text-indigo-300' : 'bg-indigo-50 text-indigo-600'}`}>
      <Icon size={22} />
    </div>
    <h3 className="font-semibold text-sm">{title}</h3>
    <p className={`text-xs mt-1 max-w-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{text}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>
)

const KpiCard = ({
  dark, icon: Icon, label, value, hint, tone
}: { dark: boolean; icon: LucideIcon; label: string; value: number | string; hint?: string; tone: Tone }) => (
  <div className={`p-4 rounded-2xl border flex items-center gap-4 ${dark ? 'bg-slate-800/70 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
    <div className={`w-11 h-11 shrink-0 rounded-xl border flex items-center justify-center ${toneClasses(dark, tone)}`}>
      <Icon size={20} />
    </div>
    <div className="min-w-0">
      <p className={`text-xs ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{label}</p>
      <p className="text-2xl font-bold leading-tight">{value}</p>
      {hint && <p className={`text-[11px] ${dark ? 'text-slate-500' : 'text-slate-400'}`}>{hint}</p>}
    </div>
  </div>
)

const Field = ({ label, dark, children }: { label: string; dark: boolean; children: React.ReactNode }) => (
  <label className="block space-y-1">
    <span className={`text-xs font-medium ${dark ? 'text-slate-300' : 'text-slate-600'}`}>{label}</span>
    {children}
  </label>
)

/* ───────────────────────── Página ───────────────────────── */

export default function ClienteDashboard() {
  const [user, setUser] = useState<any>(null)
  const [catalogo, setCatalogo] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [tab, setTab] = useState<'inicio' | 'cuentas' | 'soporte'>('inicio')

  // Perfil del cliente (nombre + ID único)
  const [perfil, setPerfil] = useState<any>(null)
  const [perfilCargado, setPerfilCargado] = useState(false)
  const [modalPerfil, setModalPerfil] = useState(false)
  const [perfilNombre, setPerfilNombre] = useState('')
  const [perfilId, setPerfilId] = useState('')
  const [perfilError, setPerfilError] = useState('')
  const [guardandoPerfil, setGuardandoPerfil] = useState(false)

  // Cuentas adquiridas
  const [misCuentas, setMisCuentas] = useState<any[]>([])
  const [mostrarPass, setMostrarPass] = useState<{ [key: string]: boolean }>({})
  const [copiedField, setCopiedField] = useState<string | null>(null)

  // Consulta de Estatus de Reportes
  const [searchCorreo, setSearchCorreo] = useState('')
  const [misReportes, setMisReportes] = useState<any[]>([])
  const [loadingConsulta, setLoadingConsulta] = useState(false)
  const [busquedaRealizada, setBusquedaRealizada] = useState(false)

  // Formulario Reporte
  const [nombreCliente, setNombreCliente] = useState('')
  const [titulo, setTitulo] = useState('')
  const [correoCuenta, setCorreoCuenta] = useState('')
  const [contrasenaCuenta, setContrasenaCuenta] = useState('')
  const [perfilReporte, setPerfilReporte] = useState('')
  const [pin, setPin] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [msg, setMsg] = useState('')

  // Referencias para la actualización en vivo (evitan datos "viejos" dentro de los listeners)
  const ultimaConsultaRef = useRef('')
  const consultarRef = useRef<((correo?: string, silencioso?: boolean) => Promise<void>) | null>(null)
  const perfilPreguntado = useRef(false)

  const router = useRouter()
  const supabase = createClient()
  const clabeKlar = '661180005957342832'

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.push('/login')
        return
      }
      setUser(u)
      await Promise.all([loadCatalogo(), loadPerfil(u.uid), loadMisCuentas(u.uid)])
      setLoading(false)
    })
    return () => unsub()
  }, [router])

  // Si todavía no tiene nombre + ID, se le pide una sola vez al entrar
  useEffect(() => {
    if (loading || !perfilCargado || perfilPreguntado.current) return
    perfilPreguntado.current = true
    if (perfil?.rol === 'admin') return
    if (!perfil?.cliente_id) {
      setPerfilNombre(perfil?.nombre || '')
      setModalPerfil(true)
    }
  }, [loading, perfilCargado, perfil])

  // Actualización en vivo: precios nuevos, cuentas que el admin te envía y respuestas a tus reportes.
  // Respaldo: cada 30 s y al volver a la pestaña.
  useEffect(() => {
    const uid: string | undefined = user?.uid
    if (loading || !uid) return

    let timer: ReturnType<typeof setTimeout> | null = null
    const refrescarCatalogo = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => { loadCatalogo() }, 300)
    }
    const refrescarCuentas = () => { loadMisCuentas(uid) }
    const refrescarReportes = () => {
      if (ultimaConsultaRef.current) consultarRef.current?.(ultimaConsultaRef.current, true)
    }

    const channel = supabase
      .channel(`cliente-sync-${uid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'servicios_catalogo' }, refrescarCatalogo)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reportes' }, refrescarReportes)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cuentas_clientes', filter: `usuario_id=eq.${uid}` }, refrescarCuentas)
      .subscribe()

    const refrescarTodo = () => {
      if (document.visibilityState !== 'visible') return
      loadCatalogo()
      refrescarCuentas()
      refrescarReportes()
    }
    const intervalo = setInterval(refrescarTodo, 30000)
    document.addEventListener('visibilitychange', refrescarTodo)

    return () => {
      if (timer) clearTimeout(timer)
      clearInterval(intervalo)
      document.removeEventListener('visibilitychange', refrescarTodo)
      supabase.removeChannel(channel)
    }
  }, [loading, user])

  const loadCatalogo = async () => {
    const { data: cat } = await supabase.from('servicios_catalogo').select('*').eq('activo', true)
    if (cat) setCatalogo(cat)
  }

  const loadPerfil = async (uid: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('id, nombre, cliente_id, rol')
      .eq('id', uid)
      .maybeSingle()
    setPerfil(data || null)
    setPerfilCargado(true)
  }

  // Solo las cuentas que el administrador le envió a ESTE cliente
  const loadMisCuentas = async (uid: string) => {
    const { data, error } = await supabase
      .from('cuentas_clientes')
      .select('id, servicio, perfil_asignado, pin_perfil, correo_cuenta, contrasena_cuenta, fecha_adquisicion, fecha_vencimiento, panel_url, panel_usuario, panel_id, entregado_at')
      .eq('usuario_id', uid)
      .order('fecha_vencimiento', { ascending: true })
    if (error) console.error('Error cargando mis cuentas:', error)
    if (data) setMisCuentas(data)
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(clabeKlar)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const copiar = (texto: string, clave: string) => {
    navigator.clipboard.writeText(texto)
    setCopiedField(clave)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const copiarTodo = (c: any) => {
    let texto = `🍿 *TUS DATOS DE ACCESO* 🍿\n\n` +
      `📺 *Servicio:* ${c.servicio || 'N/A'}\n` +
      `📧 *Correo:* ${c.correo_cuenta || 'N/A'}\n` +
      `🔑 *Contraseña:* ${c.contrasena_cuenta || 'N/A'}\n` +
      `👤 *Perfil:* ${c.perfil_asignado || 'N/A'}\n` +
      `📌 *PIN:* ${c.pin_perfil || 'Sin PIN'}\n` +
      `📅 *Vencimiento:* ${formatearFecha(c.fecha_vencimiento)}\n`
    const urlPanel = normalizarUrl(c.panel_url)
    if (urlPanel) {
      texto += `\n🧩 *Panel de códigos:* ${urlPanel}\n`
      if (c.panel_usuario) texto += `👤 *Usuario del panel:* ${c.panel_usuario}\n`
      if (c.panel_id) texto += `🆔 *ID del panel:* ${c.panel_id}\n`
    }
    copiar(texto, `todo-${c.id}`)
  }

  /* ───────── Perfil: nombre + ID único ───────── */

  const abrirPerfil = () => {
    setPerfilNombre(perfil?.nombre || '')
    setPerfilId(perfil?.cliente_id || '')
    setPerfilError('')
    setModalPerfil(true)
  }

  const handleGuardarPerfil = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.uid) return
    setPerfilError('')

    const nombre = perfilNombre.trim()
    const yaTieneId = !!perfil?.cliente_id
    const cid = (yaTieneId ? perfil.cliente_id : perfilId).trim().toLowerCase()

    if (nombre.length < 2) { setPerfilError('Escribe tu nombre (mínimo 2 caracteres).'); return }
    if (!yaTieneId && !validarClienteId(cid)) {
      setPerfilError('El ID debe tener de 4 a 20 caracteres: solo letras minúsculas, números y guion bajo (_).')
      return
    }

    setGuardandoPerfil(true)

    // ¿El ID ya lo usa otra persona?
    if (!yaTieneId) {
      const { data: existente } = await supabase
        .from('profiles')
        .select('id')
        .eq('cliente_id', cid)
        .maybeSingle()
      if (existente && existente.id !== user.uid) {
        setPerfilError('Ese ID ya está en uso. Elige otro.')
        setGuardandoPerfil(false)
        return
      }
    }

    const cambios: any = { nombre }
    if (!yaTieneId) cambios.cliente_id = cid

    let error: any = null
    if (perfil) {
      const res = await supabase.from('profiles').update(cambios).eq('id', user.uid)
      error = res.error
    } else {
      // Si por alguna razón no existía su fila de perfil, se crea como cliente
      const res = await supabase.from('profiles').insert([{ id: user.uid, correo: user.email, rol: 'cliente', ...cambios }])
      error = res.error
    }

    if (error) {
      setPerfilError(
        error.code === '23505'
          ? 'Ese ID ya está en uso. Elige otro.'
          : `No se pudo guardar tu perfil: ${error.message}`
      )
      setGuardandoPerfil(false)
      return
    }

    await loadPerfil(user.uid)
    setGuardandoPerfil(false)
    setModalPerfil(false)
  }

  /* ───────── Reportes ───────── */

  const handleCrearReporte = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titulo || !correoCuenta || !descripcion) return

    setEnviando(true)
    setMsg('')

    // Solo columnas que existen en la tabla "reportes":
    // nombre_cliente, correo_cuenta, contrasena_cuenta, descripcion_problema,
    // perfil, pin, estatus, estado, usuario_id
    // El título se guarda como primera línea de descripcion_problema.
    const payloadReporte: any = {
      nombre_cliente: nombreCliente || perfil?.nombre || user?.email?.split('@')[0] || 'Cliente',
      correo_cuenta: correoCuenta,
      contrasena_cuenta: contrasenaCuenta || null,
      perfil: perfilReporte || null,
      pin: pin || null,
      descripcion_problema: `${titulo}\n${descripcion}`,
      estatus: 'Pendiente',
      estado: 'pendiente'
    }

    if (user?.uid) {
      payloadReporte.usuario_id = user.uid
    }

    const { error } = await supabase.from('reportes').insert([payloadReporte])

    if (!error) {
      setMsg('✅ Reporte enviado con éxito. Puedes consultar su avance abajo.')
      setNombreCliente('')
      setTitulo('')
      setCorreoCuenta('')
      setContrasenaCuenta('')
      setPerfilReporte('')
      setPin('')
      setDescripcion('')
      handleConsultarEstatus(correoCuenta)
    } else {
      setMsg(`❌ Error al enviar reporte: ${error.message}`)
    }
    setEnviando(false)
  }

  const handleConsultarEstatus = async (correoBuscado?: string, silencioso: boolean = false) => {
    const queryCorreo = correoBuscado || searchCorreo
    if (!queryCorreo.trim()) return

    ultimaConsultaRef.current = queryCorreo
    if (!silencioso) setLoadingConsulta(true)
    setBusquedaRealizada(true)

    const { data } = await supabase
      .from('reportes')
      .select('*')
      .or(`correo_cuenta.ilike.%${queryCorreo.trim()}%,usuario_id.eq.${user?.uid || ''}`)
      .order('created_at', { ascending: false })

    if (data) setMisReportes(data)
    setLoadingConsulta(false)
  }
  // Siempre apunta a la versión más reciente de la función (la usan los listeners en vivo)
  consultarRef.current = handleConsultarEstatus

  // Desde "Mis cuentas": abre soporte con los datos de esa cuenta ya escritos
  const reportarProblema = (c: any) => {
    setCorreoCuenta(c.correo_cuenta || '')
    setContrasenaCuenta(c.contrasena_cuenta || '')
    setPerfilReporte(c.perfil_asignado || '')
    setPin(c.pin_perfil || '')
    setTitulo(`Problema con ${c.servicio || 'mi cuenta'}`)
    setMsg('')
    setTab('soporte')
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  /* ───────── Tokens visuales ───────── */
  const ui = {
    page: darkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900',
    card: darkMode ? 'bg-slate-800/70 border-slate-700' : 'bg-white border-slate-200 shadow-sm',
    cardInner: darkMode ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-200',
    modal: darkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-800',
    muted: darkMode ? 'text-slate-400' : 'text-slate-500',
    border: darkMode ? 'border-slate-700' : 'border-slate-200',
    divide: darkMode ? 'divide-slate-700/60' : 'divide-slate-100',
    input: `w-full px-3.5 py-2.5 rounded-xl text-sm border outline-none transition focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 ${
      darkMode ? 'bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
    }`,
    btnPrimary: 'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 shadow-sm transition active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed',
    btnGhost: `inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium border transition ${
      darkMode ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm'
    }`,
    iconBtn: `p-1.5 rounded-lg transition ${darkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100'}`,
  }

  /* ───────── Datos derivados ───────── */
  const combos = catalogo.filter(c => c.categoria === 'combo')
  const porPerfil = catalogo.filter(c => c.categoria === 'perfil')
  const completas = catalogo.filter(c => c.categoria === 'completa')
  const reportesAbiertos = misReportes.filter(r => (r.estatus || r.estado || 'pendiente').toLowerCase() !== 'resuelto').length
  const cuentasPorVencer = misCuentas.filter(c => {
    const l = getSemaforoStatus(c.fecha_vencimiento).label
    return l === 'Por Vencer' || l === 'Vencida'
  }).length
  const sinId = perfilCargado && perfil?.rol !== 'admin' && !perfil?.cliente_id

  const tabs = [
    { id: 'inicio', name: 'Inicio', icon: Home, count: null as number | null },
    { id: 'cuentas', name: 'Mis cuentas', icon: Tv, count: misCuentas.length },
    { id: 'soporte', name: 'Soporte', icon: LifeBuoy, count: null as number | null },
  ] as const

  /* ───────── Carga inicial (skeleton) ───────── */
  if (loading) {
    return (
      <div className={`min-h-screen p-4 sm:p-8 ${ui.page}`}>
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex justify-between items-center gap-4">
            <div className="space-y-2">
              <Skeleton dark={darkMode} className="h-7 w-52" />
              <Skeleton dark={darkMode} className="h-4 w-64 max-w-full" />
            </div>
            <Skeleton dark={darkMode} className="h-10 w-40" />
          </div>
          <Skeleton dark={darkMode} className="h-11 w-full" />
          <Skeleton dark={darkMode} className="h-32 w-full" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} dark={darkMode} className="h-24" />)}
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <Skeleton dark={darkMode} className="h-64" />
            <Skeleton dark={darkMode} className="h-64" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen transition-colors duration-200 p-4 sm:p-8 ${ui.page}`}>
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header Cliente + Switcher Tema */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {perfil?.nombre ? `Hola, ${perfil.nombre}` : 'Panel de cliente'}
            </h1>
            <div className={`text-sm mt-0.5 flex items-center gap-2 flex-wrap ${ui.muted}`}>
              <span>{user?.email}</span>
              {perfil?.cliente_id && (
                <button
                  type="button"
                  onClick={() => copiar(perfil.cliente_id, 'mi-id')}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-semibold transition ${toneClasses(darkMode, 'info')}`}
                  title="Copiar mi ID"
                >
                  <AtSign size={12} /> {perfil.cliente_id}
                  {copiedField === 'mi-id' ? <Check size={12} /> : <Copy size={12} />}
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={abrirPerfil} className={ui.btnGhost}>
              <UserRound size={16} /> <span className="hidden sm:inline">Mi perfil</span>
            </button>
            <button onClick={() => setDarkMode(!darkMode)} className={ui.btnGhost}>
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
              <span className="hidden sm:inline">{darkMode ? 'Modo claro' : 'Modo oscuro'}</span>
            </button>
            <button
              onClick={() => signOut(auth)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium border transition ${
                darkMode ? 'bg-rose-500/10 border-rose-500/30 text-rose-300 hover:bg-rose-500/20' : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
              }`}
            >
              <LogOut size={16} /> Cerrar sesión
            </button>
          </div>
        </header>

        {/* Aviso: falta nombre + ID */}
        {sinId && (
          <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${toneClasses(darkMode, 'warning')}`}>
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Elige tu nombre e ID</p>
                <p className="text-xs">Es lo que el administrador usa para enviarte tus cuentas sin confundirte con otro cliente.</p>
              </div>
            </div>
            <button onClick={abrirPerfil} className={ui.btnPrimary}>Completar ahora</button>
          </div>
        )}

        {/* Navegación */}
        <nav className={`flex overflow-x-auto gap-1 border-b ${ui.border}`}>
          {tabs.map((t) => {
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`whitespace-nowrap inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition ${
                  active
                    ? (darkMode ? 'border-indigo-400 text-indigo-300' : 'border-indigo-600 text-indigo-700')
                    : `border-transparent ${ui.muted} ${darkMode ? 'hover:text-slate-200' : 'hover:text-slate-800'}`
                }`}
              >
                <t.icon size={16} />
                {t.name}
                {t.count !== null && (
                  <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full border ${
                    t.id === 'cuentas' && cuentasPorVencer > 0 ? toneClasses(darkMode, 'warning') : toneClasses(darkMode, 'neutral')
                  }`}>
                    {t.count}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* ═══════════════ INICIO ═══════════════ */}
        {tab === 'inicio' && (
          <>
            {/* Tarjeta de Pago Klar */}
            <section className="rounded-2xl p-5 sm:p-6 text-white bg-gradient-to-r from-indigo-600 to-blue-600 shadow-lg shadow-indigo-600/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                  <Landmark size={22} />
                </div>
                <div>
                  <p className="text-xs text-indigo-100">Método de pago oficial</p>
                  <h2 className="text-lg font-bold">Banca: Klar</h2>
                  <p className="text-sm text-indigo-100">Titular: <strong className="text-white">Hector Gress Angeles</strong></p>
                  {perfil?.cliente_id && (
                    <p className="text-xs text-indigo-100 mt-1">Al pagar, avisa tu ID: <strong className="text-white">@{perfil.cliente_id}</strong></p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/10 border border-white/20 w-full md:w-auto justify-between">
                <div>
                  <p className="text-[11px] text-indigo-100">CLABE interbancaria</p>
                  <p className="font-mono text-base font-semibold tracking-wider">{clabeKlar}</p>
                </div>
                <button
                  onClick={copyToClipboard}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                    copied ? 'bg-emerald-400 text-emerald-950' : 'bg-white text-indigo-700 hover:bg-indigo-50'
                  }`}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? '¡Copiada!' : 'Copiar CLABE'}
                </button>
              </div>
            </section>

            {/* KPIs */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                dark={darkMode}
                icon={Tv}
                tone={cuentasPorVencer > 0 ? 'warning' : 'success'}
                label="Mis cuentas"
                value={misCuentas.length}
                hint={cuentasPorVencer > 0 ? `${cuentasPorVencer} por renovar` : 'Todo vigente'}
              />
              <KpiCard dark={darkMode} icon={Sparkles} tone="warning" label="Combos del mes" value={combos.length} hint="Ofertas activas" />
              <KpiCard dark={darkMode} icon={UserRound} tone="info" label="Planes por perfil" value={porPerfil.length} hint="1 mes de servicio" />
              <KpiCard
                dark={darkMode}
                icon={LifeBuoy}
                tone={busquedaRealizada && reportesAbiertos > 0 ? 'warning' : 'neutral'}
                label="Mis reportes"
                value={busquedaRealizada ? misReportes.length : '—'}
                hint={busquedaRealizada ? `${reportesAbiertos} abiertos` : 'Consulta en Soporte'}
              />
            </section>

            {/* Combos Terroríficos */}
            <section className="space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                🎃 Combos terroríficos de octubre
              </h2>
              {combos.length === 0 ? (
                <div className={`border rounded-2xl ${ui.card}`}>
                  <EmptyState dark={darkMode} icon={Sparkles} title="Aún no hay combos activos" text="Pronto publicaremos las ofertas del mes. Vuelve a revisar en unos días." />
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {combos.map((item) => (
                    <div key={item.id} className={`p-5 rounded-2xl border space-y-2 ${ui.card}`}>
                      <Pill dark={darkMode} tone="info">Combo especial</Pill>
                      <h3 className="text-base font-semibold">{item.nombre}</h3>
                      <p className={`text-sm ${ui.muted}`}>{item.descripcion}</p>
                      <div className={`text-2xl font-bold pt-1 ${darkMode ? 'text-indigo-300' : 'text-indigo-700'}`}>${item.precio} MXN</div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Precios por Perfil y Cuentas Completas */}
            <section className="grid md:grid-cols-2 gap-6">
              <div className={`p-5 rounded-2xl border space-y-3 ${ui.card}`}>
                <h3 className="font-semibold">🍿 Precios por perfil (1 mes)</h3>
                {porPerfil.length === 0 ? (
                  <EmptyState dark={darkMode} icon={UserRound} title="Sin precios por perfil" text="Cuando el administrador los publique, los verás aquí." />
                ) : (
                  <div className={`divide-y max-h-72 overflow-y-auto pr-1 ${ui.divide}`}>
                    {porPerfil.map((p) => (
                      <div key={p.id} className="py-2.5 flex justify-between items-center text-sm">
                        <span className="font-medium">{p.nombre}</span>
                        <span className={`font-bold ${darkMode ? 'text-indigo-300' : 'text-indigo-700'}`}>${p.precio} MXN</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className={`p-5 rounded-2xl border space-y-3 ${ui.card}`}>
                <h3 className="font-semibold">👑 Cuentas completas exclusivas</h3>
                {completas.length === 0 ? (
                  <EmptyState dark={darkMode} icon={Crown} title="Sin cuentas completas" text="Cuando el administrador las publique, las verás aquí." />
                ) : (
                  <div className={`divide-y max-h-72 overflow-y-auto pr-1 ${ui.divide}`}>
                    {completas.map((cc) => (
                      <div key={cc.id} className="py-2.5 flex justify-between items-center text-sm">
                        <span className="font-medium">{cc.nombre}</span>
                        <span className={`font-bold ${darkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>${cc.precio} MXN</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        {/* ═══════════════ MIS CUENTAS ═══════════════ */}
        {tab === 'cuentas' && (
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Mis cuentas adquiridas</h2>
              <p className={`text-sm ${ui.muted}`}>Aquí aparecen las cuentas que el administrador te envía después de tu pago. Se actualizan solas.</p>
            </div>

            {misCuentas.length === 0 ? (
              <div className={`border rounded-2xl ${ui.card}`}>
                <EmptyState
                  dark={darkMode}
                  icon={Inbox}
                  title="Aún no tienes cuentas asignadas"
                  text={perfil?.cliente_id
                    ? `Cuando pagues, avisa tu ID (@${perfil.cliente_id}) al administrador y tu cuenta aparecerá aquí.`
                    : 'Primero elige tu nombre e ID para que el administrador pueda enviarte tus cuentas.'}
                  action={perfil?.cliente_id ? undefined : <button onClick={abrirPerfil} className={ui.btnPrimary}>Elegir mi ID</button>}
                />
              </div>
            ) : (
              <div className="grid lg:grid-cols-2 gap-4">
                {misCuentas.map((c) => {
                  const estado = getSemaforoStatus(c.fecha_vencimiento)
                  const etiqueta = estado.label === 'Estable' ? 'Vigente' : estado.label
                  const urlPanel = normalizarUrl(c.panel_url)
                  const visible = !!mostrarPass[c.id]

                  const fila = (label: string, valor: string, clave: string, secreto = false) => (
                    <div className="flex items-center justify-between gap-3 py-2">
                      <div className="min-w-0">
                        <p className={`text-[11px] ${ui.muted}`}>{label}</p>
                        <p className="font-mono text-sm break-all">
                          {secreto && !visible ? '••••••••••' : (valor || '—')}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {secreto && (
                          <button
                            type="button"
                            onClick={() => setMostrarPass({ ...mostrarPass, [c.id]: !visible })}
                            className={ui.iconBtn}
                            aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                          >
                            {visible ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        )}
                        {valor && (
                          <button
                            type="button"
                            onClick={() => copiar(valor, clave)}
                            className={ui.iconBtn}
                            aria-label={`Copiar ${label}`}
                          >
                            {copiedField === clave ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                          </button>
                        )}
                      </div>
                    </div>
                  )

                  return (
                    <article key={c.id} className={`p-5 rounded-2xl border space-y-3 ${ui.card}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base font-semibold">{c.servicio || 'Servicio'}</h3>
                          <p className={`text-xs ${ui.muted}`}>{textoDias(estado.dias)} · {formatearFecha(c.fecha_vencimiento)}</p>
                        </div>
                        <Pill dark={darkMode} tone={estado.tone}>{etiqueta}</Pill>
                      </div>

                      <div className={`divide-y px-3.5 rounded-xl border ${ui.cardInner} ${ui.divide}`}>
                        {fila('Correo', c.correo_cuenta || '', `correo-${c.id}`)}
                        {fila('Contraseña', c.contrasena_cuenta || '', `pass-${c.id}`, true)}
                        <div className="grid grid-cols-2 gap-3">
                          {fila('Perfil', c.perfil_asignado || '', `perfil-${c.id}`)}
                          {fila('PIN', c.pin_perfil || '', `pin-${c.id}`)}
                        </div>
                        <div className="grid grid-cols-2 gap-3 py-2">
                          <div>
                            <p className={`text-[11px] ${ui.muted}`}>Adquirida</p>
                            <p className="text-sm">{formatearFecha(c.fecha_adquisicion)}</p>
                          </div>
                          <div>
                            <p className={`text-[11px] ${ui.muted}`}>Vence</p>
                            <p className="text-sm">{formatearFecha(c.fecha_vencimiento)}</p>
                          </div>
                        </div>
                      </div>

                      {/* Panel de códigos (solo si el admin lo envió) */}
                      {urlPanel && (
                        <div className={`p-3.5 rounded-xl border space-y-1 ${toneClasses(darkMode, 'info')}`}>
                          <p className="text-sm font-semibold flex items-center gap-1.5"><KeyRound size={15} /> Panel de códigos</p>
                          <a
                            href={urlPanel}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm font-semibold underline underline-offset-2 break-all"
                          >
                            <ExternalLink size={14} className="shrink-0" /> Abrir panel
                          </a>
                          {c.panel_usuario && (
                            <div className="flex items-center justify-between gap-2 pt-1">
                              <p className="text-xs">Usuario: <span className="font-mono font-semibold break-all">{c.panel_usuario}</span></p>
                              <button type="button" onClick={() => copiar(c.panel_usuario, `pu-${c.id}`)} className={ui.iconBtn} aria-label="Copiar usuario del panel">
                                {copiedField === `pu-${c.id}` ? <Check size={15} /> : <Copy size={15} />}
                              </button>
                            </div>
                          )}
                          {c.panel_id && (
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs">ID: <span className="font-mono font-semibold break-all">{c.panel_id}</span></p>
                              <button type="button" onClick={() => copiar(c.panel_id, `pi-${c.id}`)} className={ui.iconBtn} aria-label="Copiar ID del panel">
                                {copiedField === `pi-${c.id}` ? <Check size={15} /> : <Copy size={15} />}
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {(estado.label === 'Por Vencer' || estado.label === 'Vencida') && (
                        <p className={`text-xs ${ui.muted}`}>
                          Para renovar, paga por CLABE (pestaña Inicio) y avisa tu ID{perfil?.cliente_id ? ` @${perfil.cliente_id}` : ''} al administrador.
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2 pt-1">
                        <button type="button" onClick={() => copiarTodo(c)} className={ui.btnGhost}>
                          {copiedField === `todo-${c.id}` ? <Check size={15} /> : <Copy size={15} />}
                          {copiedField === `todo-${c.id}` ? '¡Copiado!' : 'Copiar todo'}
                        </button>
                        <button type="button" onClick={() => reportarProblema(c)} className={ui.btnGhost}>
                          <LifeBuoy size={15} /> Reportar problema
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        )}

        {/* ═══════════════ SOPORTE ═══════════════ */}
        {tab === 'soporte' && (
          <>
            {/* Formulario Completo de Reportes */}
            <section className={`p-5 sm:p-6 rounded-2xl border space-y-4 ${ui.card}`}>
              <div>
                <h2 className="text-lg font-semibold">Generar reporte de fallas</h2>
                <p className={`text-sm ${ui.muted}`}>Cuéntanos qué pasa con tu cuenta y te responderemos aquí mismo.</p>
              </div>

              {msg && (
                <div className={`p-3 rounded-xl border text-sm ${toneClasses(darkMode, msg.startsWith('✅') ? 'success' : 'danger')}`}>
                  {msg}
                </div>
              )}

              <form onSubmit={handleCrearReporte} className="space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field dark={darkMode} label="Tu nombre completo">
                    <input
                      type="text"
                      placeholder={perfil?.nombre ? `Ej. ${perfil.nombre}` : 'Ej. Juan Pérez'}
                      value={nombreCliente}
                      onChange={(e) => setNombreCliente(e.target.value)}
                      className={ui.input}
                    />
                  </Field>

                  <Field dark={darkMode} label="Título del problema *">
                    <input
                      type="text"
                      required
                      placeholder="Ej. Sin acceso / Perfil bloqueado"
                      value={titulo}
                      onChange={(e) => setTitulo(e.target.value)}
                      className={ui.input}
                    />
                  </Field>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <Field dark={darkMode} label="Correo de la cuenta *">
                    <input
                      type="email"
                      required
                      placeholder="cuenta@ejemplo.com"
                      value={correoCuenta}
                      onChange={(e) => setCorreoCuenta(e.target.value)}
                      className={ui.input}
                    />
                  </Field>
                  <Field dark={darkMode} label="Contraseña de la cuenta">
                    <input
                      type="text"
                      placeholder="Contraseña actual"
                      value={contrasenaCuenta}
                      onChange={(e) => setContrasenaCuenta(e.target.value)}
                      className={ui.input}
                    />
                  </Field>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <Field dark={darkMode} label="Perfil asignado (si aplica)">
                    <input
                      type="text"
                      placeholder="Ej. Perfil 1 / Nombre"
                      value={perfilReporte}
                      onChange={(e) => setPerfilReporte(e.target.value)}
                      className={ui.input}
                    />
                  </Field>
                  <Field dark={darkMode} label="PIN del perfil (si aplica)">
                    <input
                      type="text"
                      placeholder="Ej. 1234"
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      className={ui.input}
                    />
                  </Field>
                </div>

                <Field dark={darkMode} label="Descripción de la falla *">
                  <textarea
                    required
                    rows={3}
                    placeholder="Explica qué mensaje muestra la pantalla o qué sucede al intentar acceder..."
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    className={ui.input}
                  />
                </Field>

                <button type="submit" disabled={enviando} className={ui.btnPrimary}>
                  {enviando ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  {enviando ? 'Enviando...' : 'Enviar reporte al administrador'}
                </button>
              </form>
            </section>

            {/* Consultar Estatus */}
            <section className={`p-5 sm:p-6 rounded-2xl border space-y-4 ${ui.card}`}>
              <div>
                <h2 className="text-lg font-semibold">Consultar estatus de reportes</h2>
                <p className={`text-sm ${ui.muted}`}>Escribe el correo de tu cuenta. Las respuestas del administrador se actualizan solas.</p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${ui.muted}`} />
                  <input
                    type="email"
                    placeholder="Ingresa tu correo de cuenta para consultar"
                    value={searchCorreo}
                    onChange={(e) => setSearchCorreo(e.target.value)}
                    className={`${ui.input} pl-10`}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleConsultarEstatus()}
                  className={ui.btnPrimary}
                >
                  {loadingConsulta ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                  {loadingConsulta ? 'Buscando...' : 'Consultar estatus'}
                </button>
              </div>

              {loadingConsulta && (
                <div className="space-y-3 pt-1">
                  {[0, 1].map((i) => <Skeleton key={i} dark={darkMode} className="h-24 w-full" />)}
                </div>
              )}

              {!loadingConsulta && busquedaRealizada && (
                misReportes.length > 0 ? (
                  <div className="space-y-3 pt-1">
                    {misReportes.map((rep) => {
                      const estatusStr = (rep.estatus || rep.estado || 'Pendiente').toLowerCase()
                      const tone: Tone = estatusStr === 'resuelto' ? 'success' : estatusStr === 'en proceso' ? 'info' : 'warning'
                      return (
                        <div key={rep.id} className={`p-4 border rounded-xl flex flex-col sm:flex-row justify-between items-start gap-3 ${ui.cardInner}`}>
                          <div className="space-y-1 min-w-0">
                            <h4 className="font-semibold text-sm">{getTituloReporte(rep)}</h4>
                            <p className={`text-xs font-mono ${darkMode ? 'text-indigo-300' : 'text-indigo-700'}`}>
                              Cuenta: {rep.correo_cuenta} {(rep.perfil || rep.perfil_asignado) && `| Perfil: ${rep.perfil || rep.perfil_asignado}`} {(rep.pin || rep.pin_perfil) && `(PIN: ${rep.pin || rep.pin_perfil})`}
                            </p>
                            <p className={`text-sm mt-1 whitespace-pre-line ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>{getDescripcionReporte(rep)}</p>

                            {rep.solucion && (
                              <div className={`p-3 rounded-lg border text-sm mt-2 flex gap-2 ${toneClasses(darkMode, 'info')}`}>
                                <Lightbulb size={16} className="shrink-0 mt-0.5" />
                                <span><strong>Respuesta del administrador:</strong> {rep.solucion}</span>
                              </div>
                            )}
                          </div>
                          <Pill dark={darkMode} tone={tone}>{rep.estatus || rep.estado || 'Pendiente'}</Pill>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <EmptyState
                    dark={darkMode}
                    icon={SearchX}
                    title="No encontramos reportes con ese correo"
                    text="Revisa que esté escrito igual que en tu cuenta, o envía un reporte nuevo arriba."
                  />
                )
              )}

              {!loadingConsulta && !busquedaRealizada && (
                <EmptyState
                  dark={darkMode}
                  icon={Inbox}
                  title="Aquí verás tus reportes"
                  text="Consulta con el correo de tu cuenta para ver su estado y la respuesta del administrador."
                />
              )}
            </section>
          </>
        )}
      </div>

      {/* ═══════════════ MODAL: Mi perfil (nombre + ID único) ═══════════════ */}
      {modalPerfil && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-start sm:items-center justify-center p-4 z-50 overflow-y-auto">
          <div className={`border w-full max-w-md p-6 rounded-2xl shadow-2xl space-y-4 my-8 ${ui.modal}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-lg">{perfil?.cliente_id ? 'Mi perfil' : 'Elige tu nombre e ID'}</h3>
                <p className={`text-xs ${ui.muted}`}>
                  {perfil?.cliente_id
                    ? 'Tu ID no se puede cambiar. Si necesitas otro, pídeselo al administrador.'
                    : 'El administrador te encontrará por tu ID, así no se confunde con otro cliente.'}
                </p>
              </div>
              <button type="button" onClick={() => setModalPerfil(false)} className={ui.iconBtn} aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleGuardarPerfil} className="space-y-3">
              <Field dark={darkMode} label="Tu nombre *">
                <input
                  type="text"
                  required
                  maxLength={40}
                  placeholder="Ej. Paula"
                  value={perfilNombre}
                  onChange={(e) => setPerfilNombre(e.target.value)}
                  className={ui.input}
                />
              </Field>

              <Field dark={darkMode} label="Tu ID único *">
                <div className="relative">
                  <AtSign size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${ui.muted}`} />
                  <input
                    type="text"
                    required
                    maxLength={20}
                    autoComplete="off"
                    placeholder="paula23"
                    value={perfil?.cliente_id || perfilId}
                    disabled={!!perfil?.cliente_id}
                    onChange={(e) => setPerfilId(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    className={`${ui.input} pl-10 disabled:opacity-70`}
                  />
                </div>
                <span className={`block text-[11px] ${ui.muted}`}>4 a 20 caracteres: letras minúsculas, números y guion bajo.</span>
              </Field>

              {perfilError && (
                <div role="alert" className={`p-3 rounded-xl border text-sm ${toneClasses(darkMode, 'danger')}`}>{perfilError}</div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setModalPerfil(false)} className={ui.btnGhost}>
                  {perfil?.cliente_id ? 'Cerrar' : 'Más tarde'}
                </button>
                <button type="submit" disabled={guardandoPerfil} className={ui.btnPrimary}>
                  {guardandoPerfil && <Loader2 size={16} className="animate-spin" />}
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
