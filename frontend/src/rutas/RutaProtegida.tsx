import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import type { Rol } from '../tipos.ts'
import { useSesion } from '../sesion/SesionProvider.tsx'
import { Cargando } from '../componentes/Cargando.tsx'

export function RutaProtegida(props: { rol: Rol; children: ReactNode }): ReactNode {
  const { usuario, cargando } = useSesion()
  const location = useLocation()

  if (cargando) {
    return <Cargando />
  }

  if (!usuario) {
    return <Navigate to="/entrar" state={{ desde: location.pathname }} replace />
  }

  if (usuario.rol !== props.rol) {
    const destino = usuario.rol === 'ADMIN_MYPE' ? '/panel' : '/mis-ordenes'
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-tinta">No tienes acceso a esta sección</h1>
        <p className="mt-2 text-sm text-tinta-suave">
          Tu cuenta no tiene permisos para ver esta página.
        </p>
        <a
          href={destino}
          className="mt-4 inline-block text-sm font-semibold text-accion underline focus:outline-none focus:ring-2 focus:ring-accion focus:ring-offset-2 focus:ring-offset-lienzo"
        >
          Ir a mi zona
        </a>
      </main>
    )
  }

  return <>{props.children}</>
}
