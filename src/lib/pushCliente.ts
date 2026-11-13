import { auth } from '@/lib/firebase'

async function enviar(payload: Record<string, unknown>) {
  try {
    const idToken = await auth.currentUser?.getIdToken()
    if (!idToken) return
    await fetch('/api/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, ...payload }),
    })
  } catch (e) {
    console.error('Push:', e)
  }
}

// Administrador -> un cliente
export const notificarUsuario = (uid: string, titulo: string, cuerpo: string, url = '/cliente/dashboard') =>
  enviar({ modo: 'usuario', uid, titulo, cuerpo, url })

// Cliente -> todos los administradores
export const notificarAdmins = (evento: 'solicitud' | 'reporte' | 'mensaje' | 'pedido', detalle: string) =>
  enviar({ modo: 'admins', evento, detalle })
