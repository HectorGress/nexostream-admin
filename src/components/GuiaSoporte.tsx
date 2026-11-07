'use client'

import { Lightbulb, ChevronDown } from 'lucide-react'
import { makeUi } from '@/lib/ui'

const ANTES_DE_REPORTAR = [
  '¿Entraste con el correo y la contraseña exactos de "Mis cuentas"? (usa el botón de copiar)',
  '¿Estás en TU perfil y escribiste bien tu PIN?',
  '¿Cerraste la app por completo y la volviste a abrir?',
  '¿Probaste con otro dispositivo o con tu red de datos?',
  '¿Tu cuenta sigue vigente? Revisa la fecha de vencimiento.',
]

const GUIAS: { servicio: string; pasos: string[] }[] = [
  { servicio: 'Netflix', pasos: ['Entra solo a tu perfil y con tu PIN.', 'No cambies el correo, la contraseña ni el PIN de la cuenta.', 'Si te pide verificar o actualizar algo, no lo hagas: repórtalo aquí.'] },
  { servicio: 'Disney+', pasos: ['Elige tu perfil y escribe tu PIN.', 'No cierres la sesión de otros dispositivos.', 'Si aparece un error de ubicación o dispositivo, repórtalo aquí.'] },
  { servicio: 'HBO Max / Max', pasos: ['Usa solo tu perfil.', 'No cambies la contraseña ni el correo.', 'Si te saca de la sesión seguido, avísanos.'] },
  { servicio: 'Prime Video', pasos: ['Entra a tu perfil con tu PIN.', 'No compres ni rentes contenido desde la cuenta.', 'Si pide confirmar un código, repórtalo aquí con una captura.'] },
  { servicio: 'ViX y otros', pasos: ['Usa el correo y la contraseña tal como aparecen en "Mis cuentas".', 'No cambies los datos de acceso.', 'Si algo falla, manda una captura del mensaje que ves.'] },
]

export default function GuiaSoporte({ dark }: { dark: boolean }) {
  const ui = makeUi(dark)

  return (
    <section className={`p-5 sm:p-6 rounded-2xl border space-y-4 ${ui.card}`}>
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2"><Lightbulb size={18} /> Antes de reportar</h2>
        <p className={`text-sm ${ui.muted}`}>Muchos problemas se resuelven en un minuto. Revisa esto primero:</p>
      </div>

      <ul className="space-y-1.5 text-sm">
        {ANTES_DE_REPORTAR.map((p) => (
          <li key={p} className="flex gap-2"><span className="text-indigo-500">✓</span><span>{p}</span></li>
        ))}
      </ul>
      <p className={`text-xs ${ui.muted}`}>Si ya probaste todo y sigue fallando, envía tu reporte abajo y te ayudamos.</p>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Guía rápida por servicio</h3>
        {GUIAS.map((g) => (
          <details key={g.servicio} className={`group rounded-xl border px-3.5 py-2.5 ${ui.cardInner}`}>
            <summary className="flex items-center justify-between cursor-pointer text-sm font-medium list-none">
              {g.servicio}
              <ChevronDown size={16} className="transition-transform group-open:rotate-180" />
            </summary>
            <ul className={`mt-2 space-y-1 text-sm list-disc pl-5 ${ui.muted}`}>
              {g.pasos.map((p) => <li key={p}>{p}</li>)}
            </ul>
          </details>
        ))}
      </div>
    </section>
  )
}
