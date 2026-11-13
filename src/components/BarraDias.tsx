import { diasEntre, diasHasta, dinero } from '@/lib/extras'
import { DESCUENTO_MESES } from '@/lib/config'
import { redondear } from '@/lib/utilidades'

// Días que le quedan a una cuenta: número grande, barra y, si aplica, cuánto se ahorra renovando 3 meses
export default function BarraDias({
  adquisicion, vencimiento, dark, precio,
}: { adquisicion?: string | null; vencimiento?: string | null; dark: boolean; precio?: number | string | null }) {
  if (!vencimiento) return null
  const restantes = diasHasta(vencimiento)
  const total = Math.max(1, adquisicion ? diasEntre(adquisicion, vencimiento) : 30)
  const pct = restantes < 0 ? 100 : Math.max(0, Math.min(100, (restantes / total) * 100))
  const color = restantes < 0 ? 'bg-rose-500' : restantes <= 3 ? 'bg-amber-500' : 'bg-emerald-500'
  const ahorro = precio ? redondear(Number(precio) * 3 * (DESCUENTO_MESES[3] || 0)) : 0
  const muted = dark ? 'text-slate-400' : 'text-slate-500'

  return (
    <div className="mt-3">
      <div className="flex items-end gap-3">
        <div className="leading-none shrink-0">
          <span className="text-4xl font-bold tabular-nums" style={{ fontFamily: 'var(--font-display)' }}>
            {restantes < 0 ? -restantes : restantes}
          </span>
          <span className={`text-xs ml-1 ${muted}`}>{restantes < 0 ? 'días vencida' : restantes === 1 ? 'día' : 'días'}</span>
        </div>
        <div className="flex-1 pb-1">
          <div className={`h-2 rounded-full overflow-hidden ${dark ? 'bg-slate-700' : 'bg-slate-200'}`}>
            <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
      {ahorro > 0 && restantes <= 7 && (
        <p className={`text-[11px] mt-1.5 ${dark ? 'text-emerald-300' : 'text-emerald-700'}`}>
          Renueva 3 meses de una vez y ahorras {dinero(ahorro)}.
        </p>
      )}
    </div>
  )
}
