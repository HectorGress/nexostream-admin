import { descargarBlob } from '@/lib/utilidades'

// Descarga una tabla como CSV (se abre directo en Excel)
export function exportarCSV(nombre: string, filas: Record<string, any>[]) {
  if (filas.length === 0) {
    alert('No hay datos para exportar.')
    return
  }
  const cols = Object.keys(filas[0])
  const esc = (v: any) => {
    const s = v == null ? '' : String(v)
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = [cols.join(','), ...filas.map((f) => cols.map((c) => esc(f[c])).join(','))].join('\r\n')
  const hoy = new Date()
  const iso = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`
  descargarBlob(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }), `${nombre}-${iso}.csv`)
}
