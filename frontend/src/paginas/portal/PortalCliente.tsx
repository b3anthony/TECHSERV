import type { ReactNode } from 'react'
import { Route, Routes } from 'react-router-dom'
import { MisOrdenes } from './MisOrdenes.tsx'
import { SeguimientoOrden } from './SeguimientoOrden.tsx'

export function PortalCliente(): ReactNode {
  return (
    <Routes>
      <Route index element={<MisOrdenes />} />
      <Route path=":id" element={<SeguimientoOrden />} />
    </Routes>
  )
}
