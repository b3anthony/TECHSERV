import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { api, mensajeDeError } from '../../api/cliente.ts'
import { Cargando } from '../../componentes/Cargando.tsx'
import { AvisoError } from '../../componentes/AvisoError.tsx'
import { Vacio } from '../../componentes/Vacio.tsx'
import { EstadoOrdenEtiqueta } from '../../componentes/EstadoOrdenEtiqueta.tsx'
import type { OrdenResumen } from '../../tipos.ts'
import { formatearFechaHora } from './fechas.ts'

export function MisOrdenes(): ReactNode {
  const [ordenes, setOrdenes] = useState<OrdenResumen[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let montado = true
    api
      .get<OrdenResumen[]>('/mis-ordenes')
      .then((res) => {
        if (montado) setOrdenes(res.data)
      })
      .catch((err) => {
        if (montado) setError(mensajeDeError(err))
      })
      .finally(() => {
        if (montado) setCargando(false)
      })
    return () => {
      montado = false
    }
  }, [])

  function recargar() {
    setCargando(true)
    setError(null)
    api
      .get<OrdenResumen[]>('/mis-ordenes')
      .then((res) => {
        setOrdenes(res.data)
      })
      .catch((err) => {
        setError(mensajeDeError(err))
      })
      .finally(() => {
        setCargando(false)
      })
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {/* Cabecera */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-tinta sm:text-3xl">
            Mis órdenes
          </h1>
          <p className="mt-1 text-sm text-tinta-suave">
            Historial y seguimiento de tus solicitudes de servicio técnico a domicilio.
          </p>
        </div>

        <a
          href="/"
          className="inline-flex items-center justify-center rounded-lg bg-accion px-4 py-2.5 text-sm font-semibold text-superficie hover:bg-accion-honda transition-colors motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-accion focus:ring-offset-2 focus:ring-offset-lienzo"
        >
          Nueva reserva
        </a>
      </div>

      {cargando && <Cargando />}

      {error && <AvisoError mensaje={error} reintentar={recargar} />}

      {!cargando && !error && ordenes.length === 0 && (
        <div className="rounded-xl border border-linea bg-superficie p-8 text-center shadow-xs">
          <Vacio
            titulo="No tienes solicitudes de servicio"
            detalle="Cuando reserves una visita técnica, podrás ver su estado y hacer seguimiento desde aquí."
          />
          <a
            href="/"
            className="mt-4 inline-block text-sm font-semibold text-accion underline hover:text-accion-honda focus:outline-none focus:ring-2 focus:ring-accion focus:ring-offset-2 focus:ring-offset-superficie"
          >
            Reservar un servicio
          </a>
        </div>
      )}

      {!cargando && !error && ordenes.length > 0 && (
        <div className="flex flex-col gap-4">
          {ordenes.map((orden) => (
            <article
              key={orden.id}
              className="rounded-xl border border-linea bg-superficie p-5 shadow-xs hover:border-linea-fuerte transition-colors motion-reduce:transition-none"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-linea pb-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-base font-bold text-tinta">
                    {orden.codigo}
                  </span>
                  <span className="text-xs text-tinta-suave">
                    {orden.etiquetaEspecialidad}
                  </span>
                </div>

                <EstadoOrdenEtiqueta
                  estado={orden.estado}
                  etiqueta={orden.etiquetaEstado}
                />
              </div>

              <div className="mt-3">
                <p className="text-sm font-medium text-tinta line-clamp-2">
                  {orden.descripcionFalla}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-tinta-suave">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="font-semibold text-tinta">Visita:</span>{' '}
                    {formatearFechaHora(orden.fechaProgramada, orden.horaProgramada)}
                  </span>

                  <span aria-hidden="true" className="text-tinta-suave">
                    •
                  </span>

                  <span>
                    {orden.direccion}, {orden.distrito}
                  </span>

                  {orden.tecnicoNombre && (
                    <>
                      <span aria-hidden="true" className="text-tinta-suave">
                        •
                      </span>
                      <span>Técnico: {orden.tecnicoNombre}</span>
                    </>
                  )}

                  {orden.cantidadFotos > 0 && (
                    <>
                      <span aria-hidden="true" className="text-tinta-suave">
                        •
                      </span>
                      <span>
                        {orden.cantidadFotos}{' '}
                        {orden.cantidadFotos === 1 ? 'foto adjunta' : 'fotos adjuntas'}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <a
                  href={`/mis-ordenes/${orden.id}`}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-accion hover:text-accion-honda hover:underline focus:outline-none focus:ring-2 focus:ring-accion focus:ring-offset-2 focus:ring-offset-superficie"
                >
                  Ver seguimiento
                  <span aria-hidden="true">&rarr;</span>
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  )
}
