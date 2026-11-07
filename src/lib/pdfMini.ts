// Arma un PDF sencillo (una imagen JPEG por página) sin usar librerías.

export type PaginaJPEG = { jpeg: Uint8Array; w: number; h: number }

const A4_ANCHO = 595.28
const A4_ALTO = 841.89

export function armarPDF(paginas: PaginaJPEG[]): Blob {
  const enc = new TextEncoder()
  const partes: Uint8Array[] = []
  const offsets: number[] = []
  let largo = 0

  const escribir = (x: Uint8Array | string) => {
    const b = typeof x === 'string' ? enc.encode(x) : x
    partes.push(b)
    largo += b.length
  }
  const objeto = (n: number, cuerpo: (Uint8Array | string)[]) => {
    offsets[n] = largo
    escribir(`${n} 0 obj\n`)
    cuerpo.forEach(escribir)
    escribir('\nendobj\n')
  }

  escribir(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]))

  const total = 2 + paginas.length * 3
  const kids = paginas.map((_, i) => `${3 + i * 3} 0 R`).join(' ')

  objeto(1, ['<< /Type /Catalog /Pages 2 0 R >>'])
  objeto(2, [`<< /Type /Pages /Kids [${kids}] /Count ${paginas.length} >>`])

  paginas.forEach((p, i) => {
    const pagina = 3 + i * 3
    const contenido = 4 + i * 3
    const imagen = 5 + i * 3
    const stream = `q ${A4_ANCHO} 0 0 ${A4_ALTO} 0 0 cm /Im0 Do Q`

    objeto(pagina, [
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4_ANCHO} ${A4_ALTO}] ` +
      `/Resources << /XObject << /Im0 ${imagen} 0 R >> >> /Contents ${contenido} 0 R >>`,
    ])
    objeto(contenido, [`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`])
    objeto(imagen, [
      `<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} /ColorSpace /DeviceRGB ` +
      `/BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpeg.length} >>\nstream\n`,
      p.jpeg,
      '\nendstream',
    ])
  })

  const xref = largo
  let tabla = `xref\n0 ${total + 1}\n0000000000 65535 f \n`
  for (let n = 1; n <= total; n++) tabla += `${String(offsets[n]).padStart(10, '0')} 00000 n \n`
  escribir(tabla)
  escribir(`trailer\n<< /Size ${total + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`)

  return new Blob(partes as unknown as BlobPart[], { type: 'application/pdf' })
}
