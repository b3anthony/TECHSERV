import type { ReactNode } from 'react'
import { PasoNumerado } from '../../../componentes/publico/PasoNumerado.tsx'
import { focoClaro } from '../../../componentes/marco/foco.ts'
import { hoyString } from '../fechas.ts'
import type { Reserva } from './useReserva.ts'

function fechaLocal(valor: string): Date { return new Date(`${valor}T12:00:00`) }
function fechaIso(valor: Date): string { return `${valor.getFullYear()}-${String(valor.getMonth() + 1).padStart(2, '0')}-${String(valor.getDate()).padStart(2, '0')}` }

export function PasoDiaHora({ reserva }: { reserva: Reserva }): ReactNode {
  const { fecha, inicioTira, elegirFecha, agenda, cargandoAgenda, errorAgenda, horaSeleccionada, setHoraSeleccionada, errores, pasosCompletos } = reserva
  const hoy = hoyString()
  const dias = Array.from({ length: 7 }, (_, indice) => { const dia = fechaLocal(inicioTira); dia.setDate(dia.getDate() + indice); return dia })
  return <PasoNumerado id="paso-dia-hora" numero={3} titulo="Día y hora" bajada="Escoge una franja disponible para la visita." completo={pasosCompletos[2]}>
    <fieldset>
      <legend className="mb-2 text-sm font-bold text-publico-tinta-media">Elige un día</legend>
      <div className="grid grid-cols-4 gap-2 min-[680px]:grid-cols-7" aria-label="Siete días disponibles">
        {dias.map((dia) => { const valor = fechaIso(dia); const elegido = fecha === valor; const pasado = valor < hoy; return <button key={valor} id={valor === fechaIso(dias[0]) ? 'dia-primero' : undefined} type="button" aria-pressed={elegido} aria-label={dia.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })} aria-disabled={pasado} onClick={() => { if (!pasado) elegirFecha(valor) }} className={`grid min-h-16 content-center justify-items-center rounded-lg border px-1 text-xs ${elegido ? 'border-2 border-publico-tinta bg-publico-acento-tenue font-bold' : 'border-publico-linea-fuerte bg-publico-superficie hover:border-publico-tinta'} ${pasado ? 'text-publico-tinta-suave' : ''} ${focoClaro}`}><span>{valor === hoy ? 'Hoy' : dia.toLocaleDateString('es-PE', { weekday: 'short' })}</span><b className="text-base">{dia.getDate()}</b><span>{dia.toLocaleDateString('es-PE', { month: 'short' })}</span></button> })}
      </div>
      <details className="mt-2 text-sm"><summary className={`w-fit cursor-pointer rounded-lg px-1.5 py-1 font-bold underline decoration-publico-acento underline-offset-4 ${focoClaro}`}>Otra fecha</summary><label htmlFor="fecha-otro" className="mt-2 block text-xs font-bold">Elige otra fecha</label><input id="fecha-otro" type="date" min={hoy} value={fecha} onChange={(evento) => elegirFecha(evento.target.value)} aria-invalid={Boolean(errores.fecha)} aria-describedby={errores.fecha ? 'fecha-error' : undefined} className={`mt-1 min-h-12 rounded-lg border border-publico-linea-fuerte bg-publico-superficie px-3 ${focoClaro}`} /></details>
      <p id="fecha-error" role={errores.fecha ? 'alert' : undefined} className="min-h-5 text-xs text-publico-peligro">{errores.fecha}</p>
    </fieldset>
    <fieldset id="grupo-horas" tabIndex={-1} className={`mt-3 rounded-lg ${focoClaro}`}>
      <legend className="mb-2 text-sm font-bold text-publico-tinta-media">Elige una hora</legend>
      {(cargandoAgenda || (agenda !== null && agenda.fecha !== fecha)) ? <p role="status" className="text-sm text-publico-tinta-media">Consultando cupos…</p> : errorAgenda ? <p role="alert" className="text-sm text-publico-peligro">{errorAgenda}</p> : !agenda || agenda.franjas.length === 0 ? <p className="text-sm text-publico-tinta-media">Ese día no hay horarios disponibles. Prueba con otra fecha.</p> : <div role="group" aria-label="Franjas horarias" className="grid grid-cols-3 gap-2 min-[680px]:grid-cols-4">
        {agenda.franjas.map((franja, indice) => { const hora = franja.hora.substring(0, 5); const elegida = franja.disponible && horaSeleccionada === hora; return <button key={franja.hora} id={indice === 0 ? 'hora-primera' : undefined} type="button" aria-pressed={elegida} aria-disabled={!franja.disponible} aria-label={franja.disponible ? hora : `${hora}, ${franja.cuposLibres === 0 ? 'sin cupo' : 'no disponible'}`} onClick={() => { if (franja.disponible) setHoraSeleccionada(hora) }} className={`min-h-14 rounded-lg border px-2 text-sm font-bold ${elegida ? 'border-2 border-publico-tinta bg-publico-acento-tenue' : franja.disponible ? 'border-publico-linea-fuerte hover:border-publico-tinta' : 'cursor-not-allowed border-dashed border-publico-linea-fuerte bg-publico-superficie-suave text-publico-tinta-suave'} ${focoClaro}`}><span className="block">{hora}</span>{!franja.disponible && <span aria-hidden="true" className="block text-xs font-medium">{franja.cuposLibres === 0 ? 'Sin cupo' : 'No disponible'}</span>}</button> })}
      </div>}
      <p role={errores.hora ? 'alert' : undefined} className="min-h-5 text-xs text-publico-peligro">{errores.hora}</p>
    </fieldset>
    <p className="mt-2 rounded-r-lg border-l-[3px] border-publico-completada bg-publico-superficie-suave px-4 py-3 text-sm text-publico-tinta-media">Cupo garantizado: el taller no puede darle tu franja a otro.</p>
  </PasoNumerado>
}
