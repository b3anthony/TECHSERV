import type { ReactNode } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SesionProvider, useSesion } from './sesion/SesionProvider.tsx'
import { RutaProtegida } from './rutas/RutaProtegida.tsx'
import { Entrar } from './paginas/Entrar.tsx'
import { Registro } from './paginas/Registro.tsx'
import { CatalogoReserva } from './paginas/portal/CatalogoReserva.tsx'
import { PortalCliente } from './paginas/portal/PortalCliente.tsx'
import { PanelRutas } from './paginas/panel/PanelRutas.tsx'

const queryClient = new QueryClient()

export default function App(): ReactNode {
  return (
    <SesionProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppLayout />
        </BrowserRouter>
      </QueryClientProvider>
    </SesionProvider>
  )
}

function AppLayout(): ReactNode {
  const { usuario, salir } = useSesion()

  return (
    <>
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-accion focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-superficie focus:outline-none focus:ring-2 focus:ring-accion focus:ring-offset-2 focus:ring-offset-lienzo"
      >
        Saltar al contenido
      </a>

      <header className="border-b border-linea bg-superficie">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <a
            href="/"
            className="text-lg font-bold text-tinta focus:outline-none focus:ring-2 focus:ring-accion focus:ring-offset-2 focus:ring-offset-superficie"
          >
            TechServ
          </a>

          <div className="flex items-center gap-4 text-sm">
            {usuario ? (
              <>
                <span className="text-tinta-media">{usuario.nombreCompleto}</span>
                <button
                  type="button"
                  onClick={salir}
                  className="font-semibold text-tinta-suave hover:text-tinta focus:outline-none focus:ring-2 focus:ring-accion focus:ring-offset-2 focus:ring-offset-superficie"
                >
                  Salir
                </button>
              </>
            ) : (
              <a
                href="/entrar"
                className="font-semibold text-accion hover:text-accion-honda focus:outline-none focus:ring-2 focus:ring-accion focus:ring-offset-2 focus:ring-offset-superficie"
              >
                Iniciar sesión
              </a>
            )}
          </div>
        </div>
      </header>

      <div id="contenido">
        <Routes>
          <Route path="/" element={<CatalogoReserva />} />
          <Route path="/entrar" element={<Entrar />} />
          <Route path="/registro" element={<Registro />} />
          <Route
            path="/mis-ordenes/*"
            element={
              <RutaProtegida rol="CLIENTE">
                <PortalCliente />
              </RutaProtegida>
            }
          />
          <Route
            path="/panel/*"
            element={
              <RutaProtegida rol="ADMIN_MYPE">
                <PanelRutas />
              </RutaProtegida>
            }
          />
          <Route path="*" element={<PaginaNoEncontrada />} />
        </Routes>
      </div>
    </>
  )
}

/* ─── Marcadores de posición ─── */




function PaginaNoEncontrada(): ReactNode {
  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-xl font-bold text-tinta">Esta página no existe</h1>
      <p className="mt-2 text-sm text-tinta-suave">
        La dirección que buscas no corresponde a ninguna sección.
      </p>
      <a
        href="/"
        className="mt-4 inline-block text-sm font-semibold text-accion underline focus:outline-none focus:ring-2 focus:ring-accion focus:ring-offset-2 focus:ring-offset-lienzo"
      >
        Ir al inicio
      </a>
    </main>
  )
}
