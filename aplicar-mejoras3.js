// Aplica la parte 3 (tema cálido, menú fijo y funciones nuevas) a tus páginas.
// Uso: en la carpeta principal del proyecto:  node aplicar-mejoras3.js
// Si algo no coincide, NO cambia nada y te dice qué falló.

const fs = require('fs')
const path = require('path')

const PARCHE = path.join(__dirname, 'mejoras3.patch.txt')
const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&')

if (!fs.existsSync(PARCHE)) {
  console.error('❌ Falta el archivo mejoras3.patch.txt junto a este script.')
  process.exit(1)
}

const parche = fs.readFileSync(PARCHE, 'utf8').replace(/\r\n/g, '\n')
const archivos = [...parche.matchAll(/@@FILE ([^@\n]+)@@\n@@MARCA ([^@\n]+)@@\n([\s\S]*?)(?=\n@@FILE |\s*$)/g)]
if (archivos.length === 0) {
  console.error('❌ No pude leer mejoras3.patch.txt (¿se copió completo?).')
  process.exit(1)
}

const trabajos = []
const problemas = []

for (const [, ruta, marca, cuerpo] of archivos) {
  const rel = ruta.trim().split('/').join(path.sep)
  if (!fs.existsSync(rel)) {
    problemas.push(`   • No encuentro ${rel}. Corre este archivo desde la carpeta principal del proyecto (donde está package.json).`)
    continue
  }
  const original = fs.readFileSync(rel, 'utf8')
  const usaCRLF = original.includes('\r\n')
  const texto = original.replace(/\r\n/g, '\n')

  if (texto.includes(marca.trim())) {
    console.log(`ℹ️  ${rel} ya tiene estos cambios. Se omite.`)
    continue
  }

  const cambios = []
  for (const [, nombre, buscar, reemplazo] of cuerpo.matchAll(/@@EDIT ([^@\n]*)@@\n@@FIND@@\n([\s\S]*?)\n@@REPLACE@@\n([\s\S]*?)\n@@END@@/g)) {
    const patron = buscar.trim().split(/\s+/).map(escapar).join('\\s+')
    const coincidencias = [...texto.matchAll(new RegExp(patron, 'g'))]
    if (coincidencias.length !== 1) {
      problemas.push(`   • ${rel} → ${nombre.trim()}: se encontró ${coincidencias.length} vez/veces (debía ser 1)`)
      continue
    }
    const inicio = coincidencias[0].index
    cambios.push({ nombre: nombre.trim(), inicio, fin: inicio + coincidencias[0][0].length, reemplazo })
  }
  const agregados = [...cuerpo.matchAll(/@@APPEND@@\n([\s\S]*?)\n@@END@@/g)].map((m) => m[1])

  cambios.sort((a, b) => a.inicio - b.inicio)
  for (let i = 1; i < cambios.length; i++) {
    if (cambios[i].inicio < cambios[i - 1].fin) {
      problemas.push(`   • ${rel}: los cambios ${cambios[i - 1].nombre} y ${cambios[i].nombre} se encimarían`)
    }
  }
  trabajos.push({ rel, original, texto, usaCRLF, cambios, agregados })
}

if (problemas.length > 0) {
  console.error('❌ No se aplicó NADA. Estos puntos no coinciden con tus archivos:')
  problemas.forEach((p) => console.error(p))
  console.error('\nProbablemente algún archivo cambió o falta aplicar una parte anterior. Mándame el mensaje completo y lo ajusto.')
  process.exit(1)
}

if (trabajos.length === 0) {
  console.log('ℹ️  Todo ya estaba aplicado. No se cambió nada.')
  process.exit(0)
}

for (const t of trabajos) {
  const respaldo = t.rel + '.antes-parte3.bak'
  if (!fs.existsSync(respaldo)) fs.writeFileSync(respaldo, t.original)
  let nuevo = t.texto
  for (const c of [...t.cambios].reverse()) nuevo = nuevo.slice(0, c.inicio) + c.reemplazo + nuevo.slice(c.fin)
  for (const a of t.agregados) nuevo = nuevo.replace(/\n*$/, '\n') + '\n' + a + '\n'
  if (t.usaCRLF) nuevo = nuevo.replace(/\n/g, '\r\n')
  fs.writeFileSync(t.rel, nuevo)
  console.log(`✅ ${t.rel}: ${t.cambios.length} cambio(s)${t.agregados.length ? ' + estilos al final' : ''} (respaldo: ${respaldo})`)
}
