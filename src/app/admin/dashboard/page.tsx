'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { createClient } from '@/lib/supabase'
import {
  hoyISO, getSemaforoStatus, ordenarPorVencimiento, formatearFecha,
  textoDias, validarCorreo, normalizarUrl
} from '@/lib/cuentas'
import type { Tone } from '@/lib/cuentas'
import { descargarReporte } from '@/lib/reporteVencimientos'
import type { FilaReporte, SeccionReporte } from '@/lib/reporteVencimientos'
import {
  Sun, Moon, LogOut, Users, Server, Tag, LifeBuoy, Search, Plus, Copy, Check,
  Pencil, Trash2, Clock, Inbox, X, RefreshCw, ExternalLink, SearchX, Loader2,
  Send, FileText, FileImage, Unlink, Globe, UserCheck
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
  <div className="flex flex-col items-center justify-center text-center py-14 px-6">
    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${dark ? 'bg-indigo-500/10 text-indigo-300' : 'bg-indigo-50 text-indigo-600'}`}>
      <Icon size={26} />
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

export default function AdminDashboard() {
  const [tab, setTab] = useState<'clientes' | 'madres' | 'precios' | 'reportes'>('clientes')
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [selectedServicio, setSelectedServicio] = useState('Todos')
  const [darkMode, setDarkMode] = useState(false)
  const [copiedId, setCopiedId] = useState<string | number | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [sincronizando, setSincronizando] = useState(false)
  const [ultimaSync, setUltimaSync] = useState<Date | null>(null)
  const [toast, setToast] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  
  // Datasets
  const [cuentasClientes, setCuentasClientes] = useState<any[]>([])
  const [cuentasMadre, setCuentasMadre] = useState<any[]>([])
  const [servicios, setServicios] = useState<any[]>([])
  const [reportes, setReportes] = useState<any[]>([])
  const [perfiles, setPerfiles] = useState<any[]>([])

  // Estado para responder reportes
  const [solucionesInput, setSolucionesInput] = useState<{ [key: string]: string }>({})

  // Modal / Form States
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [formData, setFormData] = useState<any>({})

  // Modal: enviar cuenta a un cliente
  const [sendItem, setSendItem] = useState<any>(null)
  const [clienteQuery, setClienteQuery] = useState('')
  const [clienteSel, setClienteSel] = useState<any>(null)
  const [incluirPanel, setIncluirPanel] = useState(false)
  const [panelForm, setPanelForm] = useState({ url: '', usuario: '', id: '' })
  const [enviando, setEnviando] = useState(false)
  const [sendError, setSendError] = useState('')

  // Modal: reporte de vencimientos (PDF / imagen)
  const [reporteOpen, setReporteOpen] = useState(false)
  const [repVencidas, setRepVencidas] = useState(true)
  const [repPorVencer, setRepPorVencer] = useState(true)
  const [repOrigen, setRepOrigen] = useState<'ambas' | 'clientes' | 'madres'>('ambas')
  const [generando, setGenerando] = useState<'pdf' | 'png' | null>(null)

  const router = useRouter()
  const supabase = createClient()

  const serviciosFiltro = [
    'Todos', 'Netflix', 'Max / HBO Max', 'Disney+', 'Prime Video', 'ViX', 
    'Spotify', 'Paramount+', 'Apple TV+', 'Crunchyroll', 'Canva', 'Gemini', 'ChatGPT'
  ]

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.push('/login')
        return
      }

      // Solo administradores: se valida el rol guardado en la tabla "profiles"
      const { data: perfilAdmin } = await supabase
        .from('profiles')
        .select('rol')
        .eq('id', u.uid)
        .maybeSingle()

      if (perfilAdmin?.rol !== 'admin') {
        router.push('/cliente/dashboard')
        return
      }

      await loadAllData()
      setLoading(false)
    })
    return () => unsub()
  }, [router])

  // Sincronización en vivo: cuando el otro admin (o un cliente) guarda algo,
  // se recarga solo. Además: respaldo cada 30 s y al volver a la pestaña.
  useEffect(() => {
    if (loading) return

    let timer: ReturnType<typeof setTimeout> | null = null
    const refrescar = () => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => { loadAllData() }, 300)
    }

    const channel = supabase
      .channel('admin-dashboard-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cuentas_clientes' }, refrescar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cuentas_madre' }, refrescar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'servicios_catalogo' }, refrescar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reportes' }, refrescar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, refrescar)
      .subscribe()

    const intervalo = setInterval(() => {
      if (document.visibilityState === 'visible') loadAllData()
    }, 30000)

    const alVolver = () => {
      if (document.visibilityState === 'visible') loadAllData()
    }
    document.addEventListener('visibilitychange', alVolver)

    return () => {
      if (timer) clearTimeout(timer)
      clearInterval(intervalo)
      document.removeEventListener('visibilitychange', alVolver)
      supabase.removeChannel(channel)
    }
  }, [loading])

  const loadAllData = async () => {
    const { data: cCli } = await supabase.from('cuentas_clientes').select('*').order('created_at', { ascending: false })
    const { data: cMad } = await supabase.from('cuentas_madre').select('*').order('created_at', { ascending: false })
    const { data: sCat } = await supabase.from('servicios_catalogo').select('*').order('created_at', { ascending: false })
    const { data: rep } = await supabase.from('reportes').select('*').order('created_at', { ascending: false })
    const { data: perf } = await supabase.from('profiles').select('id, nombre, correo, cliente_id, rol').order('created_at', { ascending: false })

    if (cCli) setCuentasClientes(cCli)
    if (cMad) setCuentasMadre(cMad)
    if (sCat) setServicios(sCat)
    if (perf) setPerfiles(perf)
    if (rep) {
      setReportes(rep)
      // Se conserva lo que el admin esté escribiendo; solo se rellenan los reportes nuevos
      setSolucionesInput((prev) => {
        const next: { [key: string]: string } = {}
        rep.forEach(r => {
          next[r.id] = prev[r.id] !== undefined ? prev[r.id] : (r.solucion || '')
        })
        return next
      })
    }
    setUltimaSync(new Date())
  }

  const handleSincronizar = async () => {
    setSincronizando(true)
    await loadAllData()
    setSincronizando(false)
  }

  const mostrarToast = (tipo: 'ok' | 'error', texto: string) => {
    setToast({ tipo, texto })
    setTimeout(() => setToast(null), 4500)
  }

  const handleCopiarDatosCliente = (item: any) => {
    let texto = `🍿 *TUS DATOS DE ACCESO* 🍿\n\n` +
      `📺 *Servicio:* ${item.servicio || 'N/A'}\n` +
      `📧 *Correo:* ${item.correo_cuenta || item.correo || 'N/A'}\n` +
      `🔑 *Contraseña:* ${item.contrasena_cuenta || item.contrasena || 'N/A'}\n` +
      `👤 *Perfil:* ${item.perfil_asignado || 'N/A'}\n` +
      `📌 *PIN:* ${item.pin_perfil || 'Sin PIN'}\n` +
      `📅 *Vencimiento:* ${formatearFecha(item.fecha_vencimiento)}\n`

    if (item.panel_url) {
      texto += `\n🧩 *Panel de códigos:* ${item.panel_url}\n`
      if (item.panel_usuario) texto += `👤 *Usuario del panel:* ${item.panel_usuario}\n`
      if (item.panel_id) texto += `🆔 *ID del panel:* ${item.panel_id}\n`
    }
    texto += `\n¡Gracias por tu preferencia!`

    navigator.clipboard.writeText(texto)
    setCopiedId(item.id)
    setTimeout(() => setCopiedId(null), 2500)
  }

  /* ───────── Guardar (crear / editar) con validaciones ───────── */

  const alertar = (mensaje: string) => { alert(`⚠️ ${mensaje}`) }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()

    let error: any = null
    let ejecutar: (() => Promise<{ error: any }>) | null = null
    
    if (tab === 'clientes') {
      const correoCta = (formData.correo_cuenta || '').trim()
      const passCta = (formData.contrasena_cuenta || '').trim()
      const servicio = (formData.servicio || '').trim()
      const nombre = (formData.nombre_completo || '').trim()
      const adquisicion = formData.fecha_adquisicion || hoyISO()
      const vencimiento = formData.fecha_vencimiento || ''
      const perfilAsig = (formData.perfil_asignado || '').trim()

      if (!nombre) return alertar('Escribe el nombre del cliente.')
      if (!servicio) return alertar('Escribe el servicio.')
      if (!validarCorreo(correoCta)) return alertar('El correo de la cuenta no es válido.')
      if (!passCta) return alertar('La contraseña de la cuenta es obligatoria.')
      if (!vencimiento) return alertar('Elige la fecha de vencimiento.')
      if (vencimiento < adquisicion) return alertar('La fecha de vencimiento no puede ser anterior a la de adquisición.')

      const precioTxt = formData.precio_suscripcion
      const precioNum = precioTxt === '' || precioTxt == null ? null : Number(precioTxt)
      if (precioNum !== null && (isNaN(precioNum) || precioNum < 0)) return alertar('El precio debe ser un número mayor o igual a 0.')

      // Aviso si el mismo perfil de la misma cuenta ya está registrado
      if (perfilAsig) {
        const duplicado = cuentasClientes.find(c =>
          c.id !== editingItem?.id &&
          (c.correo_cuenta || '').trim().toLowerCase() === correoCta.toLowerCase() &&
          (c.servicio || '').trim().toLowerCase() === servicio.toLowerCase() &&
          (c.perfil_asignado || '').trim().toLowerCase() === perfilAsig.toLowerCase()
        )
        if (duplicado && !confirm(
          `Ya existe el perfil "${perfilAsig}" en esa cuenta (cliente: ${duplicado.nombre_completo || 's/n'}, vence ${formatearFecha(duplicado.fecha_vencimiento)}).\n\n¿Guardar de todos modos?`
        )) return
      }

      const payload: any = {
        nombre_completo: nombre,
        servicio,
        correo_cuenta: correoCta,
        contrasena_cuenta: passCta,
        fecha_adquisicion: adquisicion,
        fecha_vencimiento: vencimiento,
        cuenta_madre_id: formData.cuenta_madre_id ? Number(formData.cuenta_madre_id) : null,
      }
      if (perfilAsig) payload.perfil_asignado = perfilAsig
      if (formData.pin_perfil) payload.pin_perfil = String(formData.pin_perfil).trim()
      if (precioNum !== null) payload.precio_suscripcion = precioNum
      if (formData.correo) payload.correo = formData.correo
      if (formData.contrasena) payload.contrasena = formData.contrasena

      ejecutar = async () => editingItem?.id
        ? supabase.from('cuentas_clientes').update(payload).eq('id', editingItem.id)
        : supabase.from('cuentas_clientes').insert([payload])
    } else if (tab === 'madres') {
      const correo = (formData.correo || '').trim()
      const pass = (formData.contrasena || '').trim()
      const proveedor = (formData.proveedor || '').trim()
      const servicio = (formData.servicio || '').trim()
      const adquisicion = formData.fecha_adquisicion || hoyISO()
      const vencimiento = formData.fecha_vencimiento || ''

      if (!proveedor) return alertar('Escribe el proveedor.')
      if (!servicio) return alertar('Escribe el servicio.')
      if (!validarCorreo(correo)) return alertar('El correo no es válido.')
      if (!pass) return alertar('La contraseña es obligatoria.')
      if (!vencimiento) return alertar('Elige la fecha de vencimiento.')
      if (vencimiento < adquisicion) return alertar('La fecha de vencimiento no puede ser anterior a la de adquisición.')

      let urlPanel: string | null = null
      if ((formData.panel_url || '').trim()) {
        urlPanel = normalizarUrl(formData.panel_url)
        if (!urlPanel) return alertar('El enlace del panel no es válido (ej. https://panel.com/login).')
      }

      const payload: any = {
        proveedor,
        servicio,
        correo,
        contrasena: pass,
        fecha_adquisicion: adquisicion,
        fecha_vencimiento: vencimiento,
        panel_url: urlPanel,
        panel_usuario: (formData.panel_usuario || '').trim() || null,
        panel_id: (formData.panel_id || '').trim() || null,
      }
      if (formData.codigo_panel) payload.codigo_panel = formData.codigo_panel

      ejecutar = async () => editingItem?.id
        ? supabase.from('cuentas_madre').update(payload).eq('id', editingItem.id)
        : supabase.from('cuentas_madre').insert([payload])
    } else if (tab === 'precios') {
      const precioNum = formData.precio ? Number(formData.precio) : 0
      if (isNaN(precioNum) || precioNum < 0) return alertar('El precio debe ser un número mayor o igual a 0.')

      const payload: any = {
        nombre: (formData.nombre || formData.servicio || 'Servicio').trim(),
        categoria: formData.categoria || 'perfil',
        precio: precioNum,
        descripcion: formData.descripcion || ''
      }

      if (editingItem?.id) {
        ejecutar = async () => supabase.from('servicios_catalogo').update(payload).eq('id', editingItem.id)
      } else {
        // El panel de cliente filtra por activo = true
        payload.activo = true
        ejecutar = async () => supabase.from('servicios_catalogo').insert([payload])
      }
    }

    if (!ejecutar) return

    setGuardando(true)
    const res = await ejecutar()
    error = res.error

    if (error) {
      console.error('Error al guardar:', error)
      alert(`❌ Error al guardar: ${error.message}`)
      setGuardando(false)
      return
    }

    setIsModalOpen(false)
    setEditingItem(null)
    setFormData({})
    await loadAllData()
    setGuardando(false)
  }

  const handleDelete = async (table: string, id: any) => {
    if (confirm('¿Deseas eliminar este registro?')) {
      const { error } = await supabase.from(table).delete().eq('id', id)
      if (error) alert(`❌ Error al eliminar: ${error.message}`)
      await loadAllData()
    }
  }

  const handleUpdateReporteStatus = async (id: any, nuevoEstatus: string) => {
    const mensajeSolucion = solucionesInput[id] || ''
    
    const { error } = await supabase.from('reportes').update({ 
      estatus: nuevoEstatus,
      estado: nuevoEstatus.toLowerCase(),
      atendido: nuevoEstatus === 'Resuelto',
      solucion: mensajeSolucion 
    }).eq('id', id)

    if (error) alert(`❌ Error al actualizar reporte: ${error.message}`)

    await loadAllData()
  }

  const applyFilters = (items: any[]) => {
    return items.filter((item) => {
      const itemText = JSON.stringify(item).toLowerCase()
      const matchSearch = itemText.includes(filter.toLowerCase())

      if (selectedServicio === 'Todos') return matchSearch

      const servLower = (item.servicio || item.nombre || '').toLowerCase()

      let matchServicio = false
      if (selectedServicio === 'Max / HBO Max') {
        matchServicio = servLower.includes('max') || servLower.includes('hbo') || servLower.includes('máximo')
      } else if (selectedServicio === 'Disney+') {
        matchServicio = servLower.includes('disney')
      } else if (selectedServicio === 'Prime Video') {
        matchServicio = servLower.includes('prime') || servLower.includes('amazon')
      } else {
        matchServicio = servLower.includes(selectedServicio.toLowerCase())
      }

      return matchSearch && matchServicio
    })
  }

  /* ───────── Enviar cuenta a un cliente ───────── */

  const perfilesPorId: Record<string, any> = {}
  perfiles.forEach((p) => { perfilesPorId[p.id] = p })

  const abrirEnviar = (item: any) => {
    const madre = item.cuenta_madre_id
      ? cuentasMadre.find(m => String(m.id) === String(item.cuenta_madre_id))
      : null
    setSendItem(item)
    setClienteQuery('')
    setClienteSel(item.usuario_id ? (perfilesPorId[item.usuario_id] || null) : null)
    setSendError('')
    setIncluirPanel(!!item.panel_url)
    setPanelForm({
      url: item.panel_url || madre?.panel_url || '',
      usuario: item.panel_usuario || madre?.panel_usuario || '',
      id: item.panel_id || madre?.panel_id || '',
    })
  }

  const cerrarEnviar = () => {
    setSendItem(null)
    setClienteSel(null)
    setClienteQuery('')
    setSendError('')
  }

  const handleEnviarCliente = async () => {
    if (!sendItem) return
    setSendError('')

    const destino = clienteSel
    if (!destino) { setSendError('Selecciona al cliente destino.'); return }
    if (!(sendItem.correo_cuenta || '').trim() || !(sendItem.contrasena_cuenta || '').trim()) {
      setSendError('Esta cuenta no tiene correo o contraseña. Edítala antes de enviarla.')
      return
    }

    let urlPanel: string | null = null
    if (incluirPanel) {
      urlPanel = normalizarUrl(panelForm.url)
      if (!urlPanel) { setSendError('Escribe un enlace válido para el panel (ej. https://panel.com/login).'); return }
      if (!panelForm.usuario.trim() && !panelForm.id.trim()) { setSendError('Agrega el usuario o el ID del panel.'); return }
    }

    if (getSemaforoStatus(sendItem.fecha_vencimiento).label === 'Vencida') {
      if (!confirm('Esta cuenta ya está vencida. ¿Enviarla de todos modos?')) return
    }

    if (sendItem.usuario_id && sendItem.usuario_id !== destino.id) {
      const actual = perfilesPorId[sendItem.usuario_id]
      const quien = `${actual?.nombre || 'otro cliente'}${actual?.cliente_id ? ` (@${actual.cliente_id})` : ''}`
      if (!confirm(`Esta cuenta ya está enviada a ${quien}.\n\n¿Reasignarla a ${destino.nombre} (@${destino.cliente_id})?`)) return
    }

    setEnviando(true)
    const { error } = await supabase
      .from('cuentas_clientes')
      .update({
        usuario_id: destino.id,
        entregado_at: new Date().toISOString(),
        panel_url: incluirPanel ? urlPanel : null,
        panel_usuario: incluirPanel ? (panelForm.usuario.trim() || null) : null,
        panel_id: incluirPanel ? (panelForm.id.trim() || null) : null,
      })
      .eq('id', sendItem.id)
    setEnviando(false)

    if (error) {
      setSendError(`No se pudo enviar: ${error.message}`)
      return
    }

    cerrarEnviar()
    await loadAllData()
    mostrarToast('ok', `Cuenta enviada a ${destino.nombre} (@${destino.cliente_id})${incluirPanel ? ' con panel de códigos' : ''}.`)
  }

  const handleQuitarEnvio = async () => {
    if (!sendItem) return
    if (!confirm('¿Quitar esta cuenta del panel del cliente? Dejará de verla.')) return

    setEnviando(true)
    const { error } = await supabase
      .from('cuentas_clientes')
      .update({ usuario_id: null, entregado_at: null, panel_url: null, panel_usuario: null, panel_id: null })
      .eq('id', sendItem.id)
    setEnviando(false)

    if (error) {
      setSendError(`No se pudo quitar el envío: ${error.message}`)
      return
    }

    cerrarEnviar()
    await loadAllData()
    mostrarToast('ok', 'La cuenta ya no está asignada a ningún cliente.')
  }

  /* ───────── Reporte de vencimientos (PDF / imagen) ───────── */

  // todas = true devuelve ambas secciones sin importar los checks (sirve para mostrar los contadores)
  const armarSeccionesReporte = (todas: boolean = false): SeccionReporte[] => {
    const fuentes: { correo: string; adq: string; ven: string }[] = []
    if (repOrigen !== 'madres') {
      cuentasClientes.forEach(c => fuentes.push({ correo: c.correo_cuenta || c.correo || '', adq: c.fecha_adquisicion, ven: c.fecha_vencimiento }))
    }
    if (repOrigen !== 'clientes') {
      cuentasMadre.forEach(m => fuentes.push({ correo: m.correo || '', adq: m.fecha_adquisicion, ven: m.fecha_vencimiento }))
    }

    const vistos = new Set<string>()
    const vencidas: { fila: FilaReporte; orden: string }[] = []
    const porVencer: { fila: FilaReporte; orden: string }[] = []

    fuentes.forEach((f) => {
      const estado = getSemaforoStatus(f.ven).label
      if (estado !== 'Vencida' && estado !== 'Por Vencer') return
      // Evita repetir exactamente la misma fila
      const clave = `${f.correo.toLowerCase()}|${f.adq}|${f.ven}`
      if (vistos.has(clave)) return
      vistos.add(clave)

      const item = {
        fila: {
          correo: f.correo || '(sin correo)',
          adquisicion: formatearFecha(f.adq),
          vencimiento: formatearFecha(f.ven),
        },
        orden: String(f.ven || ''),
      }
      if (estado === 'Vencida') vencidas.push(item)
      else porVencer.push(item)
    })

    const ordenar = (arr: { fila: FilaReporte; orden: string }[]) =>
      arr.sort((a, b) => a.orden.localeCompare(b.orden)).map(x => x.fila)

    const secciones: SeccionReporte[] = []
    if (todas || repVencidas) secciones.push({ titulo: 'Cuentas vencidas', tono: 'danger', filas: ordenar(vencidas) })
    if (todas || repPorVencer) secciones.push({ titulo: 'Cuentas por vencer', tono: 'warning', filas: ordenar(porVencer) })
    return secciones
  }

  const handleGenerarReporte = async (formato: 'pdf' | 'png') => {
    const secciones = armarSeccionesReporte()
    if (secciones.every(s => s.filas.length === 0)) return

    setGenerando(formato)
    try {
      await descargarReporte(secciones, formato)
      mostrarToast('ok', formato === 'pdf' ? 'Reporte PDF descargado.' : 'Reporte en imagen descargado.')
    } catch (err: any) {
      console.error(err)
      alert(`❌ No se pudo generar el reporte: ${err?.message || err}`)
    }
    setGenerando(null)
  }

  /* ───────── Tokens visuales ───────── */
  const ui = {
    page: darkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900',
    card: darkMode ? 'bg-slate-800/70 border-slate-700' : 'bg-white border-slate-200 shadow-sm',
    cardInner: darkMode ? 'bg-slate-900/60 border-slate-700' : 'bg-slate-50 border-slate-200',
    modal: darkMode ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-800',
    muted: darkMode ? 'text-slate-400' : 'text-slate-500',
    border: darkMode ? 'border-slate-700' : 'border-slate-200',
    thead: darkMode ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-50 text-slate-500 border-slate-200',
    divide: darkMode ? 'divide-slate-700/60' : 'divide-slate-100',
    rowHover: darkMode ? 'hover:bg-slate-700/30' : 'hover:bg-slate-50',
    input: `w-full px-3.5 py-2.5 rounded-xl text-sm border outline-none transition focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 ${
      darkMode ? 'bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500 [color-scheme:dark]' : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
    }`,
    btnPrimary: 'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 shadow-sm transition active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed',
    btnGhost: `inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium border transition ${
      darkMode ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm'
    }`,
    iconBtn: `p-2 rounded-lg transition ${darkMode ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100'}`,
  }

  /* ───────── Datos derivados ───────── */
  const reportesPendientes = reportes.filter(r => (r.estatus || r.estado)?.toLowerCase() !== 'resuelto').length
  const clientesPorVencer = cuentasClientes.filter(c => getSemaforoStatus(c.fecha_vencimiento).label === 'Por Vencer').length
  const clientesVencidas = cuentasClientes.filter(c => getSemaforoStatus(c.fecha_vencimiento).label === 'Vencida').length
  const clientesEnviadas = cuentasClientes.filter(c => !!c.usuario_id).length

  const clientesVisibles = ordenarPorVencimiento(applyFilters(cuentasClientes))
  const madresVisibles = ordenarPorVencimiento(applyFilters(cuentasMadre))
  const preciosVisibles = applyFilters(servicios)
  const reportesVisibles = applyFilters(reportes)

  const hayFiltros = filter.trim() !== '' || selectedServicio !== 'Todos'
  const limpiarFiltros = () => { setFilter(''); setSelectedServicio('Todos') }
  const abrirCrear = () => { setEditingItem(null); setFormData({ fecha_adquisicion: hoyISO() }); setIsModalOpen(true) }

  // Clientes que se pueden elegir al enviar (solo los que ya definieron su ID)
  const consultaCliente = clienteQuery.trim().toLowerCase().replace(/^@/, '')
  const clientesCoincidentes = consultaCliente
    ? perfiles
        .filter(p => p.rol !== 'admin' && p.cliente_id &&
          [p.nombre, p.cliente_id, p.correo].some((v: any) => String(v || '').toLowerCase().includes(consultaCliente)))
        .slice(0, 6)
    : []

  // Conteo en vivo para el reporte
  const seccionesPreview = reporteOpen ? armarSeccionesReporte(true) : []
  const totalReporte = reporteOpen
    ? armarSeccionesReporte().reduce((acc, s) => acc + s.filas.length, 0)
    : 0

  const tabs = [
    { id: 'clientes', name: 'Cuentas clientes', icon: Users, count: cuentasClientes.length },
    { id: 'madres', name: 'Cuentas madre', icon: Server, count: cuentasMadre.length },
    { id: 'precios', name: 'Precios y combo del mes', icon: Tag, count: servicios.length },
    { id: 'reportes', name: 'Reportes', icon: LifeBuoy, count: reportesPendientes },
  ] as const

  const emptyAction = hayFiltros ? (
    <button onClick={limpiarFiltros} className={ui.btnGhost}>Limpiar filtros</button>
  ) : tab !== 'reportes' ? (
    <button onClick={abrirCrear} className={ui.btnPrimary}><Plus size={16} /> Crear registro</button>
  ) : undefined

  /* ───────── Carga inicial (skeleton) ───────── */
  if (loading) {
    return (
      <div className={`min-h-screen p-4 md:p-8 ${ui.page}`}>
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex justify-between items-center gap-4">
            <div className="space-y-2">
              <Skeleton dark={darkMode} className="h-7 w-64" />
              <Skeleton dark={darkMode} className="h-4 w-80 max-w-full" />
            </div>
            <Skeleton dark={darkMode} className="h-10 w-40" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} dark={darkMode} className="h-24" />)}
          </div>
          <Skeleton dark={darkMode} className="h-11 w-full" />
          <div className="space-y-3">
            {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} dark={darkMode} className="h-16 w-full" />)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen transition-colors duration-200 p-4 md:p-8 ${ui.page}`}>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header Admin */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Panel de administración</h1>
            <p className={`text-sm mt-0.5 ${ui.muted}`}>
              Gestiona cuentas, precios, combos y reportes de soporte.
              {ultimaSync && (
                <span className="ml-1.5 text-xs">
                  · Actualizado {ultimaSync.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setReporteOpen(true)} className={ui.btnGhost} title="Descargar reporte de vencimientos">
              <FileText size={16} /> <span>Reporte de vencimientos</span>
            </button>
            <button onClick={handleSincronizar} className={ui.btnGhost} title="Actualizar datos ahora">
              <RefreshCw size={16} className={sincronizando ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>
            <Link href="/admin/reportes" className={ui.btnGhost}>
              <ExternalLink size={16} /> <span>Vista de reportes</span>
            </Link>
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

        {/* KPIs */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard dark={darkMode} icon={Users} tone="info" label="Clientes" value={cuentasClientes.length} hint={`${clientesEnviadas} enviadas a clientes`} />
          <KpiCard dark={darkMode} icon={Server} tone="neutral" label="Cuentas madre" value={cuentasMadre.length} hint="Cuentas base" />
          <KpiCard
            dark={darkMode}
            icon={Clock}
            tone={clientesVencidas > 0 ? 'danger' : 'warning'}
            label="Por vencer (5 días)"
            value={clientesPorVencer}
            hint={`${clientesVencidas} vencidas`}
          />
          <KpiCard
            dark={darkMode}
            icon={LifeBuoy}
            tone={reportesPendientes > 0 ? 'warning' : 'success'}
            label="Reportes abiertos"
            value={reportesPendientes}
            hint={reportesPendientes > 0 ? 'Requieren atención' : 'Todo al día'}
          />
        </section>

        {/* Navegación por pestañas */}
        <nav className={`flex overflow-x-auto gap-1 border-b ${ui.border}`}>
          {tabs.map((t) => {
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); setFilter(''); setSelectedServicio('Todos'); }}
                className={`whitespace-nowrap inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition ${
                  active
                    ? (darkMode ? 'border-indigo-400 text-indigo-300' : 'border-indigo-600 text-indigo-700')
                    : `border-transparent ${ui.muted} ${darkMode ? 'hover:text-slate-200' : 'hover:text-slate-800'}`
                }`}
              >
                <t.icon size={16} />
                {t.name}
                <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full border ${
                  t.id === 'reportes' && t.count > 0 ? toneClasses(darkMode, 'warning') : toneClasses(darkMode, 'neutral')
                }`}>
                  {t.count}
                </span>
              </button>
            )
          })}
        </nav>

        {/* Buscador & Filtro por Servicio */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <Search size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${ui.muted}`} />
              <input
                type="text"
                placeholder="Buscar por correo, cliente o detalles"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className={`${ui.input} pl-10`}
              />
            </div>

            <select
              value={selectedServicio}
              onChange={(e) => setSelectedServicio(e.target.value)}
              className={`${ui.input} sm:w-auto`}
            >
              {serviciosFiltro.map((s) => (
                <option key={s} value={s}>{s === 'Todos' ? 'Todos los servicios' : s}</option>
              ))}
            </select>
          </div>

          {tab !== 'reportes' && (
            <button onClick={abrirCrear} className={ui.btnPrimary}>
              <Plus size={16} /> Crear registro
            </button>
          )}
        </div>

        {/* TABLA: Cuentas Clientes */}
        {tab === 'clientes' && (
          <div className={`border rounded-2xl overflow-hidden ${ui.card}`}>
            {clientesVisibles.length === 0 ? (
              <EmptyState
                dark={darkMode}
                icon={hayFiltros ? SearchX : Users}
                title={hayFiltros ? 'No encontramos clientes con ese filtro' : 'Aún no hay clientes registrados'}
                text={hayFiltros ? 'Prueba con otro correo o servicio, o limpia los filtros.' : 'Crea el primer registro para empezar a controlar vencimientos.'}
                action={emptyAction}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[1100px]">
                  <thead className={`${ui.thead} border-b text-xs font-semibold`}>
                    <tr>
                      <th className="px-4 py-3">Cliente</th>
                      <th className="px-4 py-3">Correo y contraseña de la cuenta</th>
                      <th className="px-4 py-3">Servicio</th>
                      <th className="px-4 py-3">Perfil / PIN</th>
                      <th className="px-4 py-3">Precio</th>
                      <th className="px-4 py-3">Vencimiento</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3">Enviada a</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${ui.divide}`}>
                    {clientesVisibles.map((item) => {
                      const semaforo = getSemaforoStatus(item.fecha_vencimiento)
                      const destino = item.usuario_id ? perfilesPorId[item.usuario_id] : null
                      return (
                        <tr key={item.id} className={`transition-colors ${ui.rowHover}`}>
                          <td className="px-4 py-3.5 font-semibold">
                            {item.nombre_completo || '-'}
                            {item.correo && <div className={`text-[11px] font-normal ${ui.muted}`}>{item.correo}</div>}
                          </td>
                          <td className="px-4 py-3.5 font-mono text-xs">
                            <span className={`font-semibold ${darkMode ? 'text-indigo-300' : 'text-indigo-700'}`}>{item.correo_cuenta || item.correo || '-'}</span>
                            <br />
                            <span className={ui.muted}>Pass: {item.contrasena_cuenta || item.contrasena || 'S/N'}</span>
                          </td>
                          <td className="px-4 py-3.5 font-semibold">{item.servicio || '-'}</td>
                          <td className="px-4 py-3.5 font-mono text-xs">{item.perfil_asignado || '-'} <span className={ui.muted}>(PIN: {item.pin_perfil || 'S/N'})</span></td>
                          <td className={`px-4 py-3.5 font-semibold whitespace-nowrap ${darkMode ? 'text-emerald-300' : 'text-emerald-700'}`}>${item.precio_suscripcion || 0} MXN</td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {formatearFecha(item.fecha_vencimiento)}
                            <div className={`text-[11px] ${ui.muted}`}>{textoDias(semaforo.dias)}</div>
                          </td>
                          <td className="px-4 py-3.5">
                            <Pill dark={darkMode} tone={semaforo.tone}>{semaforo.label}</Pill>
                          </td>
                          <td className="px-4 py-3.5">
                            {item.usuario_id ? (
                              <div className="space-y-1">
                                <Pill dark={darkMode} tone="success">
                                  <UserCheck size={12} />
                                  {destino ? `${destino.nombre || 'Cliente'}${destino.cliente_id ? ` · @${destino.cliente_id}` : ''}` : 'Cliente no encontrado'}
                                </Pill>
                                {item.panel_url && <div><Pill dark={darkMode} tone="info"><Globe size={12} /> Con panel</Pill></div>}
                              </div>
                            ) : (
                              <Pill dark={darkMode} tone="neutral">Sin enviar</Pill>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                              <button
                                onClick={() => abrirEnviar(item)}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 transition`}
                                title="Enviar esta cuenta al panel de un cliente"
                              >
                                <Send size={14} /> {item.usuario_id ? 'Reenviar' : 'Enviar'}
                              </button>
                              <button
                                onClick={() => handleCopiarDatosCliente(item)}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
                                  copiedId === item.id
                                    ? toneClasses(darkMode, 'success')
                                    : (darkMode ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20' : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100')
                                }`}
                              >
                                {copiedId === item.id ? <Check size={14} /> : <Copy size={14} />}
                                {copiedId === item.id ? '¡Copiado!' : 'Copiar'}
                              </button>
                              <button onClick={() => { setEditingItem(item); setFormData(item); setIsModalOpen(true); }} className={ui.iconBtn} title="Editar" aria-label="Editar">
                                <Pencil size={16} />
                              </button>
                              <button onClick={() => handleDelete('cuentas_clientes', item.id)} className={`p-2 rounded-lg transition ${darkMode ? 'text-rose-300 hover:bg-rose-500/10' : 'text-rose-600 hover:bg-rose-50'}`} title="Eliminar" aria-label="Eliminar">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TABLA: Cuentas Madre */}
        {tab === 'madres' && (
          <div className={`border rounded-2xl overflow-hidden ${ui.card}`}>
            {madresVisibles.length === 0 ? (
              <EmptyState
                dark={darkMode}
                icon={hayFiltros ? SearchX : Server}
                title={hayFiltros ? 'No encontramos cuentas madre con ese filtro' : 'Aún no hay cuentas madre'}
                text={hayFiltros ? 'Prueba con otro proveedor o servicio, o limpia los filtros.' : 'Registra tus cuentas base para saber cuándo renovarlas.'}
                action={emptyAction}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[900px]">
                  <thead className={`${ui.thead} border-b text-xs font-semibold`}>
                    <tr>
                      <th className="px-4 py-3">Proveedor</th>
                      <th className="px-4 py-3">Código panel</th>
                      <th className="px-4 py-3">Servicio</th>
                      <th className="px-4 py-3">Correo y contraseña</th>
                      <th className="px-4 py-3">Fecha adquisición</th>
                      <th className="px-4 py-3">Fecha vencimiento</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${ui.divide}`}>
                    {madresVisibles.map((item) => {
                      const semaforo = getSemaforoStatus(item.fecha_vencimiento)
                      return (
                        <tr key={item.id} className={`transition-colors ${ui.rowHover}`}>
                          <td className="px-4 py-3.5 font-semibold">{item.proveedor || '-'}</td>
                          <td className={`px-4 py-3.5 font-mono text-xs ${darkMode ? 'text-indigo-300' : 'text-indigo-700'}`}>
                            {item.codigo_panel || '-'}
                            {item.panel_url && <div className="mt-1"><Pill dark={darkMode} tone="info"><Globe size={12} /> Con panel</Pill></div>}
                          </td>
                          <td className="px-4 py-3.5 font-semibold">{item.servicio || '-'}</td>
                          <td className="px-4 py-3.5 font-mono text-xs">
                            <span className={`font-semibold ${darkMode ? 'text-indigo-300' : 'text-indigo-700'}`}>{item.correo || '-'}</span>
                            <br />
                            <span className={ui.muted}>Pass: {item.contrasena || 'S/N'}</span>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">{formatearFecha(item.fecha_adquisicion)}</td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {formatearFecha(item.fecha_vencimiento)}
                            <div className={`text-[11px] ${ui.muted}`}>{textoDias(semaforo.dias)}</div>
                          </td>
                          <td className="px-4 py-3.5">
                            <Pill dark={darkMode} tone={semaforo.tone}>{semaforo.label}</Pill>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                              <button onClick={() => { setEditingItem(item); setFormData(item); setIsModalOpen(true); }} className={ui.iconBtn} title="Editar" aria-label="Editar">
                                <Pencil size={16} />
                              </button>
                              <button onClick={() => handleDelete('cuentas_madre', item.id)} className={`p-2 rounded-lg transition ${darkMode ? 'text-rose-300 hover:bg-rose-500/10' : 'text-rose-600 hover:bg-rose-50'}`} title="Eliminar" aria-label="Eliminar">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TABLA: Precios y Combo del Mes */}
        {tab === 'precios' && (
          <div className={`border rounded-2xl p-5 space-y-4 ${ui.card}`}>
            <div>
              <h2 className="font-semibold">Catálogo de precios y oferta del mes</h2>
              <p className={`text-xs mt-0.5 ${ui.muted}`}>Lo que guardes aquí lo ven los clientes en su panel.</p>
            </div>
            {preciosVisibles.length === 0 ? (
              <EmptyState
                dark={darkMode}
                icon={hayFiltros ? SearchX : Tag}
                title={hayFiltros ? 'No encontramos precios con ese filtro' : 'Tu catálogo está vacío'}
                text={hayFiltros ? 'Prueba con otro nombre o limpia los filtros.' : 'Agrega perfiles, cuentas completas o el combo del mes.'}
                action={emptyAction}
              />
            ) : (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {preciosVisibles.map((s) => (
                  <div key={s.id} className={`p-4 border rounded-xl flex justify-between items-start gap-3 ${ui.cardInner}`}>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{s.nombre || s.servicio}</span>
                        <Pill dark={darkMode} tone="info">{s.categoria || 'General'}</Pill>
                      </div>
                      <p className={`text-xs mt-1 ${ui.muted}`}>{s.descripcion}</p>
                      <p className={`text-lg font-bold mt-2 ${darkMode ? 'text-indigo-300' : 'text-indigo-700'}`}>${s.precio} MXN</p>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <button onClick={() => { setEditingItem(s); setFormData(s); setIsModalOpen(true); }} className={ui.iconBtn} title="Editar" aria-label="Editar">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => handleDelete('servicios_catalogo', s.id)} className={`p-2 rounded-lg transition ${darkMode ? 'text-rose-300 hover:bg-rose-500/10' : 'text-rose-600 hover:bg-rose-50'}`} title="Eliminar" aria-label="Eliminar">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MÓDULO: Reportes */}
        {tab === 'reportes' && (
          <div className={`border rounded-2xl p-5 space-y-4 ${ui.card}`}>
            <div>
              <h2 className="font-semibold">Atención de soporte</h2>
              <p className={`text-xs mt-0.5 ${ui.muted}`}>Responde al cliente y cambia el estado del reporte.</p>
            </div>

            {reportesVisibles.length === 0 ? (
              <EmptyState
                dark={darkMode}
                icon={hayFiltros ? SearchX : Inbox}
                title={hayFiltros ? 'No hay reportes que coincidan' : 'Sin reportes por ahora'}
                text={hayFiltros ? 'Prueba con otra búsqueda o limpia los filtros.' : 'Cuando un cliente envíe un reporte aparecerá aquí al instante.'}
                action={emptyAction}
              />
            ) : (
              <div className="space-y-4">
                {reportesVisibles.map((rep) => {
                  const estatusActual = (rep.estatus || rep.estado || 'Pendiente').toLowerCase()
                  const tone: Tone = estatusActual === 'resuelto' ? 'success' : estatusActual === 'en proceso' ? 'info' : 'warning'
                  return (
                    <div key={rep.id} className={`p-4 sm:p-5 border rounded-2xl space-y-3 ${ui.cardInner}`}>
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-base">{getTituloReporte(rep)}</span>
                            <Pill dark={darkMode} tone={tone}>{rep.estatus || rep.estado || 'Pendiente'}</Pill>
                          </div>
                          <p className={`text-xs ${ui.muted}`}>
                            <strong className={darkMode ? 'text-slate-200' : 'text-slate-700'}>Cliente:</strong> {rep.nombre_cliente || 'No especificado'}
                          </p>
                          <p className={`text-xs font-mono ${ui.muted}`}>
                            <strong className={darkMode ? 'text-slate-200' : 'text-slate-700'}>Cuenta afectada:</strong>{' '}
                            <span className={`font-semibold ${darkMode ? 'text-indigo-300' : 'text-indigo-700'}`}>{rep.correo_cuenta || 'N/A'}</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => handleUpdateReporteStatus(rep.id, 'En Proceso')} className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition ${toneClasses(darkMode, 'info')} hover:opacity-80`}>
                            En proceso
                          </button>
                          <button onClick={() => handleUpdateReporteStatus(rep.id, 'Resuelto')} className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition ${toneClasses(darkMode, 'success')} hover:opacity-80`}>
                            Resolver
                          </button>
                        </div>
                      </div>

                      <div className={`p-3.5 rounded-xl border text-sm space-y-2 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                        <div className={`grid sm:grid-cols-3 gap-2 font-mono text-xs pb-2 border-b ${ui.border}`}>
                          <p><strong>Contraseña:</strong> {rep.contrasena_cuenta || 'N/A'}</p>
                          <p><strong>Perfil:</strong> {rep.perfil || rep.perfil_asignado || 'N/A'}</p>
                          <p><strong>PIN:</strong> {rep.pin || rep.pin_perfil || 'N/A'}</p>
                        </div>
                        <p className="whitespace-pre-line"><strong>Falla reportada:</strong> {getDescripcionReporte(rep)}</p>

                        <div className={`pt-2 border-t space-y-1 ${ui.border}`}>
                          <label className={`block text-xs font-medium ${darkMode ? 'text-indigo-300' : 'text-indigo-700'}`}>Mensaje o indicaciones para el cliente</label>
                          <input
                            type="text"
                            placeholder="Ej. Contraseña actualizada a 'X123' / Reinicia tu sesión"
                            value={solucionesInput[rep.id] || ''}
                            onChange={(e) => setSolucionesInput({ ...solucionesInput, [rep.id]: e.target.value })}
                            className={ui.input}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ───────── Modal: Crear / Editar ───────── */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-start sm:items-center justify-center p-4 z-50 overflow-y-auto">
            <div className={`border w-full max-w-md p-6 rounded-2xl shadow-2xl space-y-4 my-8 ${ui.modal}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-lg">{editingItem ? 'Editar registro' : 'Nuevo registro'}</h3>
                  <p className={`text-xs ${ui.muted}`}>Los campos con * son obligatorios.</p>
                </div>
                <button type="button" onClick={() => setIsModalOpen(false)} className={ui.iconBtn} aria-label="Cerrar">
                  <X size={18} />
                </button>
              </div>
              
              <form onSubmit={handleSave} className="space-y-3">
                {tab === 'clientes' && (
                  <>
                    <Field dark={darkMode} label="Cuenta madre de origen (opcional)">
                      <select
                        value={formData.cuenta_madre_id ?? ''}
                        onChange={(e) => {
                          const idSel = e.target.value
                          const madre = cuentasMadre.find(m => String(m.id) === idSel)
                          setFormData((prev: any) => ({
                            ...prev,
                            cuenta_madre_id: idSel ? Number(idSel) : null,
                            // Solo rellena lo que esté vacío
                            ...(madre ? {
                              servicio: prev.servicio || madre.servicio || '',
                              correo_cuenta: prev.correo_cuenta || madre.correo || '',
                              contrasena_cuenta: prev.contrasena_cuenta || madre.contrasena || '',
                            } : {})
                          }))
                        }}
                        className={ui.input}
                      >
                        <option value="">Sin cuenta madre</option>
                        {cuentasMadre.map((m) => (
                          <option key={m.id} value={m.id}>{`${m.servicio || 'Servicio'} · ${m.correo || 's/n'}`}</option>
                        ))}
                      </select>
                    </Field>
                    <Field dark={darkMode} label="Nombre completo *">
                      <input type="text" required placeholder="Nombre completo" value={formData.nombre_completo || ''} onChange={(e) => setFormData({...formData, nombre_completo: e.target.value})} className={ui.input} />
                    </Field>
                    <Field dark={darkMode} label="Correo de la cuenta *">
                      <input type="email" required placeholder="Correo de la cuenta" value={formData.correo_cuenta || ''} onChange={(e) => setFormData({...formData, correo_cuenta: e.target.value})} className={ui.input} />
                    </Field>
                    <Field dark={darkMode} label="Contraseña de la cuenta *">
                      <input type="text" required placeholder="Contraseña de la cuenta" value={formData.contrasena_cuenta || ''} onChange={(e) => setFormData({...formData, contrasena_cuenta: e.target.value})} className={ui.input} />
                    </Field>
                    <Field dark={darkMode} label="Servicio *">
                      <input type="text" required placeholder="Servicio (ej. Disney+)" value={formData.servicio || ''} onChange={(e) => setFormData({...formData, servicio: e.target.value})} className={ui.input} />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field dark={darkMode} label="Perfil asignado">
                        <input type="text" placeholder="Perfil asignado" value={formData.perfil_asignado || ''} onChange={(e) => setFormData({...formData, perfil_asignado: e.target.value})} className={ui.input} />
                      </Field>
                      <Field dark={darkMode} label="PIN de perfil">
                        <input type="text" placeholder="PIN de perfil" value={formData.pin_perfil || ''} onChange={(e) => setFormData({...formData, pin_perfil: e.target.value})} className={ui.input} />
                      </Field>
                    </div>
                    <Field dark={darkMode} label="Precio de suscripción (MXN)">
                      <input type="number" min="0" placeholder="Precio suscripción MXN" value={formData.precio_suscripcion ?? ''} onChange={(e) => setFormData({...formData, precio_suscripcion: e.target.value})} className={ui.input} />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field dark={darkMode} label="Fecha de adquisición *">
                        <input type="date" required value={formData.fecha_adquisicion || ''} onChange={(e) => setFormData({...formData, fecha_adquisicion: e.target.value})} className={ui.input} />
                      </Field>
                      <Field dark={darkMode} label="Fecha de vencimiento *">
                        <input type="date" required value={formData.fecha_vencimiento || ''} onChange={(e) => setFormData({...formData, fecha_vencimiento: e.target.value})} className={ui.input} />
                      </Field>
                    </div>
                  </>
                )}

                {tab === 'madres' && (
                  <>
                    <Field dark={darkMode} label="Proveedor *">
                      <input type="text" required placeholder="Proveedor" value={formData.proveedor || ''} onChange={(e) => setFormData({...formData, proveedor: e.target.value})} className={ui.input} />
                    </Field>
                    <Field dark={darkMode} label="Código panel">
                      <input type="text" placeholder="Código Panel" value={formData.codigo_panel || ''} onChange={(e) => setFormData({...formData, codigo_panel: e.target.value})} className={ui.input} />
                    </Field>
                    <Field dark={darkMode} label="Servicio *">
                      <input type="text" required placeholder="Servicio" value={formData.servicio || ''} onChange={(e) => setFormData({...formData, servicio: e.target.value})} className={ui.input} />
                    </Field>
                    <Field dark={darkMode} label="Correo *">
                      <input type="email" required placeholder="Correo" value={formData.correo || ''} onChange={(e) => setFormData({...formData, correo: e.target.value})} className={ui.input} />
                    </Field>
                    <Field dark={darkMode} label="Contraseña *">
                      <input type="text" required placeholder="Contraseña" value={formData.contrasena || ''} onChange={(e) => setFormData({...formData, contrasena: e.target.value})} className={ui.input} />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field dark={darkMode} label="Fecha de adquisición *">
                        <input type="date" required value={formData.fecha_adquisicion || ''} onChange={(e) => setFormData({...formData, fecha_adquisicion: e.target.value})} className={ui.input} />
                      </Field>
                      <Field dark={darkMode} label="Fecha de vencimiento *">
                        <input type="date" required value={formData.fecha_vencimiento || ''} onChange={(e) => setFormData({...formData, fecha_vencimiento: e.target.value})} className={ui.input} />
                      </Field>
                    </div>

                    <div className={`pt-3 border-t space-y-3 ${ui.border}`}>
                      <div>
                        <p className="text-sm font-semibold flex items-center gap-1.5"><Globe size={14} /> Panel de códigos (opcional)</p>
                        <p className={`text-xs ${ui.muted}`}>Si lo llenas, al enviar una cuenta de esta madre podrás mandar estos datos al cliente.</p>
                      </div>
                      <Field dark={darkMode} label="Enlace del panel">
                        <input type="text" placeholder="https://panel.com/login" value={formData.panel_url || ''} onChange={(e) => setFormData({...formData, panel_url: e.target.value})} className={ui.input} />
                      </Field>
                      <div className="grid grid-cols-2 gap-3">
                        <Field dark={darkMode} label="Usuario del panel">
                          <input type="text" placeholder="Usuario" value={formData.panel_usuario || ''} onChange={(e) => setFormData({...formData, panel_usuario: e.target.value})} className={ui.input} />
                        </Field>
                        <Field dark={darkMode} label="ID del panel">
                          <input type="text" placeholder="ID" value={formData.panel_id || ''} onChange={(e) => setFormData({...formData, panel_id: e.target.value})} className={ui.input} />
                        </Field>
                      </div>
                    </div>
                  </>
                )}

                {tab === 'precios' && (
                  <>
                    <Field dark={darkMode} label="Nombre del servicio o producto">
                      <input type="text" placeholder="Nombre Servicio / Producto" value={formData.nombre || ''} onChange={(e) => setFormData({...formData, nombre: e.target.value})} className={ui.input} />
                    </Field>
                    <Field dark={darkMode} label="Categoría">
                      <select value={formData.categoria || 'perfil'} onChange={(e) => setFormData({...formData, categoria: e.target.value})} className={ui.input}>
                        <option value="perfil">Perfil</option>
                        <option value="completa">Cuenta Completa</option>
                        <option value="combo">Combo del Mes</option>
                      </select>
                    </Field>
                    <Field dark={darkMode} label="Precio público (MXN)">
                      <input type="number" min="0" step="0.01" placeholder="Precio Público MXN" value={formData.precio || ''} onChange={(e) => setFormData({...formData, precio: parseFloat(e.target.value)})} className={ui.input} />
                    </Field>
                    <Field dark={darkMode} label="Descripción">
                      <textarea rows={3} placeholder="Descripción" value={formData.descripcion || ''} onChange={(e) => setFormData({...formData, descripcion: e.target.value})} className={ui.input} />
                    </Field>
                  </>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className={ui.btnGhost}>Cancelar</button>
                  <button type="submit" disabled={guardando} className={ui.btnPrimary}>
                    {guardando && <Loader2 size={16} className="animate-spin" />}
                    {editingItem ? 'Guardar cambios' : 'Crear registro'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ───────── Modal: Enviar cuenta a un cliente ───────── */}
        {sendItem && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-start sm:items-center justify-center p-4 z-50 overflow-y-auto">
            <div className={`border w-full max-w-lg p-6 rounded-2xl shadow-2xl space-y-4 my-8 ${ui.modal}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-lg">Enviar cuenta al cliente</h3>
                  <p className={`text-xs ${ui.muted}`}>El cliente la verá en “Mis cuentas” de su panel al instante.</p>
                </div>
                <button type="button" onClick={cerrarEnviar} className={ui.iconBtn} aria-label="Cerrar">
                  <X size={18} />
                </button>
              </div>

              {/* Resumen de la cuenta */}
              <div className={`p-3.5 rounded-xl border text-sm space-y-1 ${ui.cardInner}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{sendItem.servicio || 'Servicio'}</span>
                  <Pill dark={darkMode} tone={getSemaforoStatus(sendItem.fecha_vencimiento).tone}>
                    {getSemaforoStatus(sendItem.fecha_vencimiento).label}
                  </Pill>
                </div>
                <p className="font-mono text-xs break-all">{sendItem.correo_cuenta || '-'}</p>
                <p className={`text-xs ${ui.muted}`}>
                  Perfil: {sendItem.perfil_asignado || '-'} · PIN: {sendItem.pin_perfil || 'S/N'} · Vence: {formatearFecha(sendItem.fecha_vencimiento)}
                </p>
                {sendItem.nombre_completo && (
                  <p className={`text-xs ${ui.muted}`}>Registrada a nombre de: <strong>{sendItem.nombre_completo}</strong></p>
                )}
              </div>

              {/* Ya enviada */}
              {sendItem.usuario_id && (
                <div className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 ${toneClasses(darkMode, 'info')}`}>
                  <span>
                    Actualmente enviada a{' '}
                    <strong>
                      {perfilesPorId[sendItem.usuario_id]
                        ? `${perfilesPorId[sendItem.usuario_id].nombre || 'Cliente'}${perfilesPorId[sendItem.usuario_id].cliente_id ? ` (@${perfilesPorId[sendItem.usuario_id].cliente_id})` : ''}`
                        : 'un cliente que ya no se encuentra'}
                    </strong>
                  </span>
                  <button type="button" onClick={handleQuitarEnvio} disabled={enviando} className="inline-flex items-center gap-1 font-semibold underline underline-offset-2 shrink-0 disabled:opacity-60">
                    <Unlink size={13} /> Quitar
                  </button>
                </div>
              )}

              {/* Paso 1: cliente */}
              <div className="space-y-2">
                <p className="text-sm font-semibold">1. ¿A quién se la envías?</p>

                {clienteSel ? (
                  <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${toneClasses(darkMode, 'success')}`}>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm flex items-center gap-1.5"><UserCheck size={15} /> {clienteSel.nombre || 'Cliente'}</p>
                      <p className="text-xs">ID: <strong>@{clienteSel.cliente_id}</strong>{clienteSel.correo ? ` · ${clienteSel.correo}` : ''}</p>
                    </div>
                    <button type="button" onClick={() => setClienteSel(null)} className="text-xs font-semibold underline underline-offset-2 shrink-0">Cambiar</button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Search size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${ui.muted}`} />
                      <input
                        type="text"
                        autoFocus
                        placeholder="Busca por ID (@paula23), nombre o correo"
                        value={clienteQuery}
                        onChange={(e) => setClienteQuery(e.target.value)}
                        className={`${ui.input} pl-10`}
                      />
                    </div>
                    {!consultaCliente ? (
                      <p className={`text-xs ${ui.muted}`}>Escribe el ID que te dio el cliente. Solo aparecen clientes que ya eligieron su ID.</p>
                    ) : clientesCoincidentes.length === 0 ? (
                      <p className={`text-xs ${ui.muted}`}>Sin resultados. Pídele al cliente que complete su nombre e ID en su panel.</p>
                    ) : (
                      <div className={`border rounded-xl divide-y overflow-hidden ${ui.border} ${ui.divide}`}>
                        {clientesCoincidentes.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setClienteSel(p)}
                            className={`w-full text-left px-3.5 py-2.5 transition ${ui.rowHover}`}
                          >
                            <span className="font-semibold text-sm">{p.nombre || 'Sin nombre'}</span>
                            <span className={`ml-2 text-xs font-mono ${darkMode ? 'text-indigo-300' : 'text-indigo-700'}`}>@{p.cliente_id}</span>
                            {p.correo && <span className={`block text-xs ${ui.muted}`}>{p.correo}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Paso 2: panel de códigos */}
              <div className="space-y-2">
                <p className="text-sm font-semibold">2. Panel de códigos (opcional)</p>
                <label className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer ${ui.cardInner}`}>
                  <input
                    type="checkbox"
                    checked={incluirPanel}
                    onChange={(e) => setIncluirPanel(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-indigo-600"
                  />
                  <span className="text-sm">
                    Enviar también el panel de códigos
                    <span className={`block text-xs ${ui.muted}`}>El cliente recibirá el enlace de acceso, el usuario y el ID.</span>
                  </span>
                </label>

                {incluirPanel && (
                  <div className="space-y-3">
                    <Field dark={darkMode} label="Enlace del panel *">
                      <input type="text" placeholder="https://panel.com/login" value={panelForm.url} onChange={(e) => setPanelForm({ ...panelForm, url: e.target.value })} className={ui.input} />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field dark={darkMode} label="Usuario">
                        <input type="text" placeholder="Usuario" value={panelForm.usuario} onChange={(e) => setPanelForm({ ...panelForm, usuario: e.target.value })} className={ui.input} />
                      </Field>
                      <Field dark={darkMode} label="ID">
                        <input type="text" placeholder="ID" value={panelForm.id} onChange={(e) => setPanelForm({ ...panelForm, id: e.target.value })} className={ui.input} />
                      </Field>
                    </div>
                    <p className={`text-xs ${ui.muted}`}>Agrega al menos el usuario o el ID.</p>
                  </div>
                )}
              </div>

              {sendError && (
                <div role="alert" className={`p-3 rounded-xl border text-sm ${toneClasses(darkMode, 'danger')}`}>{sendError}</div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={cerrarEnviar} className={ui.btnGhost}>Cancelar</button>
                <button type="button" onClick={handleEnviarCliente} disabled={enviando || !clienteSel} className={ui.btnPrimary}>
                  {enviando ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  {clienteSel ? `Enviar a ${clienteSel.nombre || '@' + clienteSel.cliente_id}` : 'Enviar al cliente'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ───────── Modal: Reporte de vencimientos ───────── */}
        {reporteOpen && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-start sm:items-center justify-center p-4 z-50 overflow-y-auto">
            <div className={`border w-full max-w-md p-6 rounded-2xl shadow-2xl space-y-4 my-8 ${ui.modal}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-lg">Reporte de vencimientos</h3>
                  <p className={`text-xs ${ui.muted}`}>Incluye solo el correo, la fecha de adquisición y la de vencimiento.</p>
                </div>
                <button type="button" onClick={() => setReporteOpen(false)} className={ui.iconBtn} aria-label="Cerrar">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold">¿Qué cuentas incluir?</p>
                <label className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer ${ui.cardInner}`}>
                  <input type="checkbox" checked={repVencidas} onChange={(e) => setRepVencidas(e.target.checked)} className="h-4 w-4 accent-indigo-600" />
                  <span className="text-sm flex-1">Vencidas</span>
                  <Pill dark={darkMode} tone="danger">{seccionesPreview.find(s => s.titulo === 'Cuentas vencidas')?.filas.length ?? 0}</Pill>
                </label>
                <label className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer ${ui.cardInner}`}>
                  <input type="checkbox" checked={repPorVencer} onChange={(e) => setRepPorVencer(e.target.checked)} className="h-4 w-4 accent-indigo-600" />
                  <span className="text-sm flex-1">Por vencer (próximos 5 días)</span>
                  <Pill dark={darkMode} tone="warning">{seccionesPreview.find(s => s.titulo === 'Cuentas por vencer')?.filas.length ?? 0}</Pill>
                </label>
              </div>

              <Field dark={darkMode} label="De qué cuentas">
                <select value={repOrigen} onChange={(e) => setRepOrigen(e.target.value as 'ambas' | 'clientes' | 'madres')} className={ui.input}>
                  <option value="ambas">Clientes y cuentas madre</option>
                  <option value="clientes">Solo cuentas de clientes</option>
                  <option value="madres">Solo cuentas madre</option>
                </select>
              </Field>

              {totalReporte === 0 ? (
                <div className={`p-3 rounded-xl border text-sm ${toneClasses(darkMode, 'neutral')}`}>
                  No hay cuentas que cumplan con esta selección.
                </div>
              ) : (
                <p className={`text-xs ${ui.muted}`}>Se incluirán <strong>{totalReporte}</strong> cuenta{totalReporte === 1 ? '' : 's'}.</p>
              )}

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleGenerarReporte('pdf')}
                  disabled={totalReporte === 0 || generando !== null}
                  className={ui.btnPrimary}
                >
                  {generando === 'pdf' ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                  Descargar PDF
                </button>
                <button
                  type="button"
                  onClick={() => handleGenerarReporte('png')}
                  disabled={totalReporte === 0 || generando !== null}
                  className={`${ui.btnGhost} disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  {generando === 'png' ? <Loader2 size={16} className="animate-spin" /> : <FileImage size={16} />}
                  Descargar imagen
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Aviso flotante */}
        {toast && (
          <div
            role="status"
            className={`fixed bottom-5 right-5 z-[60] max-w-sm px-4 py-3 rounded-xl border text-sm shadow-lg ${
              darkMode ? 'bg-slate-800' : 'bg-white'
            } ${toneClasses(darkMode, toast.tipo === 'ok' ? 'success' : 'danger')}`}
          >
            {toast.texto}
          </div>
        )}
      </div>
    </div>
  )
}