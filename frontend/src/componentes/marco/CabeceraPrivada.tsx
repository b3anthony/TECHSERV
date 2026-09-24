import type { ReactNode } from 'react'
import { useSesion } from '../../sesion/SesionProvider.tsx'

export function CabeceraPrivada(): ReactNode {
  const { usuario, salir } = useSesion()

  return (
    <header className="border-b border-linea bg-superficie">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-2">
        <a
          href="/"
          className="inline-flex min-h-[44px] items-center text-lg font-bold text-tinta focus:outline-none focus:ring-2 focus:ring-accion focus:ring-offset-2 focus:ring-offset-superficie rounded-md"
        >
          TechServ
        </a>

        <div className="flex items-center gap-2 sm:gap-4 text-sm">
          {usuario ? (
            <>
              <span className="text-tinta-media truncate max-w-[120px] sm:max-w-xs">
                {usuario.nombreCompleto}
              </span>
              <button
                type="button"
                onClick={salir}
                className="inline-flex min-h-[44px] items-center rounded-lg px-2.5 py-1.5 font-semibold text-tinta-suave hover:text-tinta hover:bg-superficie-suave focus:outline-none focus:ring-2 focus:ring-accion focus:ring-offset-2 focus:ring-offset-superficie"
              >
                Salir
              </button>
            </>
          ) : (
            <a
              href="/entrar"
              className="inline-flex min-h-[44px] items-center rounded-lg px-3 py-2 font-semibold text-accion hover:text-accion-honda hover:bg-superficie-suave focus:outline-none focus:ring-2 focus:ring-accion focus:ring-offset-2 focus:ring-offset-superficie"
            >
              Iniciar sesión
            </a>
          )}
        </div>
      </div>
    </header>
  )
}
