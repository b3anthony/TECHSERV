import type { ReactNode } from 'react'

export function Cargando(): ReactNode {
  return (
    <div role="status" className="flex items-center justify-center px-4 py-16">
      <p className="text-sm text-tinta-suave">Cargando…</p>
    </div>
  )
}
