import type { JSX } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Bandeja } from './Bandeja.tsx'
import { DetalleOrden } from './DetalleOrden.tsx'

export function PanelRutas(): JSX.Element {
  return (
    <Routes>
      <Route index element={<Bandeja />} />
      <Route path="ordenes/:id" element={<DetalleOrden />} />
    </Routes>
  )
}
