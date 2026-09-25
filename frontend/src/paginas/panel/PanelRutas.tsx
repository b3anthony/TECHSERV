import type { JSX } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Ajustes } from './Ajustes.tsx'
import { Bandeja } from './Bandeja.tsx'
import { DetalleOrden } from './DetalleOrden.tsx'
import { Equipo } from './Equipo.tsx'
import { Inicio } from './Inicio.tsx'
import { MarcoPanel } from './MarcoPanel.tsx'
import { Precios } from './Precios.tsx'
import { Reportes } from './Reportes.tsx'

export function PanelRutas(): JSX.Element {
  return (
    <Routes>
      <Route element={<MarcoPanel />}>
        <Route index element={<Inicio />} />
        <Route path="ordenes" element={<Bandeja />} />
        <Route path="ordenes/:id" element={<DetalleOrden />} />
        <Route path="equipo" element={<Equipo />} />
        <Route path="precios" element={<Precios />} />
        <Route path="reportes" element={<Reportes />} />
        <Route path="ajustes" element={<Ajustes />} />
      </Route>
    </Routes>
  )
}
