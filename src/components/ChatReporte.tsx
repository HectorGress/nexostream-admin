'use client'

import { useEffect, useRef, useState } from 'react'
import { MessageSquare, Send, Star, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { makeUi } from '@/lib/ui'
import { notificarAdmins, notificarUsuario } from '@/lib/pushCliente'

type Props = {
  reporteId: number
  rol: 'cliente' | 'admin'
  nombre: string
  destinoUid?: string | null
  dark: boolean
}

// Conversación dentro de un reporte (el cliente y el administrador se contestan aquí)
export default function ChatReporte({ reporteId, rol, nombre, destinoUid, dark }: Props) {
  const ui = makeUi(dark)
  const supabase = createClient()
  const [abierto, setAbierto] = useState(false)
  const [mensajes, setMensajes] = useState<any[]>([])
  const [cuenta, setCuenta] = useState(0)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const fin = useRef<HTMLDivElement | null>(null)
  const [rapidas, setRapidas] = useState<any[]>([])

  const cargar = async () => {
    const { data } = await supabase
      .from('reportes_mensajes')
      .select('*')
      .eq('reporte_id', reporteId)
      .order('created_at', { ascending: true })
    setMensajes(data || [])
    setCuenta((data || []).length)
  }

  // Solo el conteo, mientras está cerrado
  useEffect(() => {
    supabase
      .from('reportes_mensajes')
      .select('id', { count: 'exact', head: true })
      .eq('reporte_id', reporteId)
      .then(({ count }) => setCuenta(count || 0))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reporteId])

  // Al abrir: carga y escucha mensajes nuevos en vivo
  useEffect(() => {
    if (!abierto) return
    cargar()
    const canal = supabase
      .channel(`chat-${reporteId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reportes_mensajes', filter: `reporte_id=eq.${reporteId}` }, cargar)
      .subscribe()
    return () => {
      supabase.removeChannel(canal)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, reporteId])

  useEffect(() => {
    if (abierto) fin.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [mensajes, abierto])

  // Respuestas rápidas guardadas (solo administrador)
  const cargarRapidas = async () => {
    const { data } = await supabase.from('respuestas_rapidas').select('*').order('id', { ascending: true })
    setRapidas(data || [])
  }
  useEffect(() => {
    if (abierto && rol === 'admin') cargarRapidas()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, rol])

  const guardarRapida = async () => {
    const titulo = prompt('Nombre corto para esta respuesta (ej. "Reiniciar sesión"):')
    if (!titulo || !titulo.trim()) return
    const { error } = await supabase.from('respuestas_rapidas').insert([{ titulo: titulo.trim(), texto: texto.trim() }])
    if (error) { alert(`❌ ${error.message}`); return }
    cargarRapidas()
  }

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    const t = texto.trim()
    if (!t) return
    setEnviando(true)
    const { error } = await supabase
      .from('reportes_mensajes')
      .insert([{ reporte_id: reporteId, autor_rol: rol, autor_nombre: nombre || null, texto: t }])
    setEnviando(false)
    if (error) { alert(`❌ No se pudo enviar: ${error.message}`); return }
    setTexto('')
    cargar()
    if (rol === 'cliente') notificarAdmins('mensaje', `${nombre || 'Cliente'}: ${t}`)
    else if (destinoUid) notificarUsuario(destinoUid, 'Nuevo mensaje de soporte', t)
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setAbierto(!abierto)}
        className={`inline-flex items-center gap-2 text-xs font-semibold ${dark ? 'text-indigo-300' : 'text-indigo-700'}`}
      >
        <MessageSquare size={14} /> {abierto ? 'Ocultar conversación' : `Conversación${cuenta > 0 ? ` (${cuenta})` : ''}`}
      </button>

      {abierto && (
        <div className={`rounded-xl border p-3 space-y-2 ${ui.cardInner}`}>
          <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
            {mensajes.length === 0 && <p className={`text-xs ${ui.muted}`}>Aún no hay mensajes. Escribe el primero.</p>}
            {mensajes.map((m) => {
              const mio = m.autor_rol === rol
              return (
                <div key={m.id} className={`flex ${mio ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${
                    mio ? 'bg-indigo-600 text-white rounded-br-sm' : (dark ? 'bg-slate-700 text-slate-100 rounded-bl-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm')
                  }`}>
                    <p className={`text-[10px] font-semibold mb-0.5 ${mio ? 'text-indigo-100' : ui.muted}`}>
                      {m.autor_rol === 'admin' ? 'Soporte' : (m.autor_nombre || 'Cliente')}
                    </p>
                    <p className="whitespace-pre-line break-words">{m.texto}</p>
                    <p className={`text-[10px] mt-0.5 text-right ${mio ? 'text-indigo-200' : ui.muted}`}>
                      {new Date(m.created_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                  </div>
                </div>
              )
            })}
            <div ref={fin} />
          </div>

          {rol === 'admin' && (
            <div className="flex flex-wrap items-center gap-3">
              <select
                value=""
                onChange={(e) => {
                  const r = rapidas.find((x) => String(x.id) === e.target.value)
                  if (r) setTexto(r.texto)
                }}
                className={`${ui.input} sm:w-auto`}
              >
                <option value="">Respuestas rápidas…</option>
                {rapidas.map((r) => <option key={r.id} value={r.id}>{r.titulo}</option>)}
              </select>
              {texto.trim().length > 8 && (
                <button type="button" onClick={guardarRapida} className={`text-xs font-semibold underline underline-offset-2 ${dark ? 'text-indigo-300' : 'text-indigo-700'}`}>
                  Guardar este mensaje como respuesta
                </button>
              )}
            </div>
          )}

          <form onSubmit={enviar} className="flex gap-2">
            <input type="text" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escribe un mensaje..." className={ui.input} />
            <button type="submit" disabled={enviando || !texto.trim()} className={ui.btnPrimary} aria-label="Enviar mensaje">
              {enviando ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

// Estrellas: el cliente califica cuando el reporte está resuelto; el administrador solo las ve
export function CalificarReporte({ reporte, rol, dark }: { reporte: any; rol: 'cliente' | 'admin'; dark: boolean }) {
  const ui = makeUi(dark)
  const supabase = createClient()
  const [valor, setValor] = useState<number>(reporte.calificacion || 0)
  const resuelto = !!reporte.atendido || String(reporte.estado || reporte.estatus || '').toLowerCase() === 'resuelto'

  const guardar = async (n: number) => {
    const { error } = await supabase.from('reportes').update({ calificacion: n }).eq('id', reporte.id)
    if (error) { alert(`❌ No se pudo guardar tu calificación: ${error.message}`); return }
    setValor(n)
  }

  const estrellas = (n: number, interactivo: boolean) => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" disabled={!interactivo} onClick={() => guardar(i)} aria-label={`${i} estrellas`} className={interactivo ? 'p-0.5' : 'p-0 cursor-default'}>
          <Star size={interactivo ? 22 : 15} className={i <= n ? 'fill-amber-400 text-amber-400' : (dark ? 'text-slate-600' : 'text-slate-300')} />
        </button>
      ))}
    </div>
  )

  if (valor > 0) {
    return (
      <div className={`flex items-center gap-2 text-xs ${ui.muted}`}>
        {rol === 'admin' ? 'Calificación del cliente:' : 'Tu calificación:'} {estrellas(valor, false)}
      </div>
    )
  }
  if (rol === 'cliente' && resuelto) {
    return (
      <div className="space-y-1">
        <p className={`text-xs font-medium ${ui.muted}`}>¿Cómo fue la atención? Califícala:</p>
        {estrellas(0, true)}
      </div>
    )
  }
  return null
}
