'use client'

import { useCallback, useEffect, useState } from 'react'

const CLAVE = 'nexo-tema'

// Igual que useState(false) para el modo oscuro, pero recuerda la elección en todas las páginas
export function useTema(): [boolean, (v: boolean | ((p: boolean) => boolean)) => void] {
  const [oscuro, setOscuro] = useState(false)

  useEffect(() => {
    try {
      setOscuro(localStorage.getItem(CLAVE) === 'oscuro')
    } catch { /* sin almacenamiento */ }
    const alCambiar = (e: StorageEvent) => {
      if (e.key === CLAVE) setOscuro(e.newValue === 'oscuro')
    }
    const alAvisar = () => {
      try { setOscuro(localStorage.getItem(CLAVE) === 'oscuro') } catch { /* nada */ }
    }
    window.addEventListener('storage', alCambiar)
    window.addEventListener('nexo-tema', alAvisar)
    return () => {
      window.removeEventListener('storage', alCambiar)
      window.removeEventListener('nexo-tema', alAvisar)
    }
  }, [])

  const cambiar = useCallback((v: boolean | ((p: boolean) => boolean)) => {
    setOscuro((prev) => {
      const nuevo = typeof v === 'function' ? v(prev) : v
      try { localStorage.setItem(CLAVE, nuevo ? 'oscuro' : 'claro') } catch { /* nada */ }
      return nuevo
    })
    setTimeout(() => window.dispatchEvent(new Event('nexo-tema')), 0)
  }, [])

  return [oscuro, cambiar]
}
