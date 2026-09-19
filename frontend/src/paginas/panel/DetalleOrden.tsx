import { useState } from 'react'
import type { JSX } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api, mensajeDeError } from '../../api/cliente.ts'
import { AvisoError } from '../../componentes/AvisoError.tsx'
import { Boton } from '../../componentes/Boton.tsx'
import { Cargando } from '../../componentes/Cargando.tsx'
import { EstadoOrdenEtiqueta } from '../../componentes/EstadoOrdenEtiqueta.tsx'
import { Vacio } from '../../componentes/Vacio.tsx'
import type { OrdenDetalle } from '../../tipos.ts'
import { DialogoAsignacion } from './DialogoAsignacion.tsx'
import { DialogoCierre } from './DialogoCierre.tsx'
import { DialogoPago } from './DialogoPago.tsx'

export function DetalleOrden(): JSX.Element {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()

  // Modales
  const [dialogoAsignarAbierto, setDialogoAsignarAbierto] = useState(false)
  const [dialogoCierreAbierto, setDialogoCierreAbierto] = useState(false)
  const [dialogoPagoAbierto, setDialogoPagoAbierto] = useState(false)

  // Acciones en proceso
  const [marcandoEnProceso, setMarcandoEnProceso] = useState(false)
  const [errorAccion, setErrorAccion] = useState<string | null>(null)
  const [pagoRegistrado, setPagoRegistrado] = useState(false)

  const {
    data: orden,
    isLoading: cargando,
    error: errorObj,
    refetch: recargarOrden,
  } = useQuery<OrdenDetalle>({
    queryKey: ['panel', 'orden', id],
    queryFn: async () => {
      const res = await api.get(`/panel/ordenes/${id}`)
      return res.data as OrdenDetalle
    },
    enabled: Boolean(id),
  })

  const error = errorObj ? mensajeDeError(errorObj) : null

  async function manejarMarcarEnProceso(): Promise<void> {
    if (!orden) return
    setErrorAccion(null)
    setMarcandoEnProceso(true)
    try {
      await api.post(`/panel/ordenes/${orden.id}/en-proceso`)
      await queryClient.invalidateQueries({ queryKey: ['panel', 'orden', id] })
    } catch (err) {
      setErrorAccion(mensajeDeError(err))
    } finally {
      setMarcandoEnProceso(false)
    }
  }

  if (cargando) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Cargando />
      </main>
    )
  }

  if (error) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8">
        <AvisoError mensaje={error} reintentar={() => void recargarOrden()} />
      </main>
    )
  }

  if (!orden) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Vacio
          titulo="Orden no encontrada"
          detalle="No se encontró la orden solicitada o no pertenece a tu taller."
        />
        <div className="mt-4 text-center">
          <Link
            to="/panel"
            className="inline-block text-sm font-semibold text-accion underline focus:outline-none focus:ring-2 focus:ring-accion focus:ring-offset-2 focus:ring-offset-lienzo"
          >
            Volver a la bandeja
          </Link>
        </div>
      </main>
    )
  }

  const historialOrdenado = [...(orden.historial || [])].sort(
    (a, b) => new Date(a.ocurridoEn).getTime() - new Date(b.ocurridoEn).getTime(),
  )

  const puedeAsignar = orden.estado === 'PENDIENTE'
  const puedePasarAEnProceso = orden.estado === 'EN_CAMINO'
  const puedeCerrar =
    orden.estado === 'EN_PROCESO' ||
    (orden.estado === 'COMPLETADA' && orden.total == null)
  const puedeRegistrarPago = orden.total != null && !pagoRegistrado

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      {/* Navegación de regreso */}
      <div className="mb-6">
        <Link
          to="/panel"
          className="inline-flex min-h-[44px] items-center gap-1.5 px-2 py-2 text-sm font-semibold text-accion hover:underline focus:outline-none focus:ring-2 focus:ring-accion focus:ring-offset-2 focus:ring-offset-lienzo rounded-md"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Volver a la bandeja de órdenes
        </Link>
      </div>

      {errorAccion && (
        <div role="alert" className="mb-6 rounded-lg border border-peligro bg-superficie p-4 text-sm text-peligro">
          {errorAccion}
        </div>
      )}

      {/* Cabecera de la orden */}
      <div className="rounded-2xl border border-linea bg-superficie p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-linea pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-tinta">{orden.codigo}</h1>
            <EstadoOrdenEtiqueta estado={orden.estado} etiqueta={orden.etiquetaEstado} />
            <span className="rounded-full border border-linea bg-superficie-suave px-3 py-1 text-xs font-medium text-tinta-media">
              {orden.etiquetaEspecialidad}
            </span>
          </div>

          {/* Botones de acción contextuales según estado */}
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {puedeAsignar && (
              <Boton
                type="button"
                variante="principal"
                onClick={() => setDialogoAsignarAbierto(true)}
              >
                Asignar técnico
              </Boton>
            )}

            {puedePasarAEnProceso && (
              <Boton
                type="button"
                variante="principal"
                cargando={marcandoEnProceso}
                onClick={manejarMarcarEnProceso}
              >
                Marcar en proceso
              </Boton>
            )}

            {puedeCerrar && (
              <Boton
                type="button"
                variante="principal"
                onClick={() => setDialogoCierreAbierto(true)}
              >
                Cerrar la orden
              </Boton>
            )}

            {puedeRegistrarPago && (
              <Boton
                type="button"
                variante="principal"
                onClick={() => setDialogoPagoAbierto(true)}
              >
                Registrar pago
              </Boton>
            )}

            {pagoRegistrado && (
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-linea bg-superficie-suave px-3 py-1.5 text-xs font-semibold text-completada">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Pago registrado
              </span>
            )}
          </div>
        </div>

        {/* Ficha de datos principales */}
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Columna Cliente y Ubicación */}
          <div className="space-y-4">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-tinta-suave">
                Cliente y contacto
              </h2>
              <p className="mt-1 text-base font-bold text-tinta">{orden.clienteNombre}</p>
              <p className="mt-1 text-sm text-tinta-media">
                Teléfono:{' '}
                <a
                  href={`tel:${orden.clienteTelefono}`}
                  className="font-semibold text-accion hover:underline focus:outline-none focus:ring-2 focus:ring-accion focus:ring-offset-2 focus:ring-offset-superficie rounded py-0.5 inline-block"
                >
                  {orden.clienteTelefono}
                </a>
              </p>
            </div>

            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-tinta-suave">
                Dirección del servicio
              </h2>
              <p className="mt-1 text-sm font-medium text-tinta">{orden.direccion}</p>
              {orden.referencia && (
                <p className="mt-0.5 text-xs text-tinta-suave">
                  Referencia: {orden.referencia}
                </p>
              )}
              <p className="mt-0.5 text-xs text-tinta-media">
                Distrito: {orden.distrito}
              </p>

              {orden.urlMapa && (
                <div className="mt-2">
                  <a
                    href={orden.urlMapa}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-linea bg-superficie px-3.5 py-2 text-xs font-semibold text-tinta hover:bg-superficie-suave focus:outline-none focus:ring-2 focus:ring-accion focus:ring-offset-2 focus:ring-offset-superficie"
                  >
                    <svg className="h-4 w-4 text-accion" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                      <line x1="8" y1="2" x2="8" y2="18" />
                      <line x1="16" y1="6" x2="16" y2="22" />
                    </svg>
                    Ver en el mapa
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Columna Programación y Técnico */}
          <div className="space-y-4">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-tinta-suave">
                Fecha y hora programada
              </h2>
              <p className="mt-1 text-sm font-medium text-tinta">
                {orden.fechaProgramada || 'Sin fecha'} · {orden.horaProgramada ? orden.horaProgramada.substring(0, 5) : 'Sin hora'}
              </p>
            </div>

            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-tinta-suave">
                Técnico asignado
              </h2>
              {orden.tecnicoNombre ? (
                <p className="mt-1 text-sm font-bold text-tinta">{orden.tecnicoNombre}</p>
              ) : (
                <p className="mt-1 text-sm italic text-tinta-suave">Sin técnico asignado</p>
              )}
            </div>
          </div>
        </div>

        {/* Descripción de la falla */}
        <div className="mt-6 border-t border-linea pt-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-tinta-suave">
            Descripción de la falla
          </h2>
          <div className="mt-2 rounded-xl border border-linea bg-superficie-suave p-4">
            <p className="text-sm italic text-tinta">"{orden.descripcionFalla}"</p>
          </div>
        </div>

        {/* Fotos adjuntas */}
        {orden.fotos && orden.fotos.length > 0 && (
          <div className="mt-6 border-t border-linea pt-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-tinta-suave">
              Fotos adjuntas ({orden.fotos.length})
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {orden.fotos.map((foto, idx) => (
                <a
                  key={foto}
                  href={foto}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative block aspect-video overflow-hidden rounded-xl border border-linea bg-superficie-suave focus:outline-none focus:ring-2 focus:ring-accion focus:ring-offset-2 focus:ring-offset-superficie"
                >
                  <img
                    src={foto}
                    alt={`Foto ${idx + 1} de la falla en orden ${orden.codigo}`}
                    className="h-full w-full object-cover transition-transform motion-reduce:transition-none group-hover:scale-105"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-tinta/60 p-1 text-center text-micro text-superficie">
                    Foto {idx + 1}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Desglose de liquidación si tiene total */}
        {orden.total != null && (
          <div className="mt-6 border-t border-linea pt-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-tinta-suave">
              Liquidación del servicio
            </h2>

            {orden.diagnostico && (
              <div className="mt-2 rounded-xl border border-linea bg-superficie-suave p-3">
                <span className="block text-xs font-semibold text-tinta">Diagnóstico técnico:</span>
                <p className="mt-1 text-xs text-tinta-media">{orden.diagnostico}</p>
              </div>
            )}

            <div className="mt-4 overflow-x-auto rounded-xl border border-linea">
              <table className="w-full min-w-[480px] text-left text-xs text-tinta">
                <thead className="border-b border-linea bg-superficie-suave font-semibold text-tinta-media">
                  <tr>
                    <th scope="col" className="px-4 py-2.5">Concepto</th>
                    <th scope="col" className="px-4 py-2.5 text-center">Cant.</th>
                    <th scope="col" className="px-4 py-2.5 text-right">Precio unitario</th>
                    <th scope="col" className="px-4 py-2.5 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-linea bg-superficie">
                  <tr>
                    <td className="px-4 py-2.5 font-medium">Mano de obra</td>
                    <td className="px-4 py-2.5 text-center">1</td>
                    <td className="px-4 py-2.5 text-right">
                      S/ {orden.precioManoObra ? orden.precioManoObra.toFixed(2) : '0.00'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium">
                      S/ {orden.precioManoObra ? orden.precioManoObra.toFixed(2) : '0.00'}
                    </td>
                  </tr>
                  {orden.repuestos &&
                    orden.repuestos.map((rep, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2.5 font-medium">{rep.nombre}</td>
                        <td className="px-4 py-2.5 text-center">{rep.cantidad}</td>
                        <td className="px-4 py-2.5 text-right">
                          S/ {rep.precioUnitario.toFixed(2)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium">
                          S/ {rep.subtotal.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                </tbody>
                <tfoot className="border-t border-linea bg-superficie-suave font-bold">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-right text-sm">
                      Total a pagar:
                    </td>
                    <td className="px-4 py-3 text-right text-base text-tinta">
                      S/ {orden.total.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Línea de tiempo del historial */}
      <div className="mt-8 rounded-2xl border border-linea bg-superficie p-6 shadow-sm">
        <h2 className="text-base font-bold text-tinta">Historial de la orden</h2>
        <p className="mt-0.5 text-xs text-tinta-suave">
          Registro cronológico de los cambios de estado y acciones tomadas.
        </p>

        <div className="mt-6 space-y-6">
          {historialOrdenado.length === 0 ? (
            <p className="text-xs text-tinta-suave">No hay eventos en el historial.</p>
          ) : (
            historialOrdenado.map((paso, idx) => (
              <div key={idx} className="relative flex items-start gap-4">
                {/* Línea conectora */}
                {idx < historialOrdenado.length - 1 && (
                  <div
                    className="absolute left-2.5 top-6 bottom-0 w-0.5 -ml-px bg-linea"
                    aria-hidden="true"
                  />
                )}
                {/* Punto */}
                <span
                  className="relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-superficie border-2 border-accion"
                  aria-hidden="true"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-accion" />
                </span>

                <div className="flex-1 rounded-xl border border-linea bg-superficie-suave p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-xs text-tinta">{paso.etiqueta}</span>
                    <time className="text-micro text-tinta-suave" dateTime={paso.ocurridoEn}>
                      {new Date(paso.ocurridoEn).toLocaleString('es-PE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </time>
                  </div>
                  <div className="mt-1 text-xs text-tinta-media">
                    <span className="font-semibold text-tinta-suave">Actor: </span>
                    {paso.actor}
                  </div>
                  {paso.nota && (
                    <p className="mt-1 text-xs text-tinta italic">"{paso.nota}"</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modales */}
      {puedeAsignar && (
        <DialogoAsignacion
          ordenId={orden.id}
          codigoOrden={orden.codigo}
          especialidadOrden={orden.especialidad}
          etiquetaEspecialidad={orden.etiquetaEspecialidad}
          abierto={dialogoAsignarAbierto}
          alCerrar={() => setDialogoAsignarAbierto(false)}
          alAsignarExitoso={() => {
            setDialogoAsignarAbierto(false)
            void queryClient.invalidateQueries({ queryKey: ['panel', 'orden', id] })
          }}
        />
      )}

      {puedeCerrar && (
        <DialogoCierre
          ordenId={orden.id}
          codigoOrden={orden.codigo}
          abierto={dialogoCierreAbierto}
          alCerrar={() => setDialogoCierreAbierto(false)}
          alCierreExitoso={() => {
            setDialogoCierreAbierto(false)
            void queryClient.invalidateQueries({ queryKey: ['panel', 'orden', id] })
          }}
        />
      )}

      {orden.total != null && (
        <DialogoPago
          ordenId={orden.id}
          codigoOrden={orden.codigo}
          total={orden.total}
          abierto={dialogoPagoAbierto}
          alCerrar={() => setDialogoPagoAbierto(false)}
          alPagoExitoso={() => {
            setDialogoPagoAbierto(false)
            setPagoRegistrado(true)
            void queryClient.invalidateQueries({ queryKey: ['panel', 'orden', id] })
          }}
        />
      )}
    </main>
  )
}
