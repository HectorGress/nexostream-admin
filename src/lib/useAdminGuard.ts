'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { createClient } from '@/lib/supabase'

// Deja entrar solo a administradores (misma validación que usa el panel)
export function useAdminGuard() {
  const router = useRouter()
  const [autorizado, setAutorizado] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.push('/login')
        return
      }
      const { data } = await supabase.from('profiles').select('rol').eq('id', u.uid).maybeSingle()
      if (data?.rol !== 'admin') {
        router.push('/cliente/dashboard')
        return
      }
      setAutorizado(true)
    })
    return () => unsub()
  }, [router])

  return autorizado
}
