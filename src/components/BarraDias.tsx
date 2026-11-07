import { diasEntre, diasHasta } from '@/lib/extras'

// Barra con los días que le quedan a una cuenta
export default function BarraDias({ adquisicion, vencimiento, dark }: { adquisicion?: string | null; vencimiento?: string | null; dark: boolean }) {
  if (!vencimiento) return null
  const restantes = diasHasta(vencimiento)
  const total = Math.max(1, adquisicion ? diasEntre(adquisicion, vencimiento) : 30)
  const pct = Math.max(0, Math.min(100, (restantes / total) * 100))
  const color = restantes < 0 ? 'bg-rose-500' : restantes <= 3 ? 'bg-amber-500' : 'bg-emerald-500'
  const texto = restantes < 0 ? `Venció hace ${-restantes} día(s)` : restantes === 0 ? 'Vence hoy' : `Quedan ${restantes} de ${total} días`

  return (
    <div className="mt-2">
      <div className={`h-2 rounded-full overflow-hidden ${dark ? 'bg-slate-700' : 'bg-slate-200'}`}>
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${restantes < 0 ? 100 : pct}%` }} />
      </div>
      <p className={`text-[11px] mt-1 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>{texto}</p>
    </div>
  )
}
