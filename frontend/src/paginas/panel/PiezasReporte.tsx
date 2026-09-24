import type { ReactNode } from 'react'
import { Icono } from '../../componentes/Icono.tsx'
import { soles } from './formato.ts'
import type { TecnicoRanking } from './tiposPanel.ts'

export function Estrellas({ valor }: { valor: number }): ReactNode {
  const llenas = Math.round(valor)
  return (
    <span className="flex gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => (
        <Icono key={n} nombre="estrella" className={`size-4 ${n <= llenas ? 'text-publico-acento-hondo' : 'text-publico-linea-fuerte'}`} />
      ))}
    </span>
  )
}

export function Ranking({ ranking }: { ranking: TecnicoRanking[] }): ReactNode {
  const maximo = Math.max(1, ...ranking.map((r) => Number(r.ingresoGenerado)))
  return (
    <ol className="grid gap-3">
      {ranking.map((r, i) => (
        <li key={r.tecnicoId} className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 sm:grid-cols-[2rem_12rem_minmax(0,1fr)_auto]">
          <span className={`grid size-8 place-items-center rounded-lg text-sm font-bold ${i === 0 ? 'bg-publico-acento text-publico-tinta' : 'bg-publico-superficie-suave text-publico-tinta-media'}`}>{i + 1}</span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold">{r.nombreCompleto}</span>
            <span className="block text-xs text-publico-tinta-suave">{r.ordenesCompletadas} {r.ordenesCompletadas === 1 ? 'servicio' : 'servicios'}</span>
          </span>
          <span aria-hidden="true" className="col-span-3 row-start-2 h-2.5 overflow-hidden rounded-2xl bg-publico-superficie-suave sm:col-span-1 sm:col-start-3 sm:row-start-1">
            <span style={{ width: `${Math.max(2, (Number(r.ingresoGenerado) / maximo) * 100)}%` }} className={`block h-full origin-left rounded-2xl motion-safe:animate-[panel-crecer-x_0.7s_ease-out] ${i === 0 ? 'bg-publico-acento-hondo' : 'bg-publico-panel/70'}`} />
          </span>
          <span className="col-start-3 row-start-1 text-right text-sm font-bold tabular-nums sm:col-start-4">{soles(r.ingresoGenerado)}</span>
        </li>
      ))}
    </ol>
  )
}
