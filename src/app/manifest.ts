import type { MetadataRoute } from 'next'

// Permite instalar el panel como app en el celular (necesario para las notificaciones en iPhone)
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'NexoStream',
    short_name: 'NexoStream',
    start_url: '/login',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#4f46e5',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
