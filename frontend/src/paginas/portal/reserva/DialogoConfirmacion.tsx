import type { ReactNode } from 'react'
import { Boton } from '../../../componentes/publico/Boton.tsx'
import { Aviso } from '../../../componentes/publico/Aviso.tsx'
import { formatearFechaHora } from '../fechas.ts'
import type { Reserva } from './useReserva.ts'

export function DialogoConfirmacion({ reserva }: { reserva: Reserva }): ReactNode {
  const { dialogRef, ordenConfirmada, avisoFotosError, tallerSeleccionado, objetoEspecialidad, fecha, horaSeleccionada, cerrarModalYVerOrden, cerrarModalYVerSolicitudes } = reserva
  return <dialog ref={dialogRef} aria-labelledby="dialog-reserva-titulo" onCancel={(evento) => { evento.preventDefault(); cerrarModalYVerOrden() }} className="m-auto max-h-[calc(100dvh-2rem)] w-[min(31rem,calc(100%-2rem))] overflow-y-auto rounded-2xl border-0 bg-publico-superficie p-6 text-publico-tinta shadow-2xl backdrop:bg-publico-panel/75">
    {ordenConfirmada && <><div className="flex items-start justify-between gap-4"><div><span aria-hidden="true" className="grid size-10 place-items-center rounded-lg bg-publico-completada font-bold text-publico-superficie">✓</span><h2 id="dialog-reserva-titulo" className="mt-3 text-2xl font-bold">Reserva registrada</h2><p className="mt-1 text-sm text-publico-tinta-media">Tu visita quedó separada.</p></div></div>
      {avisoFotosError && <Aviso tipo="error" className="mt-4">{avisoFotosError}</Aviso>}
      <span className="mt-4 inline-block rounded-lg bg-publico-acento-tenue px-3 py-1 font-bold">{ordenConfirmada.codigo}</span>
      <dl className="my-5 grid gap-2 text-sm">{[['Taller', tallerSeleccionado?.razonSocial], ['Especialidad', ordenConfirmada.etiquetaEspecialidad || objetoEspecialidad?.titulo], ['Fecha y hora', formatearFechaHora(ordenConfirmada.fechaProgramada || fecha, ordenConfirmada.horaProgramada || horaSeleccionada)], ['Dirección', `${ordenConfirmada.direccion}, ${ordenConfirmada.distrito}`], ['Visita técnica', tallerSeleccionado ? `desde S/ ${tallerSeleccionado.tarifaBase.toFixed(2)}` : '—']].map(([titulo, valor]) => <div key={titulo} className="flex justify-between gap-3 border-b border-publico-linea pb-2"><dt className="text-publico-tinta-suave">{titulo}</dt><dd className="text-right font-bold">{valor}</dd></div>)}</dl>
      <div className="grid gap-2"><Boton type="button" variante="principal" onClick={cerrarModalYVerOrden}>Ver el seguimiento</Boton><Boton type="button" variante="secundario" onClick={cerrarModalYVerSolicitudes}>Ir a mis solicitudes</Boton></div>
    </>}
  </dialog>
}
