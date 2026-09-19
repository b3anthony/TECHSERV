import { useCallback, useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useParams } from 'react-router-dom'
import { api, mensajeDeError } from '../../api/cliente.ts'
import { Boton } from '../../componentes/Boton.tsx'
import { Cargando } from '../../componentes/Cargando.tsx'
import { AvisoError } from '../../componentes/AvisoError.tsx'
import { AreaTexto } from '../../componentes/AreaTexto.tsx'
import { EstadoOrdenEtiqueta } from '../../componentes/EstadoOrdenEtiqueta.tsx'
import { Vacio } from '../../componentes/Vacio.tsx'
import type { ActorHistorial } from '../../tipos.ts'
import type { DetalleCalificacionDatos, SeguimientoDatos } from './tiposPortal.ts'
import { formatearFechaHora, formatearMomento } from './fechas.ts'

const MAPA_ACTORES: Record<ActorHistorial, string> = {
  CLIENTE: 'Cliente',
  ADMIN_MYPE: 'Taller',
  TECNICO: 'Técnico',
  SISTEMA: 'Sistema',
}

export function SeguimientoOrden(): ReactNode {
  const { id } = useParams<{ id: string }>()

  const [seguimiento, setSeguimiento] = useState<SeguimientoDatos | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Calificación existente
  const [calificacionExistente, setCalificacionExistente] =
    useState<DetalleCalificacionDatos | null>(null)

  // Formulario de calificación
  const [puntaje, setPuntaje] = useState<number>(0)
  const [comentario, setComentario] = useState<string>('')
  const [enviandoCalificacion, setEnviandoCalificacion] = useState(false)
  const [errorCalificacion, setErrorCalificacion] = useState<string | null>(null)
  const [exitoCalificacion, setExitoCalificacion] = useState<string | null>(null)

  // Cancelación
  const [mostrandoConfirmacionCancelar, setMostrandoConfirmacionCancelar] = useState(false)
  const [motivoCancelacion, setMotivoCancelacion] = useState('')
  const [cancelando, setCancelando] = useState(false)
  const [errorCancelacion, setErrorCancelacion] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      setCargando(false)
      setError('No se encontró la solicitud.')
      return
    }
    let montado = true

    api
      .get<SeguimientoDatos>(`/mis-ordenes/${id}/seguimiento`)
      .then((res) => {
        if (montado) setSeguimiento(res.data)
      })
      .catch((err) => {
        if (montado) setError(mensajeDeError(err))
      })
      .finally(() => {
        if (montado) setCargando(false)
      })

    api
      .get<DetalleCalificacionDatos>(`/mis-ordenes/${id}/calificacion`, {
        validateStatus: (s) => (s >= 200 && s < 300) || s === 204,
      })
      .then((res) => {
        if (!montado) return
        if (res.status === 204 || !res.data || typeof res.data !== 'object') {
          setCalificacionExistente(null)
        } else {
          setCalificacionExistente(res.data)
        }
      })
      .catch(() => {
        if (montado) setCalificacionExistente(null)
      })

    return () => {
      montado = false
    }
  }, [id])

  const cargarDatos = useCallback(() => {
    if (!id) {
      setCargando(false)
      setError('No se encontró la solicitud.')
      return
    }
    setError(null)

    api
      .get<SeguimientoDatos>(`/mis-ordenes/${id}/seguimiento`)
      .then((res) => {
        setSeguimiento(res.data)
      })
      .catch((err) => {
        setError(mensajeDeError(err))
      })
      .finally(() => {
        setCargando(false)
      })

    api
      .get<DetalleCalificacionDatos>(`/mis-ordenes/${id}/calificacion`, {
        validateStatus: (s) => (s >= 200 && s < 300) || s === 204,
      })
      .then((res) => {
        if (res.status === 204 || !res.data || typeof res.data !== 'object') {
          setCalificacionExistente(null)
        } else {
          setCalificacionExistente(res.data)
        }
      })
      .catch(() => {
        setCalificacionExistente(null)
      })
  }, [id])

  function recargar() {
    setCargando(true)
    cargarDatos()
  }

  // Enviar calificación
  async function manejarEnviarCalificacion(e: FormEvent) {
    e.preventDefault()
    if (!id || puntaje < 1 || puntaje > 5) return

    setErrorCalificacion(null)
    setExitoCalificacion(null)
    setEnviandoCalificacion(true)

    try {
      const res = await api.post<SeguimientoDatos>(`/mis-ordenes/${id}/calificacion`, {
        puntaje,
        comentario: comentario.trim() ? comentario.trim() : null,
      })
      setSeguimiento(res.data)
      setExitoCalificacion('¡Gracias! Tu calificación ha sido registrada.')
      // Actualizar detalle de calificación mostrado
      setCalificacionExistente({
        puntaje,
        comentario: comentario.trim() ? comentario.trim() : null,
        creadaEn: new Date().toISOString(),
      })
    } catch (err) {
      setErrorCalificacion(mensajeDeError(err))
    } finally {
      setEnviandoCalificacion(false)
    }
  }

  // Cancelar orden
  async function manejarConfirmarCancelar() {
    if (!id) return
    setErrorCancelacion(null)
    setCancelando(true)

    try {
      await api.post(`/mis-ordenes/${id}/cancelar`, {
        motivo: motivoCancelacion.trim() ? motivoCancelacion.trim() : null,
      })
      setMostrandoConfirmacionCancelar(false)
      cargarDatos()
    } catch (err) {
      setErrorCancelacion(mensajeDeError(err))
    } finally {
      setCancelando(false)
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {/* Enlace de regreso */}
      <nav className="mb-6" aria-label="Navegación de retorno">
        <a
          href="/mis-ordenes"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-accion hover:text-accion-honda underline focus:outline-none focus:ring-2 focus:ring-accion focus:ring-offset-2 focus:ring-offset-lienzo"
        >
          <span aria-hidden="true">&larr;</span>
          Volver a mis órdenes
        </a>
      </nav>

      {cargando && <Cargando />}

      {error && (
        <div className="flex flex-col items-start gap-4">
          <AvisoError mensaje={error} reintentar={id ? recargar : undefined} />
          <a
            href="/mis-ordenes"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-accion hover:text-accion-honda underline focus:outline-none focus:ring-2 focus:ring-accion focus:ring-offset-2 focus:ring-offset-lienzo"
          >
            <span aria-hidden="true">&larr;</span>
            Volver a mis órdenes
          </a>
        </div>
      )}

      {!cargando && !error && seguimiento && (
        <div className="flex flex-col gap-6">
          {/* Encabezado con código y estado */}
          <div className="rounded-xl border border-linea bg-superficie p-6 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold text-tinta-suave">Código de solicitud</span>
                <h1 className="font-mono text-2xl font-bold tracking-tight text-tinta sm:text-3xl">
                  {seguimiento.codigo}
                </h1>
              </div>

              <EstadoOrdenEtiqueta
                estado={seguimiento.estado}
                etiqueta={seguimiento.etiquetaEstado}
                className="text-sm px-3.5 py-1.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
            {/* Columna izquierda: Historial y Formularios */}
            <div className="flex flex-col gap-6">
              {/* Línea de tiempo de pasos */}
              <section
                className="rounded-xl border border-linea bg-superficie p-6 shadow-xs"
                aria-labelledby="heading-historial"
              >
                <h2 id="heading-historial" className="text-lg font-bold text-tinta mb-6">
                  Historial de la solicitud
                </h2>

                {seguimiento.pasos.length === 0 ? (
                  <Vacio
                    titulo="Sin movimientos"
                    detalle="Todavía no hay movimientos registrados para esta solicitud."
                  />
                ) : (
                  <div className="relative pl-6">
                    {/* Línea vertical de fondo */}
                    <div
                      aria-hidden="true"
                      className="absolute bottom-3 left-2 top-3 w-0.5 bg-linea"
                    />

                    <ol className="flex flex-col gap-6" aria-label="Pasos del historial">
                    {seguimiento.pasos.map((paso, index) => {
                      const esUltimo = index === seguimiento.pasos.length - 1
                      return (
                        <li key={`${paso.estado}-${paso.ocurridoEn}`} className="relative">
                          {/* Punto indicador */}
                          <div
                            aria-hidden="true"
                            className={`absolute -left-6 mt-1 flex h-4 w-4 items-center justify-center rounded-full border-2 bg-superficie ${
                              esUltimo
                                ? 'border-accion ring-4 ring-accion-tenue'
                                : 'border-linea-fuerte'
                            }`}
                          >
                            <div
                              className={`h-2 w-2 rounded-full ${
                                esUltimo ? 'bg-accion' : 'bg-linea-fuerte'
                              }`}
                            />
                          </div>

                          <div className="flex flex-col gap-1">
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                              <span
                                className={`text-sm font-semibold ${
                                  esUltimo ? 'text-accion font-bold' : 'text-tinta'
                                }`}
                              >
                                {paso.etiqueta}
                              </span>
                              <span className="text-xs text-tinta-suave">
                                {formatearMomento(paso.ocurridoEn)}
                              </span>
                            </div>

                            <span className="text-xs text-tinta-suave">
                              Por: {MAPA_ACTORES[paso.actor] || paso.actor}
                            </span>

                            {paso.nota && (
                              <p className="mt-1 rounded-md border border-linea bg-superficie-suave p-2.5 text-xs text-tinta">
                                {paso.nota}
                              </p>
                            )}
                          </div>
                        </li>
                      )
                    })}
                  </ol>
                </div>
              )}
            </section>

              {/* Formulario de Calificación si puedeCalificar */}
              {seguimiento.puedeCalificar && (
                <section
                  className="rounded-xl border border-linea bg-superficie p-6 shadow-xs"
                  aria-labelledby="heading-calificar"
                >
                  <h2 id="heading-calificar" className="text-lg font-bold text-tinta mb-1">
                    Califica el servicio recibido
                  </h2>
                  <p className="text-sm text-tinta-suave mb-4">
                    Tu opinión ayuda a mejorar la atención del taller y guía a otros usuarios.
                  </p>

                  {errorCalificacion && (
                    <div
                      role="alert"
                      className="mb-4 rounded-lg border border-peligro bg-superficie p-3 text-xs text-peligro"
                    >
                      {errorCalificacion}
                    </div>
                  )}

                  {exitoCalificacion && (
                    <div
                      role="status"
                      className="mb-4 rounded-lg border border-linea bg-superficie-suave p-3 text-xs text-completada font-medium"
                    >
                      {exitoCalificacion}
                    </div>
                  )}

                  <form onSubmit={manejarEnviarCalificacion} className="flex flex-col gap-4">
                    {/* Estrellas interactivas con botones accesibles */}
                    <div>
                      <span id="label-estrellas" className="block text-sm font-semibold text-tinta mb-2">
                        Puntuación (de 1 a 5 estrellas)
                      </span>
                      <div
                        className="flex items-center gap-1.5"
                        role="radiogroup"
                        aria-labelledby="label-estrellas"
                      >
                        {[1, 2, 3, 4, 5].map((estrella) => {
                          const activa = puntaje >= estrella
                          return (
                            <button
                              key={estrella}
                              type="button"
                              role="radio"
                              aria-checked={puntaje === estrella}
                              aria-label={`${estrella} de 5 estrellas`}
                              onClick={() => setPuntaje(estrella)}
                              className="rounded-md p-1.5 text-tinta hover:bg-superficie-suave focus:outline-none focus:ring-2 focus:ring-accion focus:ring-offset-2 focus:ring-offset-superficie"
                            >
                              <svg
                                className={`h-7 w-7 transition-colors motion-reduce:transition-none ${
                                  activa
                                    ? 'text-pendiente fill-current'
                                    : 'text-linea-fuerte fill-none stroke-current'
                                }`}
                                viewBox="0 0 20 20"
                                aria-hidden="true"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            </button>
                          )
                        })}

                        <span className="ml-2 text-sm font-semibold text-tinta">
                          {puntaje > 0 ? `${puntaje} de 5 estrellas` : 'Elige una calificación'}
                        </span>
                      </div>
                    </div>

                    {/* Comentario opcional */}
                    <div>
                      <AreaTexto
                        etiqueta="Comentario (opcional)"
                        id="comentario-calificacion"
                        rows={3}
                        maxLength={500}
                        placeholder="Comparte tu experiencia con el taller y el servicio..."
                        value={comentario}
                        onChange={(e) => setComentario(e.target.value)}
                      />
                      <div className="mt-1 flex justify-end">
                        <span className="text-xs text-tinta-suave">
                          {comentario.length}/500 caracteres
                        </span>
                      </div>
                    </div>

                    <Boton
                      type="submit"
                      variante="principal"
                      cargando={enviandoCalificacion}
                      disabled={puntaje === 0}
                      className="self-start font-semibold"
                    >
                      Enviar calificación
                    </Boton>
                  </form>
                </section>
              )}

              {/* Vista de calificación registrada si ya existe */}
              {calificacionExistente && (
                <section
                  className="rounded-xl border border-linea bg-superficie p-6 shadow-xs"
                  aria-labelledby="heading-calificacion-registrada"
                >
                  <h2 id="heading-calificacion-registrada" className="text-lg font-bold text-tinta mb-3">
                    Tu calificación de este servicio
                  </h2>

                  <div className="flex flex-col gap-2 rounded-lg border border-linea bg-superficie-suave p-4">
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((estrella) => (
                        <svg
                          key={estrella}
                          className={`h-5 w-5 ${
                            calificacionExistente.puntaje >= estrella
                              ? 'text-pendiente fill-current'
                              : 'text-linea-fuerte fill-none stroke-current'
                          }`}
                          viewBox="0 0 20 20"
                          aria-hidden="true"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                      <span className="ml-2 text-sm font-bold text-tinta">
                        {calificacionExistente.puntaje} de 5 estrellas
                      </span>
                    </div>

                    {calificacionExistente.comentario && (
                      <p className="mt-1 text-sm text-tinta italic">
                        "{calificacionExistente.comentario}"
                      </p>
                    )}

                    <span className="mt-1 text-xs text-tinta-suave">
                      Registrada el {formatearMomento(calificacionExistente.creadaEn)}
                    </span>
                  </div>
                </section>
              )}
            </div>

            {/* Columna derecha: Detalles de la cita y Acciones */}
            <aside className="flex flex-col gap-6" aria-label="Detalles de la cita">
              <div className="rounded-xl border border-linea bg-superficie p-6 shadow-xs">
                <h2 className="border-b border-linea pb-3 mb-4 text-base font-bold text-tinta">
                  Detalles del servicio
                </h2>

                <dl className="flex flex-col gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-tinta-suave">Taller asignado</dt>
                    <dd className="font-semibold text-tinta">{seguimiento.tallerNombre}</dd>
                  </div>

                  <div>
                    <dt className="text-xs text-tinta-suave">Técnico responsable</dt>
                    <dd className="font-semibold text-tinta">
                      {seguimiento.tecnicoNombre ?? 'Por asignar'}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-xs text-tinta-suave">Fecha y hora programadas</dt>
                    <dd className="font-semibold text-tinta">
                      {formatearFechaHora(
                        seguimiento.fechaProgramada,
                        seguimiento.horaProgramada,
                      )}
                    </dd>
                  </div>
                </dl>

                {/* Acción: Cancelar servicio si puedeCancelar */}
                {seguimiento.puedeCancelar && (
                  <div className="mt-6 border-t border-linea pt-4">
                    {!mostrandoConfirmacionCancelar ? (
                      <Boton
                        type="button"
                        variante="peligro"
                        onClick={() => setMostrandoConfirmacionCancelar(true)}
                        className="w-full font-semibold"
                      >
                        Cancelar solicitud
                      </Boton>
                    ) : (
                      <div
                        role="region"
                        aria-labelledby="heading-confirmar-cancelar"
                        className="rounded-lg border border-peligro bg-superficie p-4 text-left"
                      >
                        <h3
                          id="heading-confirmar-cancelar"
                          className="text-sm font-bold text-peligro mb-1"
                        >
                          ¿Confirmas la cancelación?
                        </h3>
                        <p className="text-xs text-tinta-suave mb-3">
                          Esta acción cancelará la visita técnica solicitada.
                        </p>

                        {errorCancelacion && (
                          <p role="alert" className="mb-2 text-xs text-peligro">
                            {errorCancelacion}
                          </p>
                        )}

                        <div className="mb-3">
                          <label
                            htmlFor="motivo-cancelacion"
                            className="block text-xs font-semibold text-tinta mb-1"
                          >
                            Motivo (opcional)
                          </label>
                          <textarea
                            id="motivo-cancelacion"
                            rows={2}
                            value={motivoCancelacion}
                            onChange={(e) => setMotivoCancelacion(e.target.value)}
                            placeholder="Ej. Problema solucionado por cuenta propia"
                            className="w-full rounded-md border border-linea-fuerte p-2 text-xs text-tinta bg-superficie focus:outline-none focus:ring-2 focus:ring-peligro focus:ring-offset-2 focus:ring-offset-superficie"
                          />
                        </div>

                        <div className="flex flex-col gap-2">
                          <Boton
                            type="button"
                            variante="peligro"
                            cargando={cancelando}
                            onClick={manejarConfirmarCancelar}
                            className="w-full text-xs font-semibold"
                          >
                            Sí, cancelar solicitud
                          </Boton>
                          <Boton
                            type="button"
                            variante="secundario"
                            disabled={cancelando}
                            onClick={() => {
                              setMostrandoConfirmacionCancelar(false)
                              setErrorCancelacion(null)
                            }}
                            className="w-full text-xs font-semibold"
                          >
                            No, mantener solicitud
                          </Boton>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      )}
    </main>
  )
}
