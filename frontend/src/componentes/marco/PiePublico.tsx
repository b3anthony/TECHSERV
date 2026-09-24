import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useSesion } from '../../sesion/SesionProvider.tsx'
import { focoClaro } from './foco.ts'

const contenedor = 'mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8'

export function PiePublico(): ReactNode {
  const { usuario } = useSesion()

  return (
      <footer className="border-t border-publico-linea bg-publico-superficie">
        <div className={`${contenedor} flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-5 text-sm/[1.55] text-publico-tinta-suave`}>
          <span><b className="text-publico-tinta">TechServ</b> · Servicio técnico a domicilio · Trujillo, La Libertad</span>
          <nav aria-label="Pie" className="flex gap-1">
            {(usuario?.rol === 'CLIENTE' || !usuario) && <Link to="/mis-ordenes" className={`inline-flex min-h-11 items-center rounded-lg px-2 text-publico-tinta-media hover:underline ${focoClaro}`}>Mis órdenes</Link>}
            {usuario?.rol === 'ADMIN_MYPE' && <Link to="/panel" className={`inline-flex min-h-11 items-center rounded-lg px-2 text-publico-tinta-media hover:underline ${focoClaro}`}>Mi panel</Link>}
            {!usuario && <Link to="/entrar" className={`inline-flex min-h-11 items-center rounded-lg px-2 text-publico-tinta-media hover:underline ${focoClaro}`}>Acceso talleres</Link>}
          </nav>
        </div>
      </footer>
  )
}
