import type { ReactNode } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SesionProvider } from './sesion/SesionProvider.tsx'
import { MarcoPublico } from './componentes/marco/MarcoPublico.tsx'
import { MarcoPrivado } from './componentes/marco/MarcoPrivado.tsx'
import { RutaProtegida } from './rutas/RutaProtegida.tsx'
import { Entrar } from './paginas/Entrar.tsx'
import { Registro } from './paginas/Registro.tsx'
import { RecuperarClave } from './paginas/RecuperarClave.tsx'
import { RestablecerClave } from './paginas/RestablecerClave.tsx'
import { CuentaEliminada } from './paginas/CuentaEliminada.tsx'
import { CatalogoReserva } from './paginas/portal/CatalogoReserva.tsx'
import { Portada } from './paginas/portal/Portada.tsx'
import { MiCuenta } from './paginas/portal/MiCuenta.tsx'
import { PortalCliente } from './paginas/portal/PortalCliente.tsx'
import { PanelRutas } from './paginas/panel/PanelRutas.tsx'
import { PaginaVisita } from './paginas/visita/PaginaVisita.tsx'

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
  return (
    <>
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-accion focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-superficie focus:outline-none focus:ring-2 focus:ring-accion focus:ring-offset-2 focus:ring-offset-lienzo"
      >
        Saltar al contenido
      </a>

      <Routes>
        <Route element={<MarcoPublico cabeceraSobreHeroe />}>
          <Route path="/" element={<Portada />} />
        </Route>
        <Route element={<MarcoPublico />}>
          <Route path="/reservar" element={<CatalogoReserva />} />
          <Route path="/entrar" element={<Entrar />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="/recuperar-clave" element={<RecuperarClave />} />
          <Route path="/restablecer-clave/:token" element={<RestablecerClave />} />
          <Route path="/cuenta-eliminada" element={<CuentaEliminada />} />
          <Route
            path="/mi-cuenta"
            element={
              <RutaProtegida rol="CLIENTE">
                <MiCuenta />
              </RutaProtegida>
            }
          />
          <Route
            path="/mis-ordenes/*"
            element={
              <RutaProtegida rol="CLIENTE">
                <PortalCliente />
              </RutaProtegida>
            }
          />
        </Route>
        {/* El técnico entra desde su correo, sin cuenta: la llave es el token. */}
        <Route path="/visita/:token" element={<PaginaVisita />} />
        <Route
          path="/panel/*"
          element={
            <RutaProtegida rol="ADMIN_MYPE">
              <PanelRutas />
            </RutaProtegida>
          }
        />
        <Route element={<MarcoPrivado />}>
          <Route path="*" element={<PaginaNoEncontrada />} />
        </Route>
      </Routes>
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
