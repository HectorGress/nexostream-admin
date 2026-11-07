// Aplica la parte 2 a tus páginas (panel del administrador, reportes y panel del cliente).
// Uso: en la carpeta principal del proyecto:  node aplicar-mejoras2.js
// Si algo no coincide, NO cambia nada y te dice qué cambio falló.

const fs = require('fs')
const path = require('path')

const PARCHE = path.join(__dirname, 'mejoras2.patch.txt')
const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&')

if (!fs.existsSync(PARCHE)) {
  console.error('❌ Falta el archivo mejoras2.patch.txt junto a este script.')
  process.exit(1)
}

const parche = fs.readFileSync(PARCHE, 'utf8').replace(/\r\n/g, '\n')
const archivos = [...parche.matchAll(/@@FILE ([^@\n]+)@@\n@@MARCA ([^@\n]+)@@\n([\s\S]*?)(?=\n@@FILE |\s*$)/g)]
if (archivos.length === 0) {
  console.error('❌ No pude leer mejoras2.patch.txt (¿se copió completo?).')
  process.exit(1)
}

const trabajos = []
const problemas = []
let yaAplicados = 0

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
    yaAplicados++
    continue
  }

  const bloques = [...cuerpo.matchAll(/@@EDIT ([^@\n]*)@@\n@@FIND@@\n([\s\S]*?)\n@@REPLACE@@\n([\s\S]*?)\n@@END@@/g)]
  const cambios = []
  for (const [, nombre, buscar, reemplazo] of bloques) {
    const patron = buscar.trim().split(/\s+/).map(escapar).join('\\s+')
    const coincidencias = [...texto.matchAll(new RegExp(patron, 'g'))]
    if (coincidencias.length !== 1) {
      problemas.push(`   • ${rel} → cambio ${nombre.trim()}: se encontró ${coincidencias.length} vez/veces (debía ser 1)`)
      continue
    }
    const inicio = coincidencias[0].index
    cambios.push({ nombre: nombre.trim(), inicio, fin: inicio + coincidencias[0][0].length, reemplazo })
  }

  cambios.sort((a, b) => a.inicio - b.inicio)
  for (let i = 1; i < cambios.length; i++) {
    if (cambios[i].inicio < cambios[i - 1].fin) {
      problemas.push(`   • ${rel}: los cambios ${cambios[i - 1].nombre} y ${cambios[i].nombre} se encimarían`)
    }
  }
  trabajos.push({ rel, original, texto, usaCRLF, cambios })
}

if (problemas.length > 0) {
  console.error('❌ No se aplicó NADA. Estos puntos no coinciden con tus archivos:')
  problemas.forEach((p) => console.error(p))
  console.error('\nProbablemente algún archivo cambió. Mándame el mensaje completo y lo ajusto.')
  process.exit(1)
}

if (trabajos.length === 0) {
  console.log('ℹ️  Todo ya estaba aplicado. No se cambió nada.')
  process.exit(0)
}

for (const t of trabajos) {
  const respaldo = t.rel + '.antes-parte2.bak'
  if (!fs.existsSync(respaldo)) fs.writeFileSync(respaldo, t.original)
  let nuevo = t.texto
  for (const c of [...t.cambios].reverse()) {
    nuevo = nuevo.slice(0, c.inicio) + c.reemplazo + nuevo.slice(c.fin)
  }
  if (t.usaCRLF) nuevo = nuevo.replace(/\n/g, '\r\n')
  fs.writeFileSync(t.rel, nuevo)
  console.log(`✅ ${t.rel}: ${t.cambios.length} cambios (respaldo: ${respaldo})`)
}
