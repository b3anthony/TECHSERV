import type { ReactNode } from 'react'
import { Boton } from '../../../componentes/publico/Boton.tsx'
import { Tarjeta } from '../../../componentes/publico/Tarjeta.tsx'
import { formatearFechaHora } from '../fechas.ts'
import type { Reserva } from './useReserva.ts'

export function ResumenReserva({ reserva }: { reserva: Reserva }): ReactNode {
  const { tallerSeleccionado, objetoEspecialidad, fecha, horaSeleccionada, direccion, enviando, pasosPendientes } = reserva
  return <aside className="hidden lg:block lg:sticky lg:top-6" aria-labelledby="resumen-reserva-titulo"><Tarjeta className="p-6 shadow-xl shadow-publico-tinta/10">
    <h2 id="resumen-reserva-titulo" className="text-xl font-bold">Tu reserva</h2><p className="mt-1 text-sm text-publico-tinta-suave">Revisa tus elecciones mientras reservas.</p>
    <dl className="mt-5 grid gap-3 border-b border-publico-linea pb-5 text-sm">{[['Taller', tallerSeleccionado?.razonSocial || 'Por elegir'], ['Especialidad', objetoEspecialidad?.titulo || 'Por elegir'], ['Día y hora', fecha && horaSeleccionada ? formatearFechaHora(fecha, horaSeleccionada) : 'Por elegir'], ['Dirección', direccion.trim() || 'Por completar']].map(([titulo, valor]) => <div key={titulo} className="grid grid-cols-[6.25rem_minmax(0,1fr)] gap-2"><dt className="text-publico-tinta-suave">{titulo}</dt><dd className="break-words font-bold">{valor}</dd></div>)}</dl>
    <div className="mt-5 flex items-end justify-between gap-2"><span className="text-sm font-bold">Visita técnica desde</span><strong className="whitespace-nowrap text-2xl tabular-nums">{tallerSeleccionado ? `S/ ${tallerSeleccionado.tarifaBase.toFixed(2)}` : '—'}</strong></div>
    <p className="mt-3 text-xs leading-relaxed text-publico-tinta-media">El costo final de repuestos y mano de obra se confirma tras el diagnóstico. El pago se hace directamente al taller.</p>
    <Boton type="submit" variante="principal" cargando={enviando} className="mt-5 w-full">Confirmar reserva</Boton>
    <p className="mt-2 text-xs text-publico-tinta-media" aria-live="polite">{pasosPendientes.length ? `${pasosPendientes.length === 1 ? 'Falta 1 dato' : `Faltan ${pasosPendientes.length} datos`}: ${pasosPendientes.join(', ')}.` : 'Ya puedes confirmar tu reserva.'}</p>
  </Tarjeta></aside>
}
