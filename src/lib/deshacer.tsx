'use client'

import { useState } from 'react'

// Elementos que ya se ocultaron pero todavía no se borran de verdad (para que no reaparezcan)
const pendientes = new Set<string>()
export const estaPendiente = (tabla: string, id: any) => pendientes.has(`${tabla}:${id}`)

type Pend = { clave: string; texto: string; timer: ReturnType<typeof setTimeout>; revertir: () => void }

type Opciones = {
  tabla: string
  id: any
  texto: string
  ocultar: () => void
  ejecutar: () => Promise<void> | void
  revertir: () => void
}

// Oculta de inmediato y borra de verdad a los 8 segundos, salvo que toques "Deshacer"
export function useDeshacer(dark: boolean) {
  const [lista, setLista] = useState<Pend[]>([])

  const programar = (o: Opciones) => {
    const clave = `${o.tabla}:${o.id}`
    pendientes.add(clave)
    o.ocultar()
    const timer = setTimeout(async () => {
      await o.ejecutar()
      pendientes.delete(clave)
      setLista((l) => l.filter((x) => x.clave !== clave))
    }, 8000)
    setLista((l) => [...l, { clave, texto: o.texto, timer, revertir: o.revertir }])
  }

  const deshacer = (p: Pend) => {
    clearTimeout(p.timer)
    pendientes.delete(p.clave)
    p.revertir()
    setLista((l) => l.filter((x) => x.clave !== p.clave))
  }

  const nodo = (
    <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[70] space-y-2 w-[92vw] max-w-sm">
      {lista.map((p) => (
        <div
          key={p.clave}
          role="status"
          className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-sm shadow-lg ${
            dark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-900 border-slate-900 text-white'
          }`}
        >
          <span>{p.texto}</span>
          <button type="button" onClick={() => deshacer(p)} className="font-semibold underline underline-offset-2 text-indigo-300">
            Deshacer
          </button>
        </div>
      ))}
    </div>
  )

  return [programar, nodo] as const
}
