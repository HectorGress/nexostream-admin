// Ajustes del negocio. Cambia aquí lo que necesites; no hay que tocar nada más.

export const NEGOCIO_NOMBRE = 'NexoStream'

// Datos de pago que ve el cliente al renovar
export const PAGO = {
  banco: 'Klar',
  titular: 'Hector Gress Angeles',
  clabe: '661180005957342832',
}

// Tu WhatsApp con código de país y sin "+" ni espacios (ej. '527711234567').
// Si lo dejas vacío, los botones de WhatsApp no se muestran.
export const WHATSAPP_ADMIN = ''

// Descuento por pagar varios meses por adelantado (0.10 = 10%)
export const DESCUENTO_MESES: Record<number, number> = { 1: 0, 3: 0.1, 6: 0.15 }

// "Arma tu combo": descuento según cuántos servicios elija (de 3 en adelante aplica el último)
export const DESCUENTO_COMBO: Record<number, number> = { 2: 0.05, 3: 0.1 }

// Días gratis que gana quien invita a un amigo que ya compró
export const DIAS_PREMIO_REFERIDO = 7

// Avisos automáticos al celular: cuántos días antes de vencer (0 = el mismo día)
export const DIAS_AVISO_VENCIMIENTO = [3, 1, 0]
