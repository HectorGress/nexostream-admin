// Aplica las mejoras al panel de administración (src/app/admin/dashboard/page.tsx).
// Uso: en la carpeta principal del proyecto, corre:  node aplicar-mejoras.js
// Si algo no coincide, NO cambia nada y te dice cuál fue el problema.

const fs = require('fs')
const path = require('path')

const RUTA = path.join('src', 'app', 'admin', 'dashboard', 'page.tsx')
const PARCHE = path.join(__dirname, 'mejoras.patch.txt')

const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&')

if (!fs.existsSync(RUTA)) {
  console.error('❌ No encuentro ' + RUTA)
  console.error('   Corre este archivo desde la carpeta principal del proyecto (donde está package.json).')
  process.exit(1)
}
if (!fs.existsSync(PARCHE)) {
  console.error('❌ Falta el archivo mejoras.patch.txt junto a este script.')
  process.exit(1)
}

const original = fs.readFileSync(RUTA, 'utf8')
const usaCRLF = original.includes('\r\n')
const texto = original.replace(/\r\n/g, '\n')

if (texto.includes('registrarBitacora')) {
  console.log('ℹ️  Este archivo ya tiene las mejoras aplicadas. No se cambió nada.')
  process.exit(0)
}

const parche = fs.readFileSync(PARCHE, 'utf8').replace(/\r\n/g, '\n')
const bloques = [...parche.matchAll(/@@EDIT ([^@\n]*)@@\n@@FIND@@\n([\s\S]*?)\n@@REPLACE@@\n([\s\S]*?)\n@@END@@/g)]

if (bloques.length === 0) {
  console.error('❌ No pude leer mejoras.patch.txt (¿se copió completo?).')
  process.exit(1)
}

// 1) Localiza cada cambio en el archivo original (debe aparecer exactamente 1 vez)
const cambios = []
const problemas = []

for (const [, nombre, buscar, reemplazo] of bloques) {
  const patron = buscar.trim().split(/\s+/).map(escapar).join('\\s+')
  const coincidencias = [...texto.matchAll(new RegExp(patron, 'g'))]
  if (coincidencias.length !== 1) {
    problemas.push(`   • Cambio ${nombre.trim()}: se encontró ${coincidencias.length} vez/veces (debía ser 1)`)
    continue
  }
  const inicio = coincidencias[0].index
  cambios.push({ nombre: nombre.trim(), inicio, fin: inicio + coincidencias[0][0].length, reemplazo })
}

if (problemas.length > 0) {
  console.error('❌ No se aplicó NADA. Estos cambios no coinciden con tu archivo:')
  problemas.forEach((p) => console.error(p))
  console.error('\nProbablemente el archivo cambió. Mándame el mensaje completo y lo ajusto.')
  process.exit(1)
}

// 2) Que ningún cambio se encime con otro
cambios.sort((a, b) => a.inicio - b.inicio)
for (let i = 1; i < cambios.length; i++) {
  if (cambios[i].inicio < cambios[i - 1].fin) {
    console.error(`❌ Los cambios "${cambios[i - 1].nombre}" y "${cambios[i].nombre}" se encimarían. No se aplicó nada.`)
    process.exit(1)
  }
}

// 3) Respaldo y escritura
const respaldo = RUTA + '.bak'
if (!fs.existsSync(respaldo)) fs.writeFileSync(respaldo, original)

let nuevo = texto
for (const c of [...cambios].reverse()) {
  nuevo = nuevo.slice(0, c.inicio) + c.reemplazo + nuevo.slice(c.fin)
}
if (usaCRLF) nuevo = nuevo.replace(/\n/g, '\r\n')
fs.writeFileSync(RUTA, nuevo)

console.log(`✅ Listo: se aplicaron ${cambios.length} cambios a ${RUTA}`)
console.log(`   Respaldo del archivo original: ${respaldo}`)
