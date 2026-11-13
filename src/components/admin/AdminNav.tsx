'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, LayoutDashboard, Inbox, Wallet, TrendingUp, LifeBuoy, History, Search, Menu, Sun, Moon } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { useTema } from '@/lib/useTema'
import BuscadorGlobal from '@/components/admin/BuscadorGlobal'

const ENLACES = [
  { href: '/admin/hoy', texto: 'Hoy', icono: CalendarDays },
  { href: '/admin/dashboard', texto: 'Panel', icono: LayoutDashboard },
  { href: '/admin/centro', texto: 'Centro', icono: Inbox, badge: true },
  { href: '/admin/pagos', texto: 'Pagos', icono: Wallet },
  { href: '/admin/finanzas', texto: 'Finanzas', icono: TrendingUp },
  { href: '/admin/reportes', texto: 'Reportes', icono: LifeBuoy },
  { href: '/admin/bitacora', texto: 'Bitácora', icono: History },
]

export default function AdminNav() {
  const pathname = usePathname() || ''
  const [dark, setDark] = useTema()
  const [buscar, setBuscar] = useState(false)
  const [mas, setMas] = useState(false)
  const [pendientes, setPendientes] = useState(0)

  useEffect(() => {
    const supabase = createClient()
    const contar = async () => {
      const [a, b] = await Promise.all([
        supabase.from('solicitudes_renovacion').select('id', { count: 'exact', head: true }).eq('estado', 'pendiente'),
        supabase.from('pedidos_servicio').select('id', { count: 'exact', head: true }).eq('estado', 'nuevo'),
      ])
      setPendientes((a.count || 0) + (b.count || 0))
    }
    contar()
    const canal = supabase
      .channel('admin-nav')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'solicitudes_renovacion' }, contar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos_servicio' }, contar)
      .subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [])

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setBuscar((v) => !v)
      }
    }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [])

  useEffect(() => { setMas(false) }, [pathname])

  const activo = (href: string) => pathname === href || pathname.startsWith(href + '/')
  const fondo = dark ? 'bg-slate-900/95 border-slate-700 text-slate-100' : 'bg-slate-50/95 border-slate-200 text-slate-900'
  const chip = (a: boolean) =>
    a ? (dark ? 'bg-slate-700 text-white' : 'bg-slate-900 text-white') : (dark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600 hover:bg-slate-200/60')

  const Badge = ({ n }: { n: number }) =>
    n > 0 ? (
      <span className="ml-1 min-w-[18px] h-[18px] px-1 rounded-full bg-indigo-600 text-white text-[10px] font-bold inline-flex items-center justify-center">{n}</span>
    ) : null

  const principales = ENLACES.slice(0, 4)
  const resto = ENLACES.slice(4)

  return (
    <>
      {/* Escritorio: barra superior */}
      <header className={`hidden md:flex sticky top-0 z-40 items-center gap-1 px-6 h-12 border-b backdrop-blur ${fondo}`}>
        <Link href="/admin/hoy" className="flex items-center gap-2 mr-4">
          <span className="w-6 h-6 rounded-md bg-indigo-600 text-white text-xs font-bold flex items-center justify-center" style={{ fontFamily: 'var(--font-display)' }}>N</span>
          <span className="font-semibold text-sm" style={{ fontFamily: 'var(--font-display)' }}>NexoStream</span>
        </Link>
        <nav className="flex items-center gap-0.5">
          {ENLACES.map((e) => (
            <Link key={e.href} href={e.href} className={`px-3 py-1.5 rounded-md text-sm font-medium inline-flex items-center ${chip(activo(e.href))}`}>
              {e.texto}{e.badge && <Badge n={pendientes} />}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setBuscar(true)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-xs ${dark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-600 hover:bg-white'}`}
          >
            <Search size={14} /> Buscar <kbd className="text-[10px] opacity-70">Ctrl K</kbd>
          </button>
          <button type="button" onClick={() => setDark(!dark)} className={`p-2 rounded-md ${chip(false)}`} aria-label="Cambiar modo claro u oscuro">
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      {/* Celular: barra inferior */}
      <nav className={`md:hidden fixed bottom-0 inset-x-0 z-40 border-t backdrop-blur grid grid-cols-5 ${fondo}`}>
        {principales.map((e) => (
          <Link key={e.href} href={e.href} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium relative ${activo(e.href) ? (dark ? 'text-indigo-300' : 'text-indigo-700') : (dark ? 'text-slate-400' : 'text-slate-500')}`}>
            <e.icono size={20} />
            {e.texto}
            {e.badge && pendientes > 0 && (
              <span className="absolute top-1 right-[28%] min-w-[16px] h-4 px-1 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">{pendientes}</span>
            )}
          </Link>
        ))}
        <button type="button" onClick={() => setMas(!mas)} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
          <Menu size={20} /> Más
        </button>
      </nav>

      {mas && (
        <div className="md:hidden fixed inset-0 z-50" onClick={() => setMas(false)}>
          <div className={`absolute bottom-16 right-3 w-56 rounded-xl border shadow-xl p-2 ${dark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`} onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => { setMas(false); setBuscar(true) }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left">
              <Search size={16} /> Buscar
            </button>
            {resto.map((e) => (
              <Link key={e.href} href={e.href} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm">
                <e.icono size={16} /> {e.texto}
              </Link>
            ))}
            <button type="button" onClick={() => setDark(!dark)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left">
              {dark ? <Sun size={16} /> : <Moon size={16} />} {dark ? 'Modo claro' : 'Modo oscuro'}
            </button>
          </div>
        </div>
      )}

      <BuscadorGlobal abierto={buscar} onCerrar={() => setBuscar(false)} dark={dark} />
    </>
  )
}
