export const PLATAFORMAS = ['Netflix', 'Prime Video', 'ViX', 'HBO Max', 'Disney+']

// Perfiles típicos por plataforma. Confírmalos con tu plan real, porque cambian.
// Igual se pueden editar al registrar cada cuenta madre.
export const PERFILES_POR_DEFECTO = {
  'Netflix': 5,
  'Prime Video': 6,
  'ViX': 5,
  'HBO Max': 5,
  'Disney+': 7,
}

// PIN aleatorio de 4 dígitos (el que usan los perfiles de estas plataformas)
export function generarPin(digitos = 4) {
  const arr = new Uint32Array(1)
  crypto.getRandomValues(arr)
  return String(arr[0] % 10 ** digitos).padStart(digitos, '0')
}

// Sugiere el primer nombre de perfil libre: P1, P2, P3...
export function siguientePerfilLibre(usados) {
  let i = 1
  while (usados.includes(`P${i}`)) i++
  return `P${i}`
}