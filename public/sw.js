// Recibe las notificaciones push y abre el panel al tocarlas.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let datos = {}
  try {
    datos = event.data ? event.data.json() : {}
  } catch (e) {
    datos = { title: 'Aviso', body: event.data ? event.data.text() : '' }
  }
  event.waitUntil(
    self.registration.showNotification(datos.title || 'Aviso', {
      body: datos.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: datos.url || '/' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ventanas) => {
      for (const v of ventanas) {
        if ('focus' in v) {
          return v.focus().then(() => ('navigate' in v ? v.navigate(url).catch(() => null) : null))
        }
      }
      return self.clients.openWindow(url)
    })
  )
})
