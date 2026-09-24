import type { ReactNode } from 'react'
import { Icono } from '../../../componentes/Icono.tsx'
import type { EstadoOrden } from '../../../tipos.ts'
import { ETAPAS, etapaDe } from './etapas.ts'

/** Texto para lectores de pantalla: "Etapa 3 de 5: En camino". */
function resumenEtapa(actual: number): string {
  return `Etapa ${actual + 1} de ${ETAPAS.length}: ${ETAPAS[actual].titulo}`
}

/** Las 5 etapas en grande, sobre el panel oscuro del seguimiento. */
export function BarraEtapas({ estado }: { estado: EstadoOrden }): ReactNode {
  const actual = etapaDe(estado)
  const terminado = actual === ETAPAS.length - 1
  return (
    <ol aria-label={resumenEtapa(actual)} className="grid grid-cols-5">
      {ETAPAS.map((etapa, i) => {
        const hecha = i < actual || (terminado && i === actual)
        const enCurso = i === actual && !terminado
        return (
          <li key={etapa.titulo} aria-current={i === actual ? 'step' : undefined} className="relative flex flex-col items-center text-center">
            {i > 0 && (
              <span aria-hidden="true" className={`absolute top-[1.1875rem] right-1/2 left-[-50%] h-0.5 sm:top-[1.4375rem] ${i <= actual ? 'bg-publico-acento' : 'bg-publico-superficie/20'}`} />
            )}
            <span
              aria-hidden="true"
              className={`relative z-10 grid size-10 place-items-center rounded-2xl sm:size-12 ${
                hecha
                  ? 'bg-publico-acento text-publico-tinta'
                  : enCurso
                    ? 'bg-publico-panel text-publico-acento ring-2 ring-publico-acento ring-offset-4 ring-offset-publico-panel'
                    : 'border border-publico-superficie/25 bg-publico-panel text-publico-superficie/45'
              }`}
            >
              {enCurso && <span className="absolute inset-0 rounded-2xl bg-publico-acento/25 motion-safe:animate-ping" />}
              <Icono nombre={hecha ? 'visto' : etapa.icono} className="relative size-5 sm:size-6" />
            </span>
            <span className={`mt-2.5 px-0.5 text-xs leading-tight sm:text-sm ${i === actual ? 'font-bold text-publico-superficie' : hecha ? 'text-publico-acento-tenue' : 'text-publico-superficie/60'}`}>
              {etapa.titulo}
            </span>
            <span className="sr-only">{hecha ? ', hecha' : enCurso ? ', ahora' : ', pendiente'}</span>
          </li>
        )
      })}
    </ol>
  )
}

/** Versión mínima para la lista: 5 rayitas y el nombre de la etapa. */
export function BarraEtapasMini({ estado }: { estado: EstadoOrden }): ReactNode {
  const actual = etapaDe(estado)
  // Cancelada o terminada: la etiqueta ya lo dice todo; la barra llena solo sería ruido.
  if (actual < 0 || actual === ETAPAS.length - 1) return null
  return (
    <div className="flex items-center gap-1" role="img" aria-label={resumenEtapa(actual)}>
      {ETAPAS.map((etapa, i) => (
        <span key={etapa.titulo} className={`h-1.5 flex-1 rounded-2xl ${i <= actual ? 'bg-publico-acento-hondo' : 'bg-publico-linea'}`} />
      ))}
    </div>
  )
}
