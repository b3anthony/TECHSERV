import type { ReactNode } from 'react'
import { Boton } from '../../../componentes/publico/Boton.tsx'
import type { Reserva } from './useReserva.ts'

export function BarraResumenMovil({ reserva }: { reserva: Reserva }): ReactNode {
  const { tallerSeleccionado, objetoEspecialidad, enviando, pasosPendientes } = reserva
  return <div className="fixed inset-x-0 bottom-0 z-30 border-t border-publico-linea-fuerte bg-publico-superficie px-4 py-2 shadow-xl shadow-publico-tinta/15 lg:hidden" aria-label="Resumen de tu reserva"><div className="mx-auto flex max-w-6xl items-center gap-2.5"><span className="min-w-0 flex-1 truncate text-xs text-publico-tinta-media">{tallerSeleccionado?.razonSocial || 'Taller por elegir'} · {objetoEspecialidad?.titulo || 'Especialidad'}</span><b className="shrink-0 whitespace-nowrap text-sm tabular-nums">{tallerSeleccionado ? `S/ ${tallerSeleccionado.tarifaBase.toFixed(2)}` : '—'}</b><Boton type="submit" variante="principal" cargando={enviando} className="shrink-0 px-3 text-sm">Confirmar</Boton></div><span className="sr-only" aria-live="polite">{pasosPendientes.length ? `${pasosPendientes.length === 1 ? 'Falta 1 dato' : `Faltan ${pasosPendientes.length} datos`}: ${pasosPendientes.join(', ')}.` : 'Ya puedes confirmar tu reserva.'}</span></div>
}
