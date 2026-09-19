import type { ReactNode } from 'react'
import { Boton } from './Boton.tsx'

interface AvisoErrorProps {
  mensaje: string
  reintentar?: () => void
}

export function AvisoError({ mensaje, reintentar }: AvisoErrorProps): ReactNode {
  return (
    <div role="alert" className="rounded-lg border border-peligro bg-superficie p-4">
      <p className="text-sm text-peligro">{mensaje}</p>
      {reintentar && (
        <Boton variante="secundario" onClick={reintentar} className="mt-3">
          Reintentar
        </Boton>
      )}
    </div>
  )
}
