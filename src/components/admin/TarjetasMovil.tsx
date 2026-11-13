'use client'

import { Send, RefreshCw, Copy, Check, Pencil, Trash2, UserMinus, MessageCircle, ArrowRightLeft, UserCheck } from 'lucide-react'
import { getSemaforoStatus, formatearFecha, textoDias } from '@/lib/cuentas'
import { makeUi, Pill } from '@/lib/ui'
import { dinero } from '@/lib/extras'
import { enlaceCobro } from '@/lib/cobro'
import ServicioPunto from '@/components/ServicioPunto'

type ClienteProps = {
  item: any
  dark: boolean
  destino: any
  copiado: boolean
  onEnviar: () => void
  onRenovar: () => void
  onCopiar: () => void
  onEditar: () => void
  onBorrar: () => void
  onLiberar: () => void
}

// Tarjeta de un cliente para pantallas chicas
export default function ClienteMovil({ item, dark, destino, copiado, onEnviar, onRenovar, onCopiar, onEditar, onBorrar, onLiberar }: ClienteProps) {
  const ui = makeUi(dark)
  const s = getSemaforoStatus(item.fecha_vencimiento)

  return (
    <div className={`rounded-xl border p-4 space-y-3 ${ui.card}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
            <ServicioPunto servicio={item.servicio} /> {item.servicio || 'Servicio'}
          </p>
          <p className="font-semibold text-base truncate">{item.nombre_completo || 'Sin nombre'}</p>
          <p className={`font-mono text-xs truncate ${ui.muted}`}>{item.correo_cuenta || item.correo || '-'}</p>
        </div>
        <Pill dark={dark} tone={s.tone}>{s.label}</Pill>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className={`text-[11px] ${ui.muted}`}>Perfil / PIN</p>
          <p className="font-mono text-xs">{item.perfil_asignado || '-'} <span className={ui.muted}>· {item.pin_perfil || 'S/N'}</span></p>
        </div>
        <div>
          <p className={`text-[11px] ${ui.muted}`}>Vence</p>
          <p className="text-xs">{formatearFecha(item.fecha_vencimiento)} <span className={ui.muted}>· {textoDias(s.dias)}</span></p>
        </div>
        <div>
          <p className={`text-[11px] ${ui.muted}`}>Precio</p>
          <p className={`text-xs font-semibold ${dark ? 'text-emerald-300' : 'text-emerald-700'}`}>{dinero(item.precio_suscripcion)}</p>
        </div>
        <div>
          <p className={`text-[11px] ${ui.muted}`}>Enviada a</p>
          {item.usuario_id ? (
            <p className="text-xs flex items-center gap-1"><UserCheck size={12} /> {destino?.nombre || 'Cliente'}{destino?.cliente_id ? ` @${destino.cliente_id}` : ''}</p>
          ) : (
            <p className={`text-xs ${ui.muted}`}>Sin enviar</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onEnviar} className={ui.btnPrimary}><Send size={14} /> {item.usuario_id ? 'Reenviar' : 'Enviar'}</button>
        <button type="button" onClick={onRenovar} className={ui.btnGhost}><RefreshCw size={14} /> Renovar</button>
        <a href={enlaceCobro(item)} target="_blank" rel="noopener noreferrer" className={ui.btnGhost}><MessageCircle size={14} /> Cobrar</a>
        <button type="button" onClick={onCopiar} className={ui.btnGhost}>{copiado ? <Check size={14} /> : <Copy size={14} />} {copiado ? 'Copiado' : 'Copiar'}</button>
      </div>
      <div className="flex items-center gap-1 -ml-1">
        <button type="button" onClick={onEditar} className={ui.iconBtn} aria-label="Editar"><Pencil size={16} /></button>
        {s.label === 'Vencida' && item.cuenta_madre_id && (
          <button type="button" onClick={onLiberar} className={ui.iconBtn} aria-label="Liberar perfil"><UserMinus size={16} /></button>
        )}
        <button type="button" onClick={onBorrar} className={`p-2 rounded-lg ${dark ? 'text-rose-300' : 'text-rose-600'}`} aria-label="Eliminar"><Trash2 size={16} /></button>
      </div>
    </div>
  )
}

type MadreProps = {
  item: any
  dark: boolean
  clientes: any[]
  onEditar: () => void
  onMover: () => void
  onBorrar: () => void
}

// Tarjeta de una cuenta madre para pantallas chicas
export function MadreMovil({ item, dark, clientes, onEditar, onMover, onBorrar }: MadreProps) {
  const ui = makeUi(dark)
  const s = getSemaforoStatus(item.fecha_vencimiento)
  const max = item.max_perfiles || 5
  const n = clientes.length
  const barra = n >= max ? 'bg-rose-500' : n >= max - 1 ? 'bg-amber-500' : 'bg-emerald-500'

  return (
    <div className={`rounded-xl border p-4 space-y-3 ${ui.card}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide"><ServicioPunto servicio={item.servicio} /> {item.servicio}</p>
          <p className="font-semibold">{item.proveedor}</p>
          <p className={`font-mono text-xs truncate ${ui.muted}`}>{item.correo}</p>
        </div>
        <Pill dark={dark} tone={s.tone}>{s.label}</Pill>
      </div>
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="font-semibold">{n}/{max} perfiles</span>
          <span className={ui.muted}>Vence {formatearFecha(item.fecha_vencimiento)}</span>
        </div>
        <div className={`h-1.5 rounded-full overflow-hidden ${dark ? 'bg-slate-700' : 'bg-slate-200'}`}>
          <div className={`h-full rounded-full ${barra}`} style={{ width: `${Math.min(100, (n / max) * 100)}%` }} />
        </div>
      </div>
      <div className="flex items-center gap-1 -ml-1">
        <button type="button" onClick={onEditar} className={ui.iconBtn} aria-label="Editar"><Pencil size={16} /></button>
        <button type="button" onClick={onMover} className={ui.iconBtn} aria-label="Mover clientes"><ArrowRightLeft size={16} /></button>
        <button type="button" onClick={onBorrar} className={`p-2 rounded-lg ${dark ? 'text-rose-300' : 'text-rose-600'}`} aria-label="Eliminar"><Trash2 size={16} /></button>
      </div>
    </div>
  )
}
