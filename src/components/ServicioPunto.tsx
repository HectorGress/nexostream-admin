import { colorServicio } from '@/lib/configExtra'

// Puntito con el color de la plataforma
export default function ServicioPunto({ servicio, size = 10 }: { servicio?: string | null; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block rounded-full shrink-0"
      style={{ width: size, height: size, background: colorServicio(servicio) }}
    />
  )
}
