// Servicios, colores y niveles de cliente. Cambia aquí lo que quieras.

export const SERVICIOS = [
  'Netflix', 'Max / HBO Max', 'Disney+', 'Prime Video', 'ViX', 'Spotify',
  'Paramount+', 'Apple TV+', 'Crunchyroll', 'Canva', 'Gemini', 'ChatGPT',
]

// Punto de color de cada plataforma (para reconocerlas de un vistazo)
export function colorServicio(nombre?: string | null): string {
  const s = (nombre || '').toLowerCase()
  if (s.includes('netflix')) return '#e50914'
  if (s.includes('disney')) return '#1b3fa6'
  if (s.includes('max') || s.includes('hbo')) return '#6d3fd6'
  if (s.includes('prime') || s.includes('amazon')) return '#1a98ff'
  if (s.includes('vix')) return '#ff7a00'
  if (s.includes('spotify')) return '#1db954'
  if (s.includes('paramount')) return '#0064ff'
  if (s.includes('apple')) return '#3a3a3c'
  if (s.includes('crunchy')) return '#f47521'
  if (s.includes('canva')) return '#00b4bd'
  if (s.includes('gemini')) return '#4285f4'
  if (s.includes('chatgpt') || s.includes('openai')) return '#10a37f'
  return '#a89b89'
}

// Niveles por antigüedad. "extra" es un descuento adicional al renovar (0.03 = 3%).
export const NIVELES = [
  { desde: 0, nombre: 'Nuevo', extra: 0 },
  { desde: 3, nombre: 'De confianza', extra: 0 },
  { desde: 6, nombre: 'Fiel', extra: 0.03 },
  { desde: 12, nombre: 'De la casa', extra: 0.05 },
]

export function nivelPorMeses(meses: number) {
  let actual = NIVELES[0]
  let siguiente: (typeof NIVELES)[number] | null = null
  for (let i = 0; i < NIVELES.length; i++) {
    if (meses >= NIVELES[i].desde) {
      actual = NIVELES[i]
      siguiente = NIVELES[i + 1] || null
    }
  }
  return { actual, siguiente }
}

export function mesesDesde(iso?: string | null): number {
  if (!iso) return 0
  const [y, m, d] = iso.split('-').map(Number)
  const ahora = new Date()
  let meses = (ahora.getFullYear() - y) * 12 + (ahora.getMonth() + 1 - m)
  if (ahora.getDate() < (d || 1)) meses--
  return Math.max(0, meses)
}
