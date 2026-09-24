import type { ReactNode } from 'react'
import { solesRedondo } from './formato.ts'
import type { PuntoSerie } from './datos.ts'

const compacto = new Intl.NumberFormat('es-PE', { notation: 'compact', maximumFractionDigits: 1 })

interface GraficoBarrasProps {
  serie: PuntoSerie[]
  tono?: 'claro' | 'oscuro'
  /** Alto de la zona de barras (clase de Tailwind). */
  alto?: string
  etiqueta: string
}

/**
 * Barras de ingresos por tramo. Cada barra lleva su cifra escrita: el gráfico
 * se entiende sin pasar el ratón por encima y un lector de pantalla lo lee
 * como una lista.
 */
export function GraficoBarras({ serie, tono = 'claro', alto = 'h-44', etiqueta }: GraficoBarrasProps): ReactNode {
  const maximo = Math.max(1, ...serie.map((p) => p.ingresos))
  const apretado = serie.length > 8
  const oscuro = tono === 'oscuro'

  return (
    <ol aria-label={etiqueta} className={`flex items-stretch gap-1.5 sm:gap-2.5 ${alto}`}>
      {serie.map((p, i) => {
        const ultimo = i === serie.length - 1
        const alto = Math.max(2, Math.round((p.ingresos / maximo) * 100))
        const cifra = apretado ? `S/ ${compacto.format(p.ingresos)}` : solesRedondo(p.ingresos)
        return (
          <li key={p.desde} className="flex min-w-0 flex-1 flex-col items-center">
            <span className="sr-only">{p.nombre}{p.enCurso ? ' (en curso)' : ''}: {solesRedondo(p.ingresos)}</span>
            <div aria-hidden="true" className="flex w-full flex-1 flex-col items-center justify-end">
              <span className={`mb-1 text-xs font-bold whitespace-nowrap tabular-nums ${oscuro ? (ultimo ? 'text-publico-acento' : 'text-publico-superficie/70') : ultimo ? 'text-publico-tinta' : 'text-publico-tinta-suave'} ${apretado ? 'max-sm:hidden' : ''}`}>
                {cifra}
              </span>
              <span
                style={{ height: `${alto}%` }}
                className={`w-full max-w-14 origin-bottom rounded-t-lg motion-safe:animate-[panel-crecer_0.7s_ease-out] ${
                  ultimo
                    ? 'bg-publico-acento'
                    : oscuro
                      ? 'bg-publico-superficie/25'
                      : 'bg-publico-panel/80'
                } ${p.enCurso && !ultimo ? 'opacity-70' : ''}`}
              />
            </div>
            <span aria-hidden="true" className={`mt-2 w-full truncate text-center text-xs ${oscuro ? 'text-publico-superficie/60' : 'text-publico-tinta-suave'} ${ultimo ? 'font-bold' : ''}`}>
              {p.etiqueta}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
