'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Search, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { makeUi } from '@/lib/ui'
import ServicioPunto from '@/components/ServicioPunto'

const ATAJOS = [
  { href: '/admin/hoy', texto: 'Hoy: qué hacer ahora' },
  { href: '/admin/dashboard', texto: 'Panel de cuentas' },
  { href: '/admin/centro', texto: 'Centro del cliente' },
  { href: '/admin/pagos', texto: 'Pagos' },
  { href: '/admin/finanzas', texto: 'Finanzas' },
  { href: '/admin/reportes', texto: 'Reportes de soporte' },
  { href: '/admin/bitacora', texto: 'Bitácora' },
]

const limpiar = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

type Resultado = { clave: string; tipo: 'cliente' | 'madre' | 'ir'; titulo: string; sub: string; servicio?: string; q?: string; tab?: string; href?: string }

export default function BuscadorGlobal({ abierto, onCerrar, dark }: { abierto: boolean; onCerrar: () => void; dark: boolean }) {
  const ui = makeUi(dark)
  const router = useRouter()
  const pathname = usePathname()
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const [datos, setDatos] = useState<{ c: any[]; m: any[] } | null>(null)
  const input = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!abierto) return
    setQ('')
    setSel(0)
    setTimeout(() => input.current?.focus(), 30)
    if (!datos) {
      const supabase = createClient()
      Promise.all([
        supabase.from('cuentas_clientes').select('id, nombre_completo, servicio, correo_cuenta, perfil_asignado').limit(2000),
        supabase.from('cuentas_madre').select('id, proveedor, servicio, correo').limit(500),
      ]).then(([c, m]) => setDatos({ c: c.data || [], m: m.data || [] }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto])

  const resultados: Resultado[] = useMemo(() => {
    const texto = limpiar(q.trim())
    if (!texto) return ATAJOS.map((a) => ({ clave: a.href, tipo: 'ir' as const, titulo: a.texto, sub: 'Ir a', href: a.href }))
    const palabras = texto.split(/\s+/)
    const coincide = (campos: any[]) => {
      const pajar = limpiar(campos.map((x) => String(x || '')).join(' '))
      return palabras.every((p) => pajar.includes(p))
    }
    const clientes: Resultado[] = (datos?.c || [])
      .filter((c) => coincide([c.nombre_completo, c.correo_cuenta, c.servicio, c.perfil_asignado]))
      .slice(0, 8)
      .map((c) => ({
        clave: `c${c.id}`, tipo: 'cliente', titulo: c.nombre_completo || 'Sin nombre',
        sub: `${c.servicio || ''} · ${c.perfil_asignado || 'sin perfil'} · ${c.correo_cuenta || ''}`,
        servicio: c.servicio, q: c.nombre_completo || c.correo_cuenta || '', tab: 'clientes',
      }))
    const madres: Resultado[] = (datos?.m || [])
      .filter((m) => coincide([m.proveedor, m.correo, m.servicio]))
      .slice(0, 5)
      .map((m) => ({
        clave: `m${m.id}`, tipo: 'madre', titulo: m.correo || 'Cuenta madre',
        sub: `Cuenta madre · ${m.servicio || ''} · ${m.proveedor || ''}`,
        servicio: m.servicio, q: m.correo || '', tab: 'madres',
      }))
    return [...clientes, ...madres]
  }, [q, datos])

  const elegir = (r: Resultado | undefined) => {
    if (!r) return
    onCerrar()
    if (r.tipo === 'ir' && r.href) { router.push(r.href); return }
    if (pathname?.startsWith('/admin/dashboard')) {
      window.dispatchEvent(new CustomEvent('nexo-buscar', { detail: { q: r.q, tab: r.tab } }))
    } else {
      router.push(`/admin/dashboard?q=${encodeURIComponent(r.q || '')}&tab=${r.tab}`)
    }
  }

  const alTeclear = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onCerrar()
    else if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, resultados.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); elegir(resultados[sel]) }
  }

  if (!abierto) return null

  return (
    <div className="fixed inset-0 z-[80] bg-slate-900/50 backdrop-blur-sm flex items-start justify-center p-4 pt-[12vh]" onClick={onCerrar}>
      <div className={`w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden ${ui.modal}`} onClick={(e) => e.stopPropagation()}>
        <div className={`flex items-center gap-3 px-4 border-b ${ui.border}`}>
          <Search size={18} className={ui.muted} />
          <input
            ref={input}
            value={q}
            onChange={(e) => { setQ(e.target.value); setSel(0) }}
            onKeyDown={alTeclear}
            placeholder="Busca un cliente, correo o cuenta madre..."
            className="flex-1 py-4 bg-transparent outline-none text-sm"
          />
          <kbd className={`text-[10px] px-1.5 py-0.5 rounded border ${ui.border} ${ui.muted}`}>Esc</kbd>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto p-2">
          {resultados.length === 0 && <li className={`px-3 py-6 text-center text-sm ${ui.muted}`}>No encontré nada con “{q}”.</li>}
          {resultados.map((r, i) => (
            <li key={r.clave}>
              <button
                type="button"
                onClick={() => elegir(r)}
                onMouseEnter={() => setSel(i)}
                className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm ${
                  i === sel ? (dark ? 'bg-slate-700' : 'bg-slate-100') : ''
                }`}
              >
                {r.tipo === 'ir' ? <ArrowRight size={14} className={ui.muted} /> : <ServicioPunto servicio={r.servicio} />}
                <span className="min-w-0 flex-1">
                  <span className="block font-medium truncate">{r.titulo}</span>
                  <span className={`block text-xs truncate ${ui.muted}`}>{r.sub}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
