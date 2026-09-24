import type { ReactNode } from 'react'
import { Aviso } from '../../../componentes/publico/Aviso.tsx'
import { PasoNumerado } from '../../../componentes/publico/PasoNumerado.tsx'
import { focoClaro } from '../../../componentes/marco/foco.ts'
import { fotosEspecialidad } from '../fotos.ts'
import type { Reserva } from './useReserva.ts'

export function PasoEspecialidad({ reserva }: { reserva: Reserva }): ReactNode {
  const { especialidades, cargandoEspecialidades, errorEspecialidades, recargarEspecialidades, especialidadSeleccionada, setEspecialidadSeleccionada, manejarTecladoEspecialidad, idHeadingEspecialidad, pasosCompletos } = reserva
  return <PasoNumerado id={idHeadingEspecialidad} numero={1} titulo="¿Qué necesitas reparar?" bajada="Empieza por el tipo de servicio que buscas." completo={pasosCompletos[0]}>
    {cargandoEspecialidades && <p role="status" className="text-sm text-publico-tinta-media">Cargando especialidades…</p>}
    {errorEspecialidades && <Aviso tipo="error">{errorEspecialidades} <button type="button" onClick={recargarEspecialidades} className={`underline decoration-publico-acento underline-offset-4 ${focoClaro}`}>Reintentar</button></Aviso>}
    {!cargandoEspecialidades && !errorEspecialidades && especialidades.length === 0 && <Aviso>No hay especialidades disponibles en este momento.</Aviso>}
    {!cargandoEspecialidades && !errorEspecialidades && especialidades.length > 0 && <div role="radiogroup" aria-labelledby={`${idHeadingEspecialidad}-titulo`} className="grid gap-3 min-[680px]:grid-cols-3">
      {especialidades.map((esp, indice) => {
        const elegida = esp.clave === especialidadSeleccionada
        const foto = fotosEspecialidad[esp.clave]
        return <div key={esp.clave} role="radio" aria-checked={elegida} tabIndex={elegida ? 0 : -1} onClick={() => setEspecialidadSeleccionada(esp.clave)} onKeyDown={(evento) => {
          if (evento.key === ' ' || evento.key === 'Enter') { evento.preventDefault(); setEspecialidadSeleccionada(esp.clave) }
          else manejarTecladoEspecialidad(evento, indice)
        }} className={`group relative grid cursor-pointer grid-cols-[6.5rem_1fr] overflow-hidden rounded-2xl border-2 bg-publico-superficie min-[680px]:grid-cols-1 ${elegida ? 'border-publico-tinta shadow-[inset_0_0_0_1px_var(--color-publico-tinta)]' : 'border-publico-linea hover:border-publico-linea-fuerte'} ${focoClaro}`}>
          <img src={foto.src} width="800" height="600" alt="" loading="lazy" className="h-full min-h-29 w-full object-cover min-[680px]:h-30 min-[680px]:min-h-0" />
          <span className="grid content-center gap-1 p-3.5 pr-8 min-[680px]:min-h-32 min-[680px]:content-start min-[680px]:pr-3.5"><b className="text-base leading-snug">{esp.titulo}</b><span className="text-sm leading-snug text-publico-tinta-media">{esp.detalle}</span></span>
          {elegida && <span aria-hidden="true" className="absolute top-3 right-3 grid size-6 place-items-center rounded-2xl bg-publico-tinta text-sm font-bold text-publico-superficie">✓</span>}
        </div>
      })}
    </div>}
  </PasoNumerado>
}
