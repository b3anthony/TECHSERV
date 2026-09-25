import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icono } from '../Icono.tsx'
import { useSesion } from '../../sesion/SesionProvider.tsx'
import { focoOscuro } from './foco.ts'

const contenedor = 'mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8'

export function CabeceraPublica({ sobreHeroe = false }: { sobreHeroe?: boolean }): ReactNode {
  const { usuario, salir } = useSesion()

  return (
      <header className={`${sobreHeroe ? 'absolute inset-x-0 top-0 bg-publico-panel/90 backdrop-blur-sm' : 'relative bg-publico-panel'} z-30 border-b border-publico-superficie/15 text-publico-superficie`}>
        <div className={`${contenedor} flex min-h-16 items-center justify-between gap-4`}>
          <div className="flex min-w-0 items-center gap-4">
            <Link to="/" aria-label="TechServ, inicio" className={`inline-flex min-h-11 items-center gap-2 rounded-lg text-lg font-bold tracking-[-0.01em] ${focoOscuro}`}>
              <svg className="size-7 shrink-0 text-publico-superficie" viewBox="0 0 28 28" aria-hidden="true"><rect width="28" height="28" rx="7" fill="currentColor"/><path d="M9 10.5h10M14 10.5v9" className="stroke-publico-acento-hondo" strokeWidth="2.6" strokeLinecap="round"/></svg>
              TechServ
            </Link>
            <span className="hidden items-center gap-1.5 border-l border-publico-superficie/30 pl-4 text-sm/[1.55] text-publico-acento-tenue min-[481px]:inline-flex">
              <Icono nombre="pin" className="size-4" /> Trujillo, La Libertad
            </span>
          </div>
          <nav aria-label="Cuentas" className="flex shrink-0 items-center gap-1 text-sm/[1.55]">
            {usuario ? (
              <>
                <span className="hidden max-w-40 truncate px-2 text-publico-acento-tenue sm:inline" title={usuario.nombreCompleto}>{usuario.nombreCompleto}</span>
                {usuario.rol === 'CLIENTE' && <Link to="/mis-ordenes" className={`inline-flex min-h-11 items-center rounded-lg px-2 text-publico-acento-tenue hover:bg-publico-superficie/10 hover:text-publico-superficie sm:px-3 ${focoOscuro}`}>Mis órdenes</Link>}
                {usuario.rol === 'CLIENTE' && <Link to="/mi-cuenta" aria-label="Mi cuenta" className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-publico-acento-tenue hover:bg-publico-superficie/10 hover:text-publico-superficie sm:px-3 ${focoOscuro}`}><Icono nombre="engranaje" className="size-4" /><span className="hidden min-[400px]:inline">Mi cuenta</span></Link>}
                {usuario.rol === 'ADMIN_MYPE' && <Link to="/panel" className={`inline-flex min-h-11 items-center rounded-lg px-2 text-publico-acento-tenue hover:bg-publico-superficie/10 hover:text-publico-superficie sm:px-3 ${focoOscuro}`}>Mi panel</Link>}
                <button type="button" onClick={salir} className={`min-h-11 rounded-lg border border-publico-acento px-2 font-medium text-publico-acento hover:bg-publico-superficie/10 sm:px-3 ${focoOscuro}`}>Salir</button>
              </>
            ) : (
              <>
                <Link to="/mis-ordenes" className={`inline-flex min-h-11 items-center rounded-lg px-2 text-publico-acento-tenue hover:bg-publico-superficie/10 hover:text-publico-superficie sm:px-3 ${focoOscuro}`}>Mis órdenes</Link>
                <Link to="/entrar" className={`inline-flex min-h-11 items-center rounded-lg border border-publico-acento px-2 font-medium text-publico-acento hover:bg-publico-superficie/10 sm:px-3 ${focoOscuro}`}>Acceso talleres</Link>
              </>
            )}
          </nav>
        </div>
      </header>
  )
}
