import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { focoAmarillo, focoClaro } from '../componentes/marco/foco.ts'
import { TarjetaAcceso } from '../componentes/publico/TarjetaAcceso.tsx'

export type ConfirmacionCuentaEliminada =
  | { tipo: 'cliente'; email: string; reactivableHasta: string }
  | { tipo: 'administrador'; email: string }

const FECHA_LARGA = new Intl.DateTimeFormat('es-PE', {
  day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Lima',
})

function leerConfirmacion(estado: unknown): ConfirmacionCuentaEliminada | null {
  if (!estado || typeof estado !== 'object' || !('email' in estado) || typeof estado.email !== 'string' || !('tipo' in estado)) return null
  if (estado.tipo === 'administrador') return { tipo: 'administrador', email: estado.email }
  if (estado.tipo === 'cliente' && 'reactivableHasta' in estado && typeof estado.reactivableHasta === 'string' && !Number.isNaN(new Date(estado.reactivableHasta).getTime())) {
    return { tipo: 'cliente', email: estado.email, reactivableHasta: estado.reactivableHasta }
  }
  return null
}

export function CuentaEliminada(): ReactNode {
  const { state } = useLocation()
  const queryClient = useQueryClient()
  // Se llega sin recargar la página: lo que quedó en caché es de la cuenta que
  // se acaba de cerrar, y no debe verlo quien entre después en esta pestaña.
  useEffect(() => {
    void queryClient.cancelQueries()
    queryClient.clear()
  }, [queryClient])
  const confirmacion = leerConfirmacion(state)
  const titulo = confirmacion?.tipo === 'cliente'
    ? 'Tu cuenta se cerró correctamente'
    : confirmacion?.tipo === 'administrador'
      ? 'La cuenta de tu taller se eliminó correctamente'
      : 'Cierre de cuenta'

  return (
    <TarjetaAcceso tituloId="titulo-cuenta-eliminada">
      <h1 id="titulo-cuenta-eliminada" className="text-[clamp(2rem,1.4rem+2vw,2.75rem)] leading-[1.13] font-bold tracking-[-0.03em]">{titulo}</h1>

      {confirmacion?.tipo === 'cliente' ? (
        <>
          <p className="mt-4 text-publico-tinta-media">Te enviamos un correo a <b className="break-all text-publico-tinta">{confirmacion.email}</b>.</p>
          <p className="mt-3 text-publico-tinta-media">Si cambias de opinión, entra antes del <b className="text-publico-tinta">{FECHA_LARGA.format(new Date(confirmacion.reactivableHasta))}</b> y la recuperas. Después se eliminará definitivamente.</p>
          <Link to="/entrar" className={`mt-6 inline-flex min-h-13 w-full items-center justify-center rounded-lg border border-publico-acento bg-publico-acento px-5 py-2.5 text-sm font-bold text-publico-tinta hover:bg-publico-acento-hondo motion-safe:transition-colors ${focoAmarillo}`}>
            Entrar para recuperar mi cuenta
          </Link>
        </>
      ) : confirmacion?.tipo === 'administrador' ? (
        <p className="mt-4 text-publico-tinta-media">Te enviamos un correo de confirmación a <b className="break-all text-publico-tinta">{confirmacion.email}</b>.</p>
      ) : (
        <p className="mt-4 text-publico-tinta-media">Si acabas de cerrar una cuenta, revisa tu correo para ver los detalles.</p>
      )}

      <Link to="/" className={`mt-6 inline-flex min-h-11 items-center rounded-sm text-sm font-bold text-publico-tinta underline decoration-publico-acento decoration-2 underline-offset-4 ${focoClaro}`}>
        Ir a la portada
      </Link>
    </TarjetaAcceso>
  )
}
