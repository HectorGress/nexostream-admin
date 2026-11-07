'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, Loader2, Megaphone } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { makeUi, Pill, Skeleton } from '@/lib/ui'
import type { Tone } from '@/lib/cuentas'

const TONOS: { valor: string; texto: string; tono: Tone }[] = [
  { valor: 'info', texto: 'Informativo', tono: 'info' },
  { valor: 'warning', texto: 'Importante', tono: 'warning' },
  { valor: 'danger', texto: 'Urgente', tono: 'danger' },
  { valor: 'success', texto: 'Buena noticia', tono: 'success' },
]

export default function AvisosAdmin({ dark }: { dark: boolean }) {
  const ui = makeUi(dark)
  const supabase = createClient()
  const [avisos, setAvisos] = useState<any[]>([])
  const [titulo, setTitulo] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [tipo, setTipo] = useState('info')
  const [guardando, setGuardando] = useState(false)
  const [cargando, setCargando] = useState(true)

  const cargar = async () => {
    const { data } = await supabase.from('avisos').select('*').order('created_at', { ascending: false }).limit(50)
    setAvisos(data || [])
    setCargando(false)
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const crear = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titulo.trim()) return
    setGuardando(true)
    const { error } = await supabase.from('avisos').insert([{ titulo: titulo.trim(), mensaje: mensaje.trim() || null, tipo }])
    setGuardando(false)
    if (error) { alert(`❌ ${error.message}`); return }
    setTitulo(''); setMensaje(''); setTipo('info')
    cargar()
  }

  const alternar = async (a: any) => {
    await supabase.from('avisos').update({ activo: !a.activo }).eq('id', a.id)
    cargar()
  }

  const borrar = async (a: any) => {
    if (!confirm('¿Borrar este aviso?')) return
    await supabase.from('avisos').delete().eq('id', a.id)
    cargar()
  }

  return (
    <div className="space-y-5">
      <form onSubmit={crear} className={`p-5 border rounded-2xl space-y-3 ${ui.card}`}>
        <div>
          <h3 className="font-semibold flex items-center gap-2"><Megaphone size={17} /> Nuevo aviso para los clientes</h3>
          <p className={`text-xs ${ui.muted}`}>Aparece arriba en el Inicio de todos tus clientes, al instante. Ej. “Disney+ en mantenimiento hoy”.</p>
        </div>
        <input type="text" required maxLength={80} placeholder="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} className={ui.input} />
        <textarea rows={2} maxLength={300} placeholder="Mensaje (opcional)" value={mensaje} onChange={(e) => setMensaje(e.target.value)} className={ui.input} />
        <div className="flex flex-wrap gap-2 items-center">
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={`${ui.input} sm:w-auto`}>
            {TONOS.map((t) => <option key={t.valor} value={t.valor}>{t.texto}</option>)}
          </select>
          <button type="submit" disabled={guardando} className={ui.btnPrimary}>
            {guardando ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Publicar aviso
          </button>
        </div>
      </form>

      {cargando ? (
        <Skeleton dark={dark} className="h-20 w-full" />
      ) : avisos.length === 0 ? (
        <p className={`text-center text-sm py-8 ${ui.muted}`}>Todavía no has publicado avisos.</p>
      ) : (
        <div className="space-y-2">
          {avisos.map((a) => {
            const t = TONOS.find((x) => x.valor === a.tipo) || TONOS[0]
            return (
              <div key={a.id} className={`p-3.5 border rounded-xl flex flex-wrap items-center gap-3 ${ui.card} ${a.activo ? '' : 'opacity-60'}`}>
                <Pill dark={dark} tone={t.tono}>{t.texto}</Pill>
                <div className="flex-1 min-w-[180px]">
                  <p className="font-semibold text-sm">{a.titulo}</p>
                  {a.mensaje && <p className={`text-xs ${ui.muted}`}>{a.mensaje}</p>}
                </div>
                <button type="button" onClick={() => alternar(a)} className={ui.btnGhost}>{a.activo ? 'Ocultar' : 'Mostrar'}</button>
                <button type="button" onClick={() => borrar(a)} className={`p-2 rounded-lg ${dark ? 'text-rose-300 hover:bg-rose-500/10' : 'text-rose-600 hover:bg-rose-50'}`} aria-label="Borrar aviso">
                  <Trash2 size={16} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
