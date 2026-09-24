import type { HTMLAttributes, ReactNode } from 'react'

interface TarjetaProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode
}

export function Tarjeta({ children, className = '', ...rest }: TarjetaProps): ReactNode {
  return <section className={`rounded-2xl border border-publico-linea bg-publico-superficie p-4 shadow-lg shadow-publico-tinta/10 sm:p-6 ${className}`} {...rest}>{children}</section>
}
