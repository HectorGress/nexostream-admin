'use client'

import { useState } from 'react'
import { Check, Copy, MessageCircle, Sparkles } from 'lucide-react'
import { makeUi, toneClasses } from '@/lib/ui'
import { dinero } from '@/lib/extras'
import { redondear } from '@/lib/utilidades'
import { DESCUENTO_COMBO, WHATSAPP_ADMIN } from '@/lib/config'

export default function ArmaTuCombo({ catalogo, perfil, dark }: { catalogo: any[]; perfil: any; dark: boolean }) {
  const ui = makeUi(dark)
  const opciones = catalogo.filter((c) => c.categoria === 'perfil')
  const [sel, setSel] = useState<number[]>([])
  const [copiado, setCopiado] = useState(false)

  if (opciones.length < 2) return null

  const elegidos = opciones.filter((o) => sel.includes(o.id))
  const subtotal = elegidos.reduce((t, o) => t + Number(o.precio || 0), 0)
  const maxClave = Math.max(...Object.keys(DESCUENTO_COMBO).map(Number))
  const pct = elegidos.length >= 2 ? DESCUENTO_COMBO[Math.min(elegidos.length, maxClave)] || 0 : 0
  const total = redondear(subtotal * (1 - pct))
  const ahorro = redondear(subtotal - total)

  const alternar = (id: number) => setSel(sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id])

  const texto =
    `Hola, soy ${perfil?.nombre || 'cliente'}${perfil?.cliente_id ? ` (@${perfil.cliente_id})` : ''}. ` +
    `Quiero armar mi combo: ${elegidos.map((e) => e.nombre).join(', ')}. ` +
    `Total estimado: ${dinero(total)}${pct > 0 ? ` (con ${Math.round(pct * 100)}% de descuento)` : ''}.`

  const copiar = () => {
    navigator.clipboard.writeText(texto)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <section className={`p-5 rounded-2xl border space-y-3 ${ui.card}`}>
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2"><Sparkles size={18} /> Arma tu combo</h2>
        <p className={`text-sm ${ui.muted}`}>
          Elige 2 o más servicios y mira cuánto ahorras. Precio estimado: el administrador te confirma el total.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {opciones.map((o) => {
          const activo = sel.includes(o.id)
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => alternar(o.id)}
              className={`px-3 py-2 rounded-xl border text-sm font-medium transition ${
                activo ? 'bg-indigo-600 border-indigo-600 text-white' : (dark ? 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50')
              }`}
            >
              {activo && <Check size={13} className="inline mr-1" />}
              {o.nombre} · ${o.precio}
            </button>
          )
        })}
      </div>

      {elegidos.length > 0 && (
        <div className={`p-4 rounded-xl border space-y-1 ${ui.cardInner}`}>
          <div className="flex justify-between text-sm"><span className={ui.muted}>Subtotal</span><span>{dinero(subtotal)}</span></div>
          {pct > 0 && (
            <div className={`flex justify-between text-sm ${dark ? 'text-emerald-300' : 'text-emerald-700'}`}>
              <span>Descuento {Math.round(pct * 100)}%</span><span>-{dinero(ahorro)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold pt-1"><span>Total</span><span>{dinero(total)}</span></div>
          {elegidos.length === 1 && <p className={`text-xs ${ui.muted}`}>Agrega otro servicio para activar el descuento.</p>}
        </div>
      )}

      {elegidos.length >= 2 && (
        <div className="flex flex-wrap gap-2">
          {WHATSAPP_ADMIN ? (
            <a href={`https://wa.me/${WHATSAPP_ADMIN}?text=${encodeURIComponent(texto)}`} target="_blank" rel="noopener noreferrer" className={ui.btnPrimary}>
              <MessageCircle size={16} /> Pedir este combo
            </a>
          ) : null}
          <button type="button" onClick={copiar} className={copiado ? `${ui.btnGhost} ${toneClasses(dark, 'success')}` : ui.btnGhost}>
            {copiado ? <Check size={15} /> : <Copy size={15} />} {copiado ? 'Pedido copiado' : 'Copiar pedido'}
          </button>
        </div>
      )}
    </section>
  )
}
