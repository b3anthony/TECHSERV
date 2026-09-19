import type { ReactNode } from 'react'

export function Vacio({ titulo, detalle }: { titulo: string; detalle: string }): ReactNode {
  return (
    <div className="px-4 py-16 text-center">
      <p className="text-base font-semibold text-tinta">{titulo}</p>
      <p className="mt-1 text-sm text-tinta-suave">{detalle}</p>
    </div>
  )
}
