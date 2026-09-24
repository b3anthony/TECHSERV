import type { ReactNode } from 'react'
import { Outlet } from 'react-router-dom'
import { SpriteIconos } from '../Icono.tsx'
import { CabeceraPublica } from './CabeceraPublica.tsx'
import { PiePublico } from './PiePublico.tsx'

export function MarcoPublico({ cabeceraSobreHeroe = false }: { cabeceraSobreHeroe?: boolean }): ReactNode {
  return (
    <div className="flex min-h-screen flex-col bg-publico-lienzo font-publico text-publico-tinta">
      <SpriteIconos />
      <CabeceraPublica sobreHeroe={cabeceraSobreHeroe} />
      <main id="contenido" className="flex-1"><Outlet /></main>
      <PiePublico />
    </div>
  )
}
