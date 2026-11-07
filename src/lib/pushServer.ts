// Solo para el servidor (rutas /api). Envía las notificaciones push.
import * as webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

export function sb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY
  if (!url || !key) {
    throw new Error('Faltan las variables de Supabase (NEXT_PUBLIC_SUPABASE_URL y la clave pública).')
  }
  return createClient(url, key, { auth: { persistSession: false } })
}

export function configurarWebPush() {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  const asunto = process.env.VAPID_SUBJECT || 'mailto:admin@example.com'
  if (!pub || !priv) {
    throw new Error('Faltan las llaves VAPID (NEXT_PUBLIC_VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY).')
  }
  webpush.setVapidDetails(asunto, pub, priv)
}

// Comprueba que el token de Firebase sea real y devuelve quién es
export async function verificarToken(idToken: string): Promise<{ uid: string; email?: string } | null> {
  const key = process.env.FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  if (!key || !idToken) return null
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  })
  if (!r.ok) return null
  const j = await r.json()
  const u = j?.users?.[0]
  return u?.localId ? { uid: u.localId as string, email: u.email as string | undefined } : null
}

export type AvisoPush = { title: string; body: string; url?: string }

export async function enviarA(suscripciones: any[], aviso: AvisoPush) {
  const supabase = sb()
  let enviados = 0
  let fallidos = 0
  await Promise.all(
    suscripciones.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(aviso)
        )
        enviados++
      } catch (e: any) {
        fallidos++
        // El dispositivo ya no existe: se borra para no insistir
        if (e?.statusCode === 404 || e?.statusCode === 410) {
          await supabase.from('push_suscripciones').delete().eq('endpoint', s.endpoint)
        }
      }
    })
  )
  return { enviados, fallidos }
}
