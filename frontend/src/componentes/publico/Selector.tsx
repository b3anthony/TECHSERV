import type { ReactNode, SelectHTMLAttributes } from 'react'
import { focoClaro } from '../marco/foco.ts'

interface SelectorProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  id: string
  etiqueta: string
  ayuda?: string
  error?: string
  children: ReactNode
}

export function Selector({ id, etiqueta, ayuda, error, children, className = '', ...rest }: SelectorProps): ReactNode {
  const ayudaId = `${id}-ayuda`
  const errorId = `${id}-error`
  return (
    <div className={`grid gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-bold text-publico-tinta">{etiqueta}</label>
      <div className="relative">
        <select id={id} aria-invalid={error ? true : undefined}
          aria-describedby={[ayuda && ayudaId, errorId].filter(Boolean).join(' ')}
          className={`min-h-13 w-full appearance-none rounded-lg border bg-publico-superficie py-2.5 pr-10 pl-3.5 text-base text-publico-tinta hover:border-publico-tinta-suave ${error ? 'border-publico-peligro' : 'border-publico-linea-fuerte'} ${focoClaro}`}
          {...rest}>{children}</select>
        <svg className="pointer-events-none absolute top-1/2 right-4 h-1.5 w-2.5 -translate-y-1/2 text-publico-tinta-suave" viewBox="0 0 10 6" aria-hidden="true" focusable="false"><path d="M0 0h10L5 6z" fill="currentColor" /></svg>
      </div>
      {ayuda && <p id={ayudaId} className="text-xs text-publico-tinta-suave">{ayuda}</p>}
      <p id={errorId} role="alert" className="min-h-5 text-xs font-bold text-publico-peligro">{error ?? ''}</p>
    </div>
  )
}
