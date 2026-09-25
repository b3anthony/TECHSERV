import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { focoClaro } from '../../../componentes/marco/foco.ts'
import { Aviso } from '../../../componentes/publico/Aviso.tsx'
import { BarraResumenMovil } from './BarraResumenMovil.tsx'
import { DialogoConfirmacion } from './DialogoConfirmacion.tsx'
import { PasoDetalle } from './PasoDetalle.tsx'
import { PasoDiaHora } from './PasoDiaHora.tsx'
import { PasoEspecialidad } from './PasoEspecialidad.tsx'
import { PasoPago } from './PasoPago.tsx'
import { PasoTaller } from './PasoTaller.tsx'
import { ResumenReserva } from './ResumenReserva.tsx'
import { useReserva } from './useReserva.ts'

export function CatalogoReserva(): ReactNode {
  const reserva = useReserva()
  return <div id="reserva-publica" className="mx-auto w-full max-w-6xl px-4 pb-28 font-publico text-publico-tinta scroll-pb-28 sm:px-6 lg:px-8 lg:pb-16">
    <header className="py-6 lg:pt-10 lg:pb-8"><p className="text-sm text-publico-tinta-suave"><Link to="/" className={`underline decoration-publico-acento underline-offset-4 ${focoClaro}`}>Inicio</Link> / Reservar visita</p><h1 className="mt-2 text-[clamp(2rem,1.3rem+2.5vw,3rem)] leading-[1.12] font-bold tracking-[-0.035em]">Reserva tu visita técnica</h1><p className="mt-2.5 max-w-2xl text-[1.0625rem] leading-[1.55] text-publico-tinta-media">Elige lo que necesitas, compara la tarifa base y separa una hora con cupo.</p></header>
    <form noValidate onSubmit={reserva.manejarConfirmar} className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_19.5rem]"><div className="grid min-w-0 gap-4">
      <PasoEspecialidad reserva={reserva} /><PasoTaller reserva={reserva} /><PasoDiaHora reserva={reserva} /><PasoDetalle reserva={reserva} /><PasoPago reserva={reserva} />
      {reserva.errorEnvio && <Aviso tipo="error">{reserva.errorEnvio}</Aviso>}
      <p className="text-sm text-publico-tinta-media lg:hidden">{reserva.pasosPendientes.length ? `${reserva.pasosPendientes.length === 1 ? 'Falta 1 dato' : `Faltan ${reserva.pasosPendientes.length} datos`}: ${reserva.pasosPendientes.join(', ')}.` : 'Ya puedes confirmar tu reserva.'}</p>
    </div><ResumenReserva reserva={reserva} /><BarraResumenMovil reserva={reserva} /></form>
    <DialogoConfirmacion reserva={reserva} />
  </div>
}
