import type { ReactNode } from 'react'
import { Aviso } from '../../../componentes/publico/Aviso.tsx'
import { PasoNumerado } from '../../../componentes/publico/PasoNumerado.tsx'
import { Icono } from '../../../componentes/Icono.tsx'
import { focoClaro } from '../../../componentes/marco/foco.ts'
import { fotosTaller } from '../fotos.ts'
import type { TallerItem } from '../tiposPortal.ts'
import type { Reserva } from './useReserva.ts'

export function PasoTaller({ reserva }: { reserva: Reserva }): ReactNode {
  const { talleres, ordenTalleres, setOrdenTalleres, cargandoTalleres, errorTalleres, recargarTalleres, tallerSeleccionado, setTallerSeleccionado, manejarTecladoTaller, idHeadingTalleres, pasosCompletos } = reserva
  const ordenados: TallerItem[] = ordenTalleres === 'recomendados' ? talleres : [...talleres].sort((a, b) => ordenTalleres === 'precio' ? a.tarifaBase - b.tarifaBase : b.promedio - a.promedio || b.servicios - a.servicios)
  return <PasoNumerado id={idHeadingTalleres} numero={2} titulo="Elige el taller" bajada="La tarifa base se ve antes de reservar." completo={pasosCompletos[1]}>
    {cargandoTalleres && <p role="status" className="text-sm text-publico-tinta-media">Cargando talleres…</p>}
    {errorTalleres && <Aviso tipo="error">{errorTalleres} <button type="button" onClick={recargarTalleres} className={`underline decoration-publico-acento underline-offset-4 ${focoClaro}`}>Reintentar</button></Aviso>}
    {!cargandoTalleres && !errorTalleres && talleres.length === 0 && <Aviso>No hay talleres disponibles para esta especialidad en este momento.</Aviso>}
    {!cargandoTalleres && !errorTalleres && talleres.length > 0 && <>
      <div role="group" aria-label="Ordenar talleres" className="mb-3 grid grid-cols-3 gap-1 rounded-lg border border-publico-linea bg-publico-superficie-suave p-1 text-xs sm:inline-grid sm:w-auto sm:grid-cols-[repeat(3,auto)]">
        {([['recomendados', 'Recomendados'], ['precio', 'Menor precio'], ['calificados', 'Mejor calificados']] as const).map(([valor, texto]) => <button key={valor} type="button" aria-pressed={ordenTalleres === valor} onClick={() => setOrdenTalleres(valor)} className={`min-h-11 rounded-md px-2 leading-tight font-bold sm:px-3 ${ordenTalleres === valor ? 'bg-publico-superficie text-publico-tinta shadow-sm shadow-publico-tinta/10' : 'text-publico-tinta-media hover:bg-publico-superficie hover:text-publico-tinta'} ${focoClaro}`}>{texto}</button>)}
      </div>
      <div role="radiogroup" aria-labelledby={`${idHeadingTalleres}-titulo`} className="grid gap-3 min-[680px]:grid-cols-2 lg:grid-cols-1">
        {ordenados.map((taller, indice) => {
          const elegido = tallerSeleccionado?.id === taller.id
          const foto = fotosTaller[taller.id]
          return <div key={taller.id} role="radio" aria-checked={elegido} tabIndex={elegido ? 0 : -1} onClick={() => setTallerSeleccionado(taller)} onKeyDown={(evento) => {
            if (evento.key === ' ' || evento.key === 'Enter') { evento.preventDefault(); setTallerSeleccionado(taller) }
            else manejarTecladoTaller(evento, indice, ordenados)
          }} className={`grid cursor-pointer grid-cols-[4.75rem_minmax(0,1fr)] gap-3 rounded-2xl border-2 bg-publico-superficie p-3.5 min-[680px]:grid-cols-[5.5rem_minmax(0,1fr)] lg:grid-cols-[8rem_minmax(0,1fr)_auto] lg:items-center lg:gap-4 ${elegido ? 'border-publico-tinta shadow-[inset_0_0_0_1px_var(--color-publico-tinta)]' : 'border-publico-linea hover:border-publico-linea-fuerte'} ${focoClaro}`}>
            {foto ? <img src={foto.src} width="800" height="600" alt="" loading="lazy" className="h-24 w-full rounded-lg object-cover lg:h-28" /> : <span aria-hidden="true" className="grid h-24 place-items-center rounded-lg bg-publico-superficie-suave text-3xl font-bold text-publico-tinta-media lg:h-28">{taller.razonSocial.charAt(0)}</span>}
            <span className="min-w-0 self-center"><b className="block leading-snug">{taller.razonSocial}</b><span className="mt-1 flex flex-wrap gap-x-3 text-xs text-publico-tinta-media"><span className="inline-flex items-center gap-1"><Icono nombre="estrella" className="size-3.5 text-publico-pendiente" /><b className="text-publico-tinta">{taller.promedio.toFixed(1)}</b></span><span>{taller.servicios} servicios</span></span><span className="mt-1.5 block text-xs leading-snug text-publico-tinta-media">{taller.direccion}, {taller.distrito}</span></span>
            <span className="col-span-2 flex items-end justify-between gap-2 border-t border-publico-linea pt-2.5 lg:col-span-1 lg:h-full lg:flex-col lg:items-end lg:justify-center lg:border-t-0 lg:border-l lg:pt-0 lg:pl-4"><span className="rounded-lg bg-publico-superficie-suave px-2 py-1 text-xs font-bold text-publico-tinta-media">Atiende hoy: {taller.atiendeHoy ? 'Sí' : 'No'}</span><span className="text-right"><small className="block text-xs text-publico-tinta-suave">Tarifa base</small><b className="text-xl tabular-nums">S/ {taller.tarifaBase.toFixed(2)}</b></span></span>
          </div>
        })}
      </div>
    </>}
  </PasoNumerado>
}
