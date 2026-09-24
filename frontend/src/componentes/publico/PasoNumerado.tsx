import type { ReactNode } from 'react'
import { Tarjeta } from './Tarjeta.tsx'

interface PasoNumeradoProps {
  id?: string
  numero: number
  titulo: string
  bajada?: string
  completo?: boolean
  children?: ReactNode
  className?: string
}

export function PasoNumerado({ id, numero, titulo, bajada, completo = false, children, className = '' }: PasoNumeradoProps): ReactNode {
  const tituloId = id ? `${id}-titulo` : undefined
  return <Tarjeta id={id} aria-labelledby={tituloId} className={className}>
    <div className="mb-5 flex items-start gap-3.5">
      <span aria-label={`Paso ${numero}${completo ? ', completo' : ''}`} className={`grid size-10 shrink-0 place-items-center rounded-lg text-sm font-bold ${completo ? 'bg-publico-completada text-publico-superficie' : 'bg-publico-panel text-publico-superficie'}`}>
        {numero}
      </span>
      <div><h2 id={tituloId} className="text-[clamp(1.25rem,1rem+0.8vw,1.5rem)] leading-[1.25] font-bold tracking-[-0.02em] text-publico-tinta">{titulo}</h2>{bajada && <p className="mt-[0.2rem] text-sm/[1.55] text-publico-tinta-suave">{bajada}</p>}</div>
    </div>
    {children}
  </Tarjeta>
}
