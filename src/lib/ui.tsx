import type { Tone } from '@/lib/cuentas'

export const toneClasses = (dark: boolean, tone: Tone) => {
  const map: Record<Tone, string> = {
    success: dark ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: dark ? 'bg-amber-500/10 text-amber-300 border-amber-500/30' : 'bg-amber-50 text-amber-700 border-amber-200',
    danger: dark ? 'bg-rose-500/10 text-rose-300 border-rose-500/30' : 'bg-rose-50 text-rose-700 border-rose-200',
    info: dark ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30' : 'bg-indigo-50 text-indigo-700 border-indigo-200',
    neutral: dark ? 'bg-slate-500/10 text-slate-300 border-slate-500/30' : 'bg-slate-100 text-slate-600 border-slate-200',
  }
  return map[tone]
}

export const Pill = ({ dark, tone, children }: { dark: boolean; tone: Tone; children: React.ReactNode }) => (
  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold whitespace-nowrap shadow-xs backdrop-blur-md ${toneClasses(dark, tone)}`}>
    {children}
  </span>
)

export const Skeleton = ({ dark, className = '' }: { dark: boolean; className?: string }) => (
  <div className={`animate-pulse rounded-2xl ${dark ? 'bg-slate-800/80' : 'bg-slate-200/80'} ${className}`} />
)

// Estilos estilo iOS con elevaciones refinadas y microinteracciones fluidas
export const makeUi = (darkMode: boolean) => ({
  page: darkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900',
  card: darkMode ? 'bg-slate-800/80 border-slate-700/80 shadow-sm backdrop-blur-xl rounded-2xl' : 'bg-white/90 border-slate-200/80 shadow-xs backdrop-blur-xl rounded-2xl',
  cardInner: darkMode ? 'bg-slate-900/60 border-slate-700/70 rounded-xl' : 'bg-slate-100/70 border-slate-200/70 rounded-xl',
  modal: darkMode ? 'bg-slate-800/95 border-slate-700 text-slate-100 shadow-2xl backdrop-blur-2xl rounded-3xl' : 'bg-white/95 border-slate-200 text-slate-800 shadow-2xl backdrop-blur-2xl rounded-3xl',
  muted: darkMode ? 'text-slate-400' : 'text-slate-500',
  border: darkMode ? 'border-slate-700/70' : 'border-slate-200/70',
  thead: darkMode ? 'bg-slate-800/90 text-slate-400 border-slate-700/70' : 'bg-slate-100/80 text-slate-500 border-slate-200/70',
  divide: darkMode ? 'divide-slate-700/50' : 'divide-slate-200/60',
  rowHover: darkMode ? 'hover:bg-slate-700/25' : 'hover:bg-slate-100/50',
  input: `w-full px-3.5 py-2.5 rounded-xl text-sm border outline-none transition duration-150 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 ${
    darkMode ? 'bg-slate-900/80 border-slate-700 text-slate-100 placeholder-slate-500 [color-scheme:dark]' : 'bg-white/90 border-slate-300 text-slate-900 placeholder-slate-400'
  }`,
  btnPrimary: 'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 shadow-sm transition active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed',
  btnGhost: `inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium border transition active:scale-[0.97] ${
    darkMode ? 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-700/70' : 'bg-white/90 border-slate-200 text-slate-700 hover:bg-slate-100/80 shadow-xs'
  }`,
  iconBtn: `p-2 rounded-xl transition active:scale-[0.92] ${darkMode ? 'text-slate-300 hover:bg-slate-700/60' : 'text-slate-500 hover:bg-slate-200/60'}`,
})
