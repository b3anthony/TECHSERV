import type { ButtonHTMLAttributes, ReactNode } from 'react'

const estilosVariante: Record<string, string> = {
  principal:
    'bg-accion text-superficie font-semibold hover:bg-accion-honda focus:outline-none focus:ring-2 focus:ring-accion focus:ring-offset-2 focus:ring-offset-lienzo',
  secundario:
    'border border-linea bg-superficie text-tinta font-semibold hover:bg-superficie-suave focus:outline-none focus:ring-2 focus:ring-accion focus:ring-offset-2 focus:ring-offset-lienzo',
  peligro:
    'bg-peligro text-superficie font-semibold hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-peligro focus:ring-offset-2 focus:ring-offset-lienzo',
  texto:
    'bg-transparent text-accion font-semibold hover:text-accion-honda underline focus:outline-none focus:ring-2 focus:ring-accion focus:ring-offset-2 focus:ring-offset-lienzo',
}

interface BotonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: 'principal' | 'secundario' | 'peligro' | 'texto'
  cargando?: boolean
  children: ReactNode
}

export function Boton({
  variante = 'principal',
  cargando = false,
  children,
  className = '',
  disabled,
  ...rest
}: BotonProps): ReactNode {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm transition-colors motion-reduce:transition-none ${estilosVariante[variante]} ${className} ${cargando || disabled ? 'pointer-events-none opacity-60' : ''}`}
      disabled={cargando || disabled}
      aria-busy={cargando}
      {...rest}
    >
      {cargando && (
        <span className="inline-block h-4 w-4 animate-spin rounded-2xl border-2 border-current border-t-transparent motion-reduce:animate-none" aria-hidden="true" />
      )}
      {children}
    </button>
  )
}
