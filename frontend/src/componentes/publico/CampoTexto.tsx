import type { InputHTMLAttributes, ReactNode } from 'react'
import { focoClaro } from '../marco/foco.ts'

type TipoCampo = 'text' | 'email' | 'password' | 'tel' | 'number'

interface CampoTextoProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'id'> {
  id: string
  etiqueta: string
  tipo?: TipoCampo
  type?: TipoCampo
  ayuda?: string
  error?: string
}

export function CampoTexto({ id, etiqueta, tipo, type, ayuda, error, className = '', ...rest }: CampoTextoProps): ReactNode {
  const ayudaId = `${id}-ayuda`
  const errorId = `${id}-error`
  return (
    <div className={`grid gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-bold text-publico-tinta">{etiqueta}</label>
      <input id={id} type={tipo ?? type ?? 'text'} aria-invalid={error ? true : undefined}
        aria-describedby={[ayuda && ayudaId, errorId].filter(Boolean).join(' ')}
        className={`min-h-13 w-full rounded-lg border bg-publico-superficie px-3.5 py-2.5 text-base text-publico-tinta placeholder:text-publico-tinta-suave hover:border-publico-tinta-suave ${error ? 'border-publico-peligro' : 'border-publico-linea-fuerte'} ${focoClaro}`}
        {...rest} />
      {ayuda && <p id={ayudaId} className="text-xs text-publico-tinta-suave">{ayuda}</p>}
      <p id={errorId} role="alert" className="min-h-5 text-xs font-bold text-publico-peligro">{error ?? ''}</p>
    </div>
  )
}
