import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { focoAmarillo, focoClaro } from '../marco/foco.ts'

interface BotonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: 'principal' | 'secundario' | 'claro' | 'peligro'
  cargando?: boolean
  children: ReactNode
}

const variantes = {
  principal: `border border-publico-acento bg-publico-acento text-publico-tinta hover:bg-publico-acento-hondo ${focoAmarillo}`,
  secundario: `border border-publico-linea-fuerte bg-publico-superficie text-publico-tinta hover:bg-publico-superficie-suave ${focoClaro}`,
  claro: `border border-publico-superficie bg-publico-superficie text-publico-tinta hover:bg-publico-acento-tenue ${focoClaro}`,
  peligro: `border border-publico-peligro bg-publico-superficie text-publico-peligro hover:bg-publico-superficie-suave ${focoClaro}`,
}

export function Boton({ variante = 'principal', cargando = false, disabled, className = '', children, ...rest }: BotonProps): ReactNode {
  return <button disabled={disabled || cargando} aria-busy={cargando || undefined}
    className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold motion-safe:transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${variantes[variante]} ${className}`}
    {...rest}>
    {cargando && <span aria-hidden="true" className="size-4 animate-spin rounded-2xl border-2 border-current border-t-transparent motion-reduce:animate-none" />}
    {children}
  </button>
}
