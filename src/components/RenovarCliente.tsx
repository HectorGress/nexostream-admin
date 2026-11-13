'use client'

import { useEffect, useState } from 'react'
import { X, Loader2, Copy, Check, Upload, MessageCircle, Landmark } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { formatearFecha } from '@/lib/cuentas'
import { makeUi, toneClasses } from '@/lib/ui'
import { dinero } from '@/lib/extras'
import { comprimirImagen, redondear } from '@/lib/utilidades'
import { notificarAdmins } from '@/lib/pushCliente'
import { PAGO, DESCUENTO_MESES, WHATSAPP_ADMIN } from '@/lib/config'
import { nivelPorMeses, mesesDesde } from '@/lib/configExtra'

type Props = {
  cuenta: any
  uid: string
  perfil: any
  dark: boolean
  onClose: () => void
  onDone: (texto: string) => void
}

export default function RenovarCliente({ cuenta, uid, perfil, dark, onClose, onDone }: Props) {
  const ui = makeUi(dark)
  const supabase = createClient()

  const opciones = Object.keys(DESCUENTO_MESES).map(Number).sort((a, b) => a - b)
  const unitario = Number(cuenta.precio_suscripcion) || 0

  const [meses, setMeses] = useState(1)
  const [extra, setExtra] = useState(0)
  const [nombreNivel, setNombreNivel] = useState('')
  const [monto, setMonto] = useState<number | string>(redondear(unitario * (1 - (DESCUENTO_MESES[1] || 0))))
  const [nota, setNota] = useState('')
  const [archivo, setArchivo] = useState<File | null>(null)
  const [vista, setVista] = useState('')
  const [pendiente, setPendiente] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase
      .from('solicitudes_renovacion')
      .select('id')
      .eq('cuenta_id', cuenta.id)
      .eq('estado', 'pendiente')
      .limit(1)
      .then(({ data }) => setPendiente(!!data && data.length > 0))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cuenta.id])

  // Descuento por plan + descuento extra por antigüedad
  const descuento = (m: number) => (DESCUENTO_MESES[m] || 0) + extra

  useEffect(() => {
    supabase
      .from('cuentas_clientes')
      .select('fecha_adquisicion')
      .eq('usuario_id', uid)
      .order('fecha_adquisicion', { ascending: true })
      .limit(1)
      .then(({ data }: any) => {
        const nivel = nivelPorMeses(data?.[0]?.fecha_adquisicion ? mesesDesde(data[0].fecha_adquisicion) : 0).actual
        setExtra(nivel.extra)
        setNombreNivel(nivel.nombre)
        setMonto(redondear(unitario * (1 - ((DESCUENTO_MESES[1] || 0) + nivel.extra))))
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid])

  const elegirMeses = (m: number) => {
    setMeses(m)
    setMonto(redondear(unitario * m * (1 - descuento(m))))
  }

  const elegirArchivo = (f: File | null) => {
    setArchivo(f)
    setVista(f ? URL.createObjectURL(f) : '')
  }

  const concepto = `${perfil?.cliente_id ? '@' + perfil.cliente_id : perfil?.nombre || ''} ${cuenta.servicio || ''}`.trim()

  const copiarClabe = () => {
    navigator.clipboard.writeText(PAGO.clabe)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  const textoWhats = `Hola, soy ${perfil?.nombre || 'cliente'}${perfil?.cliente_id ? ` (@${perfil.cliente_id})` : ''}. Quiero renovar mi ${cuenta.servicio || 'cuenta'} por ${meses} mes(es). Ya hice el pago y subí mi comprobante en el panel.`

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (pendiente) { setError('Ya tienes una solicitud en revisión para esta cuenta.'); return }
    if (!perfil?.cliente_id) { setError('Primero elige tu nombre e ID en "Mi perfil".'); return }
    const montoNum = Number(monto)
    if (isNaN(montoNum) || montoNum <= 0) { setError('Escribe el monto que pagaste.'); return }
    if (!archivo) { setError('Sube la foto o captura de tu comprobante.'); return }
    if (!archivo.type.startsWith('image/')) { setError('El comprobante debe ser una imagen (foto o captura).'); return }

    setEnviando(true)
    try {
      const imagen = await comprimirImagen(archivo)
      const unico = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`
      const ruta = `${uid}/${unico}.jpg`
      const { error: errSub } = await supabase.storage.from('comprobantes').upload(ruta, imagen, { contentType: 'image/jpeg' })
      if (errSub) throw new Error(`No se pudo subir la imagen: ${errSub.message}`)
      const url = supabase.storage.from('comprobantes').getPublicUrl(ruta).data.publicUrl

      const { error: errIns } = await supabase.from('solicitudes_renovacion').insert([{
        cuenta_id: cuenta.id,
        usuario_id: uid,
        cliente_nombre: perfil?.nombre || null,
        cliente_handle: perfil?.cliente_id || null,
        servicio: cuenta.servicio || null,
        meses,
        monto: montoNum,
        comprobante_url: url,
        nota: nota.trim() || null,
      }])
      if (errIns) throw new Error(errIns.message)

      notificarAdmins('solicitud', `${perfil?.nombre || 'Cliente'} · ${cuenta.servicio || ''} · ${meses} mes(es)`)
      onDone('Solicitud enviada. Te avisaremos en cuanto revisemos tu pago.')
    } catch (err: any) {
      setError(err?.message || 'No se pudo enviar la solicitud.')
      setEnviando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-start sm:items-center justify-center p-4 z-50 overflow-y-auto">
      <form onSubmit={enviar} className={`border w-full max-w-md p-6 rounded-2xl shadow-2xl space-y-4 my-8 ${ui.modal}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-lg">Renovar {cuenta.servicio}</h3>
            <p className={`text-xs ${ui.muted}`}>Vence el {formatearFecha(cuenta.fecha_vencimiento)}</p>
          </div>
          <button type="button" onClick={onClose} className={ui.iconBtn} aria-label="Cerrar"><X size={18} /></button>
        </div>

        {pendiente && (
          <div className={`p-3 rounded-xl border text-sm ${toneClasses(dark, 'info')}`}>
            Ya tienes una solicitud en revisión para esta cuenta. Te avisaremos cuando quede lista.
          </div>
        )}

        <div className="space-y-2">
          <p className="text-sm font-semibold">1. Elige cuánto tiempo</p>
          {extra > 0 && <p className={`text-xs ${dark ? 'text-emerald-300' : 'text-emerald-700'}`}>Tu nivel “{nombreNivel}” te da {Math.round(extra * 100)}% extra de descuento.</p>}
          <div className="grid grid-cols-3 gap-2">
            {opciones.map((m) => {
              const desc = descuento(m)
              const activo = meses === m
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => elegirMeses(m)}
                  className={`p-2.5 rounded-xl border text-sm font-semibold transition ${
                    activo ? 'bg-indigo-600 border-indigo-600 text-white' : (dark ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700')
                  }`}
                >
                  {m} {m === 1 ? 'mes' : 'meses'}
                  {desc > 0 && <span className={`block text-[11px] font-medium ${activo ? 'text-indigo-100' : 'text-emerald-600'}`}>-{Math.round(desc * 100)}%</span>}
                </button>
              )
            })}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold">2. Haz tu pago</p>
          <div className={`p-3.5 rounded-xl border space-y-2 ${ui.cardInner}`}>
            <p className="text-xs flex items-center gap-1.5"><Landmark size={14} /> {PAGO.banco} · {PAGO.titular}</p>
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-sm tracking-wider">{PAGO.clabe}</p>
              <button type="button" onClick={copiarClabe} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${copiado ? toneClasses(dark, 'success') : toneClasses(dark, 'info')}`}>
                {copiado ? <Check size={13} /> : <Copy size={13} />} {copiado ? 'Copiada' : 'Copiar'}
              </button>
            </div>
            <p className={`text-xs ${ui.muted}`}>Pon este concepto: <strong>{concepto || 'tu nombre'}</strong></p>
          </div>
          <label className="block space-y-1">
            <span className={`text-xs font-medium ${dark ? 'text-slate-300' : 'text-slate-600'}`}>Monto que pagaste (MXN)</span>
            <input type="number" min="0" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} className={ui.input} />
            {unitario > 0 && <span className={`text-[11px] ${ui.muted}`}>Total sugerido: {dinero(redondear(unitario * meses * (1 - descuento(meses))))}</span>}
          </label>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold">3. Sube tu comprobante</p>
          <label className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed cursor-pointer text-sm ${dark ? 'border-slate-600 hover:bg-slate-700/30' : 'border-slate-300 hover:bg-slate-50'}`}>
            {vista ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={vista} alt="Comprobante" className="max-h-48 rounded-lg" />
            ) : (
              <><Upload size={22} /> <span>Toca para elegir la foto o captura</span></>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => elegirArchivo(e.target.files?.[0] || null)} />
          </label>
          <input type="text" placeholder="Nota para el administrador (opcional)" value={nota} onChange={(e) => setNota(e.target.value)} className={ui.input} />
        </div>

        {error && <div role="alert" className={`p-3 rounded-xl border text-sm ${toneClasses(dark, 'danger')}`}>{error}</div>}

        <div className="flex flex-wrap justify-end gap-2 pt-1">
          {WHATSAPP_ADMIN && (
            <a
              href={`https://wa.me/${WHATSAPP_ADMIN}?text=${encodeURIComponent(textoWhats)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={ui.btnGhost}
            >
              <MessageCircle size={16} /> WhatsApp
            </a>
          )}
          <button type="button" onClick={onClose} className={ui.btnGhost}>Cancelar</button>
          <button type="submit" disabled={enviando || pendiente} className={ui.btnPrimary}>
            {enviando && <Loader2 size={16} className="animate-spin" />} Enviar solicitud
          </button>
        </div>
      </form>
    </div>
  )
}
