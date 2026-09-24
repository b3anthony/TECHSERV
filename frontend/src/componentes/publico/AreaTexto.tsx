import type { ReactNode, TextareaHTMLAttributes } from 'react'
import { focoClaro } from '../marco/foco.ts'

interface AreaTextoProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> {
  id: string
  etiqueta: string
  ayuda?: string
  error?: string
  max?: number
}

export function AreaTexto({ id, etiqueta, ayuda, error, max, value, className = '', ...rest }: AreaTextoProps): ReactNode {
  const ayudaId = `${id}-ayuda`
  const errorId = `${id}-error`
  const contadorId = `${id}-contador`
  return (
    <div className={`grid gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-bold text-publico-tinta">{etiqueta}</label>
      <textarea id={id} value={value} maxLength={max} aria-invalid={error ? true : undefined}
        aria-describedby={[ayuda && ayudaId, max && contadorId, errorId].filter(Boolean).join(' ')}
        className={`min-h-28 w-full rounded-lg border bg-publico-superficie px-3.5 py-2.5 text-base text-publico-tinta placeholder:text-publico-tinta-suave hover:border-publico-tinta-suave ${error ? 'border-publico-peligro' : 'border-publico-linea-fuerte'} ${focoClaro}`}
        {...rest} />
      {(ayuda || max) && <div className="flex justify-between gap-2 text-xs text-publico-tinta-suave">{ayuda && <p id={ayudaId}>{ayuda}</p>}{max && <span id={contadorId} className="ml-auto tabular-nums">{String(value ?? '').length}/{max}</span>}</div>}
      <p id={errorId} role="alert" className="min-h-5 text-xs font-bold text-publico-peligro">{error ?? ''}</p>
    </div>
  )
}
