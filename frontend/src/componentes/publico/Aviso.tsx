import type { HTMLAttributes, ReactNode } from 'react'

interface AvisoProps extends HTMLAttributes<HTMLDivElement> {
  tipo?: 'info' | 'error' | 'exito'
  children: ReactNode
}

const estilos = {
  info: 'border-publico-acento-hondo bg-publico-acento-tenue text-publico-tinta',
  error: 'border-publico-peligro bg-publico-superficie text-publico-peligro',
  exito: 'border-publico-completada bg-publico-superficie text-publico-completada',
}

export function Aviso({ tipo = 'info', children, className = '', ...rest }: AvisoProps): ReactNode {
  return <div role={tipo === 'error' ? 'alert' : undefined} className={`rounded-r-lg border-l-4 px-4 py-3 text-sm ${estilos[tipo]} ${className}`} {...rest}>{children}</div>
}
