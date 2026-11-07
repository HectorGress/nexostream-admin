import { createClient } from '@/lib/supabase'

export type EstadoPush = 'no-soportado' | 'bloqueado' | 'inactivo' | 'activo'

const aUint8 = (b64: string) => {
  const relleno = '='.repeat((4 - (b64.length % 4)) % 4)
  const base = (b64 + relleno).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base)
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

export const esIPhone = () => typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent)

export async function estadoPush(): Promise<EstadoPush> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return 'no-soportado'
  }
  if (Notification.permission === 'denied') return 'bloqueado'
  const reg = await navigator.serviceWorker.getRegistration('/sw.js')
  const sub = await reg?.pushManager.getSubscription()
  return sub && Notification.permission === 'granted' ? 'activo' : 'inactivo'
}

export async function activarPush(uid: string, rol: 'admin' | 'cliente') {
  const llave = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!llave) throw new Error('Falta configurar las notificaciones (NEXT_PUBLIC_VAPID_PUBLIC_KEY).')

  const permiso = await Notification.requestPermission()
  if (permiso !== 'granted') throw new Error('No diste permiso para las notificaciones.')

  const reg = await navigator.serviceWorker.register('/sw.js')
  await navigator.serviceWorker.ready

  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: aUint8(llave) as unknown as BufferSource,
    })
  }
  const j = sub.toJSON()
  if (!j.endpoint || !j.keys?.p256dh || !j.keys?.auth) throw new Error('No se pudo registrar este dispositivo.')

  const supabase = createClient()
  const { error } = await supabase
    .from('push_suscripciones')
    .upsert([{ usuario_id: uid, rol, endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth }], { onConflict: 'endpoint' })
  if (error) throw new Error(error.message)
}
