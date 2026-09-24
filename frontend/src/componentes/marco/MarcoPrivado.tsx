import type { ReactNode } from 'react'
import { Outlet } from 'react-router-dom'
import { CabeceraPrivada } from './CabeceraPrivada.tsx'

export function MarcoPrivado(): ReactNode {
  return (
    <>
      <CabeceraPrivada />
      <div id="contenido" className="w-full min-w-0"><Outlet /></div>
    </>
  )
}
