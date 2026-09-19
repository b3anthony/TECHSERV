import { useId } from 'react'
import type { ReactNode, TextareaHTMLAttributes } from 'react'

interface AreaTextoProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  etiqueta: string
  error?: string
}

export function AreaTexto({ etiqueta, error, className = '', id: idProp, ...rest }: AreaTextoProps): ReactNode {
  const idGenerado = useId()
  const id = idProp ?? idGenerado
  const idError = `${id}-error`

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-tinta">
        {etiqueta}
      </label>
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? idError : undefined}
        className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm text-tinta bg-superficie placeholder:text-tinta-suave focus:outline-none focus:ring-2 focus:ring-accion focus:ring-offset-2 focus:ring-offset-lienzo ${error ? 'border-peligro' : 'border-linea'}`}
        {...rest}
      />
      {error && (
        <p id={idError} role="alert" className="mt-1 text-xs text-peligro">
          {error}
        </p>
      )}
    </div>
  )
}
