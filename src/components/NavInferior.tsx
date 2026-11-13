'use client'

import { Home, Tv, Receipt, LifeBuoy } from 'lucide-react'

const ITEMS = [
  { id: 'inicio', texto: 'Inicio', icono: Home },
  { id: 'cuentas', texto: 'Mis cuentas', icono: Tv },
  { id: 'pagos', texto: 'Pagos', icono: Receipt },
  { id: 'soporte', texto: 'Soporte', icono: LifeBuoy },
]

// Barra inferior del cliente en el celular estilo iOS Tab Bar
export default function NavInferior({ tab, setTab, dark }: { tab: string; setTab: (t: any) => void; dark: boolean }) {
  return (
    <nav
      className={`sm:hidden fixed bottom-0 inset-x-0 z-40 border-t backdrop-blur-xl grid grid-cols-4 pb-[env(safe-area-inset-bottom)] ios-glass transition-colors ${
        dark ? 'bg-slate-900/85 border-slate-700/70' : 'bg-slate-50/85 border-slate-200/70'
      }`}
    >
      {ITEMS.map((i) => {
        const activo = tab === i.id
        return (
          <button
            key={i.id}
            type="button"
            onClick={() => { setTab(i.id); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
            className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition duration-150 active:scale-[0.92] ${
              activo ? (dark ? 'text-indigo-400 font-semibold' : 'text-indigo-600 font-semibold') : (dark ? 'text-slate-400' : 'text-slate-500')
            }`}
          >
            <i.icono size={20} className={activo ? 'stroke-[2.2]' : 'stroke-[1.8]'} />
            {i.texto}
          </button>
        )
      })}
    </nav>
  )
}
