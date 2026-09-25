import type { ReactNode } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { SpriteIconos } from '../Icono.tsx'
import { Aviso } from '../publico/Aviso.tsx'
import { CabeceraPublica } from './CabeceraPublica.tsx'
import { PiePublico } from './PiePublico.tsx'

export function MarcoPublico({ cabeceraSobreHeroe = false }: { cabeceraSobreHeroe?: boolean }): ReactNode {
  return (
    <div className="flex min-h-screen flex-col bg-publico-lienzo font-publico text-publico-tinta">
      <SpriteIconos />
      <CabeceraPublica sobreHeroe={cabeceraSobreHeroe} />
      <main id="contenido" className="flex-1"><AvisoDeRuta /><Outlet /></main>
      <PiePublico />
    </div>
  )
}

/**
 * Un mensaje que trae la navegación (`state.aviso`): «reactivamos tu cuenta»,
 * «tu cuenta quedó desactivada». Se muestra arriba de la página a la que se
 * llega, sea cual sea.
 */
function AvisoDeRuta(): ReactNode {
  const location = useLocation()
  const aviso = (location.state as { aviso?: string } | null)?.aviso
  if (!aviso) return null
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-4 sm:px-6 lg:px-8">
      <Aviso tipo="exito" role="status">{aviso}</Aviso>
    </div>
  )
}
