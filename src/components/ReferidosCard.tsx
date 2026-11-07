'use client'

import { useEffect, useState } from 'react'
import { Gift, Copy, Check, Share2, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { makeUi, toneClasses } from '@/lib/ui'
import { DIAS_PREMIO_REFERIDO, NEGOCIO_NOMBRE } from '@/lib/config'

export default function ReferidosCard({ uid, perfil, dark }: { uid: string; perfil: any; dark: boolean }) {
  const ui = makeUi(dark)
  const supabase = createClient()
  const [invitados, setInvitados] = useState(0)
  const [premiados, setPremiados] = useState(0)
  const [yaInvitado, setYaInvitado] = useState(true)
  const [codigo, setCodigo] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [copiado, setCopiado] = useState(false)

  const cargar = async () => {
    const [mios, yo] = await Promise.all([
      supabase.from('referidos').select('estado').eq('referidor_uid', uid),
      supabase.from('referidos').select('id').eq('referido_uid', uid).maybeSingle(),
    ])
    setInvitados((mios.data || []).length)
    setPremiados((mios.data || []).filter((r: any) => r.estado === 'premiado').length)
    setYaInvitado(!!yo.data)
  }

  useEffect(() => {
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid])

  const miCodigo = perfil?.cliente_id as string | undefined
  const textoInvitar = `Te invito a ${NEGOCIO_NOMBRE}. Cuando te registres, escribe mi ID (${miCodigo}) en la sección "Invita y gana" de tu panel.`

  const compartir = async () => {
    if (!miCodigo) return
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try { await navigator.share({ text: textoInvitar }); return } catch { /* cancelado */ }
    }
    navigator.clipboard.writeText(textoInvitar)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  const guardarCodigo = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)
    const limpio = codigo.trim().toLowerCase().replace(/^@/, '')
    if (!miCodigo) { setMsg({ ok: false, texto: 'Primero elige tu ID en "Mi perfil".' }); return }
    if (!limpio) return
    if (limpio === miCodigo) { setMsg({ ok: false, texto: 'No puedes usar tu propio ID.' }); return }

    setGuardando(true)
    const { data: quien } = await supabase.from('profiles').select('id').eq('cliente_id', limpio).maybeSingle()
    if (!quien || quien.id === uid) {
      setMsg({ ok: false, texto: 'No encontramos ese ID. Revisa que esté bien escrito.' })
      setGuardando(false)
      return
    }
    const { error } = await supabase.from('referidos').insert([{ referidor_uid: quien.id, referido_uid: uid }])
    if (error) {
      setMsg({ ok: false, texto: error.code === '23505' ? 'Ya registraste quién te invitó.' : error.message })
      setGuardando(false)
      return
    }
    await supabase.from('profiles').update({ referido_por: limpio }).eq('id', uid)
    setMsg({ ok: true, texto: '¡Listo! Registramos quién te invitó.' })
    setYaInvitado(true)
    setGuardando(false)
  }

  return (
    <section className={`p-5 rounded-2xl border space-y-3 ${ui.card}`}>
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2"><Gift size={18} /> Invita y gana</h2>
        <p className={`text-sm ${ui.muted}`}>
          Cuando un amigo que invitaste compre su primera cuenta, ganas <strong>{DIAS_PREMIO_REFERIDO} días gratis</strong>.
        </p>
      </div>

      {miCodigo ? (
        <div className={`p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${ui.cardInner}`}>
          <div>
            <p className={`text-[11px] ${ui.muted}`}>Tu código para invitar</p>
            <p className="font-mono font-bold text-lg">@{miCodigo}</p>
          </div>
          <button type="button" onClick={compartir} className={ui.btnGhost}>
            {copiado ? <Check size={15} /> : <Share2 size={15} />} {copiado ? 'Copiado' : 'Compartir'}
          </button>
        </div>
      ) : (
        <p className={`text-sm ${ui.muted}`}>Elige tu ID en "Mi perfil" para tener tu código de invitación.</p>
      )}

      <p className={`text-xs ${ui.muted}`}>
        Amigos invitados: <strong>{invitados}</strong> · Premios ganados: <strong>{premiados}</strong>
      </p>

      {!yaInvitado && (
        <form onSubmit={guardarCodigo} className="space-y-2 pt-1">
          <p className="text-sm font-medium">¿Alguien te invitó? Escribe su ID</p>
          <div className="flex gap-2">
            <input type="text" placeholder="@paula23" value={codigo} onChange={(e) => setCodigo(e.target.value)} className={ui.input} />
            <button type="submit" disabled={guardando} className={ui.btnPrimary}>
              {guardando && <Loader2 size={16} className="animate-spin" />} Guardar
            </button>
          </div>
        </form>
      )}
      {msg && <div className={`p-3 rounded-xl border text-sm ${toneClasses(dark, msg.ok ? 'success' : 'danger')}`}>{msg.texto}</div>}
    </section>
  )
}
