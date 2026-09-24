import { useCallback, useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, mensajeDeError } from '../../api/cliente.ts'
import { Icono } from '../../componentes/Icono.tsx'
import type { IconoNombre } from '../../componentes/Icono.tsx'
import { focoClaro, focoOscuro } from '../../componentes/marco/foco.ts'
import { AreaTexto } from '../../componentes/publico/AreaTexto.tsx'
import { Aviso } from '../../componentes/publico/Aviso.tsx'
import { Boton } from '../../componentes/publico/Boton.tsx'
import { Tarjeta } from '../../componentes/publico/Tarjeta.tsx'
import type { OrdenDetalle } from '../../tipos.ts'
import type { DetalleCalificacionDatos, SeguimientoDatos } from './tiposPortal.ts'
import { fechaAmigable, formatearFecha, formatearMomento, horaCorta } from './fechas.ts'
import { BarraEtapas } from './ordenes/BarraEtapas.tsx'
import { ETIQUETA_PASO, mensajeEstado } from './ordenes/etapas.ts'

const soles = (n: number) => `S/ ${n.toFixed(2)}`

export function SeguimientoOrden(): ReactNode {
  const { id } = useParams<{ id: string }>()

  const [seguimiento, setSeguimiento] = useState<SeguimientoDatos | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Detalle de la orden (lo que pediste, dirección, lo que se hizo). Es un
  // complemento: si falla, el seguimiento se ve igual sin esas tarjetas.
  const [detalle, setDetalle] = useState<OrdenDetalle | null>(null)
  const [actualizando, setActualizando] = useState(false)

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

    api
      .get<OrdenDetalle>(`/mis-ordenes/${id}`)
      .then((res) => {
        if (montado) setDetalle(res.data)
      })
      .catch(() => {
        if (montado) setDetalle(null)
      })

    return () => {
      montado = false
    }
  }, [id])

  const cargarDatos = useCallback(() => {
    if (!id) {
      setCargando(false)
      setError('No se encontró la solicitud.')
      return Promise.resolve()
    }
    setError(null)

    const seguimientoP = api
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

    const calificacionP = api
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

    const detalleP = api
      .get<OrdenDetalle>(`/mis-ordenes/${id}`)
      .then((res) => {
        setDetalle(res.data)
      })
      .catch(() => {
        setDetalle(null)
      })

    return Promise.all([seguimientoP, calificacionP, detalleP]).then(() => undefined)
  }, [id])

  function recargar() {
    setCargando(true)
    cargarDatos()
  }

  // "Actualizar": vuelve a pedir el estado sin vaciar la pantalla.
  async function actualizar() {
    setActualizando(true)
    await cargarDatos()
    setActualizando(false)
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

  const volver = (
    <Link to="/mis-ordenes" className={`inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-bold text-publico-tinta ${focoClaro}`}>
      <Icono nombre="flecha" className="size-4 rotate-180" /> Mis órdenes
    </Link>
  )

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6 lg:px-8">
      <nav aria-label="Volver" className="py-4 lg:pt-8">{volver}</nav>

      {cargando && (
        <div role="status" className="grid gap-4">
          <span className="sr-only">Cargando el seguimiento…</span>
          <div aria-hidden="true" className="h-72 rounded-2xl bg-publico-panel/90 motion-safe:animate-pulse" />
          <div aria-hidden="true" className="h-40 rounded-2xl border border-publico-linea bg-publico-superficie motion-safe:animate-pulse" />
        </div>
      )}

      {!cargando && error && (
        <Aviso tipo="error">
          {error}{' '}
          {id && <button type="button" onClick={recargar} className={`font-bold underline decoration-publico-acento underline-offset-4 ${focoClaro}`}>Reintentar</button>}
        </Aviso>
      )}

      {!cargando && !error && seguimiento && (
        <ContenidoSeguimiento
          seguimiento={seguimiento}
          detalle={detalle}
          actualizando={actualizando}
          actualizar={actualizar}
          calificar={
            seguimiento.puedeCalificar && (
              <Tarjeta aria-labelledby="titulo-calificar" className="border-2 border-publico-acento-hondo">
                <h2 id="titulo-calificar" className="text-xl leading-tight font-bold tracking-[-0.02em]">¿Cómo te fue con el servicio?</h2>
                <p className="mt-1 text-sm/[1.55] text-publico-tinta-media">Tu calificación ayuda al taller a mejorar y a otras personas a elegir.</p>

                {errorCalificacion && <Aviso tipo="error" className="mt-4">{errorCalificacion}</Aviso>}

                <form onSubmit={manejarEnviarCalificacion} className="mt-5 grid gap-4">
                  <div>
                    <span id="label-estrellas" className="block text-sm font-bold">Toca las estrellas</span>
                    <div className="mt-2 flex flex-wrap items-center gap-1" role="radiogroup" aria-labelledby="label-estrellas">
                      {[1, 2, 3, 4, 5].map((estrella) => (
                        <button
                          key={estrella}
                          type="button"
                          role="radio"
                          aria-checked={puntaje === estrella}
                          aria-label={`${estrella} de 5 estrellas`}
                          onClick={() => setPuntaje(estrella)}
                          className={`grid size-12 place-items-center rounded-lg hover:bg-publico-acento-tenue ${focoClaro}`}
                        >
                          <Icono nombre="estrella" className={`size-8 motion-safe:transition-colors ${puntaje >= estrella ? 'text-publico-acento-hondo' : 'text-publico-linea-fuerte'}`} />
                        </button>
                      ))}
                      <span className="ml-2 text-sm font-bold" aria-live="polite">
                        {['Elige de 1 a 5', 'Malo', 'Regular', 'Bueno', 'Muy bueno', 'Excelente'][puntaje]}
                      </span>
                    </div>
                  </div>

                  <AreaTexto
                    etiqueta="Comentario (opcional)"
                    id="comentario-calificacion"
                    rows={3}
                    max={500}
                    placeholder="Cuéntanos qué te pareció la atención y el trabajo."
                    value={comentario}
                    onChange={(e) => setComentario(e.target.value)}
                  />

                  <Boton type="submit" cargando={enviandoCalificacion} disabled={puntaje === 0} className="justify-self-start">
                    Enviar calificación
                  </Boton>
                </form>
              </Tarjeta>
            )
          }
          calificacion={
            <>
              {exitoCalificacion && <Aviso tipo="exito" role="status">{exitoCalificacion}</Aviso>}
              {calificacionExistente && (
                <Tarjeta aria-labelledby="titulo-calificacion">
                  <h2 id="titulo-calificacion" className="text-lg font-bold">Tu calificación</h2>
                  <p className="mt-3 flex items-center gap-1" role="img" aria-label={`${calificacionExistente.puntaje} de 5 estrellas`}>
                    {[1, 2, 3, 4, 5].map((estrella) => (
                      <Icono key={estrella} nombre="estrella" className={`size-6 ${calificacionExistente.puntaje >= estrella ? 'text-publico-acento-hondo' : 'text-publico-linea-fuerte'}`} />
                    ))}
                    <b className="ml-2 text-sm">{calificacionExistente.puntaje} de 5</b>
                  </p>
                  {calificacionExistente.comentario && (
                    <blockquote className="mt-3 border-l-4 border-publico-linea pl-3 text-sm/[1.55] text-publico-tinta-media">«{calificacionExistente.comentario}»</blockquote>
                  )}
                  <p className="mt-3 text-xs text-publico-tinta-suave">La diste el {formatearMomento(calificacionExistente.creadaEn)}</p>
                </Tarjeta>
              )}
            </>
          }
          cancelar={
            seguimiento.puedeCancelar && (
              <div className="border-t border-publico-linea pt-4">
                {!mostrandoConfirmacionCancelar ? (
                  <button
                    type="button"
                    onClick={() => setMostrandoConfirmacionCancelar(true)}
                    className={`min-h-11 rounded-lg text-sm font-bold text-publico-peligro underline decoration-2 underline-offset-4 ${focoClaro}`}
                  >
                    Cancelar la visita
                  </button>
                ) : (
                  <div role="region" aria-labelledby="titulo-confirmar-cancelar" className="grid gap-3">
                    <div>
                      <h3 id="titulo-confirmar-cancelar" className="font-bold text-publico-peligro">¿Seguro que quieres cancelar?</h3>
                      <p className="mt-1 text-sm/[1.55] text-publico-tinta-media">El técnico ya no irá a tu domicilio.</p>
                    </div>

                    {errorCancelacion && <Aviso tipo="error">{errorCancelacion}</Aviso>}

                    <AreaTexto
                      id="motivo-cancelacion"
                      etiqueta="Motivo (opcional)"
                      rows={2}
                      value={motivoCancelacion}
                      onChange={(e) => setMotivoCancelacion(e.target.value)}
                      placeholder="Por ejemplo: ya se solucionó"
                    />

                    <div className="grid gap-2">
                      <Boton
                        type="button"
                        disabled={cancelando}
                        onClick={() => {
                          setMostrandoConfirmacionCancelar(false)
                          setErrorCancelacion(null)
                        }}
                      >
                        No, mantener la visita
                      </Boton>
                      <Boton type="button" variante="peligro" cargando={cancelando} onClick={manejarConfirmarCancelar}>
                        Sí, cancelar
                      </Boton>
                    </div>
                  </div>
                )}
              </div>
            )
          }
        />
      )}
    </div>
  )
}

/* ─── Presentación ─── */

interface ContenidoProps {
  seguimiento: SeguimientoDatos
  detalle: OrdenDetalle | null
  actualizando: boolean
  actualizar: () => void
  calificar: ReactNode
  calificacion: ReactNode
  cancelar: ReactNode
}

function ContenidoSeguimiento({ seguimiento, detalle, actualizando, actualizar, calificar, calificacion, cancelar }: ContenidoProps): ReactNode {
  const { titular, detalle: explicacion } = mensajeEstado(seguimiento)
  const cancelada = seguimiento.estado === 'CANCELADA'
  const pasoCancelacion = cancelada ? seguimiento.pasos[seguimiento.pasos.length - 1] : null
  const fotosTrabajo = detalle?.fotosTrabajo ?? []
  const hizo = detalle && (detalle.diagnostico || detalle.total != null || detalle.repuestos.length > 0 || fotosTrabajo.length > 0)

  return (
    <div className="grid gap-6">
      {/* Cabecera tipo rastreo: en qué etapa va, en una frase, y las 5 etapas. */}
      <section aria-labelledby="titulo-estado" className="rounded-2xl bg-publico-panel p-5 text-publico-superficie shadow-xl shadow-publico-tinta/15 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="text-sm text-publico-acento-tenue">
            Orden <b className="tabular-nums text-publico-superficie">{seguimiento.codigo}</b>
            {detalle && <> · {detalle.etiquetaEspecialidad}</>}
          </p>
          <button
            type="button"
            onClick={actualizar}
            disabled={actualizando}
            className={`inline-flex min-h-11 items-center gap-2 rounded-lg border border-publico-superficie/25 px-3 text-sm font-bold text-publico-superficie hover:bg-publico-superficie/10 disabled:opacity-70 ${focoOscuro}`}
          >
            <Icono nombre="refrescar" className={`size-4 ${actualizando ? 'motion-safe:animate-spin' : ''}`} />
            {actualizando ? 'Actualizando…' : 'Actualizar'}
          </button>
        </div>

        <h1 id="titulo-estado" className="mt-3 text-[clamp(1.75rem,1.2rem+2vw,2.5rem)] leading-[1.12] font-bold tracking-[-0.03em]">{titular}</h1>
        <p className="mt-2 max-w-2xl text-[1.0625rem] leading-[1.55] text-publico-acento-tenue" aria-live="polite">{explicacion}</p>

        {!cancelada ? (
          <div className="mt-8 border-t border-publico-superficie/15 pt-7">
            <BarraEtapas estado={seguimiento.estado} />
          </div>
        ) : (
          pasoCancelacion && (
            <p className="mt-6 rounded-xl border border-publico-superficie/20 px-4 py-3 text-sm/[1.55] text-publico-acento-tenue">
              Se canceló el {formatearMomento(pasoCancelacion.ocurridoEn)}.{pasoCancelacion.nota && <> {pasoCancelacion.nota}.</>}
            </p>
          )
        )}
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid min-w-0 gap-6">
          {calificar}
          {calificacion}

          {hizo && (
            <Tarjeta aria-labelledby="titulo-trabajo">
              <h2 id="titulo-trabajo" className="text-lg font-bold">Lo que hizo el técnico</h2>
              {detalle.diagnostico && <p className="mt-2 text-sm/[1.55] text-publico-tinta-media first-letter:uppercase">{detalle.diagnostico}</p>}
              {fotosTrabajo.length > 0 && (
                <ul aria-label="Fotos del trabajo" className="mt-4 grid grid-cols-3 gap-2">
                  {fotosTrabajo.map((foto, i) => (
                    <li key={foto}>
                      <a href={foto} target="_blank" rel="noopener noreferrer" className={`block aspect-square overflow-hidden rounded-xl border border-publico-linea bg-publico-superficie-suave ${focoClaro}`}>
                        <img src={foto} alt={`Foto ${i + 1} del trabajo`} className="size-full object-cover" />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
              {(detalle.repuestos.length > 0 || detalle.precioManoObra != null || detalle.total != null) && (
                <dl className="mt-4 grid gap-2 border-t border-publico-linea pt-4 text-sm">
                  {detalle.repuestos.map((r) => (
                    <div key={r.nombre} className="flex justify-between gap-4">
                      <dt className="text-publico-tinta-media">{r.nombre}{r.cantidad > 1 && ` × ${r.cantidad}`}</dt>
                      <dd className="tabular-nums">{soles(r.subtotal)}</dd>
                    </div>
                  ))}
                  {detalle.precioManoObra != null && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-publico-tinta-media">Mano de obra</dt>
                      <dd className="tabular-nums">{soles(detalle.precioManoObra)}</dd>
                    </div>
                  )}
                  {detalle.total != null && (
                    <div className="mt-1 flex justify-between gap-4 border-t border-publico-linea pt-3 text-base font-bold">
                      <dt>Total</dt>
                      <dd className="tabular-nums">{soles(detalle.total)}</dd>
                    </div>
                  )}
                </dl>
              )}
            </Tarjeta>
          )}

          {detalle && (
            <Tarjeta aria-labelledby="titulo-pedido">
              <h2 id="titulo-pedido" className="text-lg font-bold">Lo que pediste</h2>
              <p className="mt-2 text-sm/[1.55] text-publico-tinta-media first-letter:uppercase">{detalle.descripcionFalla}</p>
              {detalle.fotos.length > 0 && (
                <p className="mt-2 text-xs text-publico-tinta-suave">{detalle.fotos.length} {detalle.fotos.length === 1 ? 'foto adjunta' : 'fotos adjuntas'}</p>
              )}
            </Tarjeta>
          )}

          <section aria-labelledby="titulo-historial" className="rounded-2xl border border-publico-linea bg-publico-superficie shadow-lg shadow-publico-tinta/10">
            <details className="group">
              <summary className={`flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3 sm:px-6 [&::-webkit-details-marker]:hidden ${focoClaro}`}>
                <span>
                  <span id="titulo-historial" className="block text-lg font-bold">Historial completo</span>
                  <span className="text-sm text-publico-tinta-suave">{seguimiento.pasos.length} {seguimiento.pasos.length === 1 ? 'movimiento' : 'movimientos'}, con fecha y hora</span>
                </span>
                <Icono nombre="flecha" className="size-5 shrink-0 rotate-90 motion-safe:transition-transform group-open:-rotate-90" />
              </summary>
              <ol className="grid gap-5 border-t border-publico-linea px-4 py-5 sm:px-6">
                {seguimiento.pasos.map((paso, index) => {
                  const esUltimo = index === seguimiento.pasos.length - 1
                  return (
                    <li key={`${paso.estado}-${paso.ocurridoEn}`} className="relative grid grid-cols-[1rem_minmax(0,1fr)] gap-3">
                      {!esUltimo && <span aria-hidden="true" className="absolute top-5 bottom-[-1.25rem] left-[0.4375rem] w-0.5 bg-publico-linea" />}
                      <span aria-hidden="true" className={`relative z-10 mt-1 size-4 rounded-2xl border-2 ${esUltimo ? 'border-publico-acento-hondo bg-publico-acento' : 'border-publico-linea-fuerte bg-publico-superficie'}`} />
                      <div>
                        <p className="flex flex-wrap items-baseline justify-between gap-x-3">
                          <b className="text-sm">{ETIQUETA_PASO[paso.estado]}</b>
                          <span className="text-xs text-publico-tinta-suave">{formatearMomento(paso.ocurridoEn)}</span>
                        </p>
                        <p className="mt-0.5 text-sm/[1.55] text-publico-tinta-media">
                          {paso.nota ?? paso.etiqueta}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ol>
            </details>
          </section>
        </div>

        <aside aria-label="Datos de la visita" className="grid gap-6 lg:sticky lg:top-6">
          <Tarjeta aria-labelledby="titulo-visita">
            <h2 id="titulo-visita" className="text-lg font-bold">Tu visita</h2>
            <dl className="mt-4 grid gap-4 text-sm">
              <Dato icono="calendario" titulo="Día">
                <span className="first-letter:uppercase">{fechaAmigable(seguimiento.fechaProgramada)}</span>
                {['hoy', 'mañana', 'ayer'].includes(fechaAmigable(seguimiento.fechaProgramada)) && <span className="block text-xs font-normal text-publico-tinta-suave">{formatearFecha(seguimiento.fechaProgramada)}</span>}
              </Dato>
              {seguimiento.horaProgramada && <Dato icono="reloj" titulo="Hora">{horaCorta(seguimiento.horaProgramada)}</Dato>}
              <Dato icono="herramienta" titulo="Técnico">{seguimiento.tecnicoNombre ?? 'Por asignar'}</Dato>
              <Dato icono="casa" titulo="Taller">{seguimiento.tallerNombre}</Dato>
              {detalle && (
                <Dato icono="pin" titulo="Dirección">
                  {detalle.direccion}, {detalle.distrito}
                  {detalle.referencia && <span className="block text-xs font-normal text-publico-tinta-suave">{detalle.referencia}</span>}
                </Dato>
              )}
            </dl>
            {cancelar && <div className="mt-5">{cancelar}</div>}
          </Tarjeta>
        </aside>
      </div>
    </div>
  )
}

function Dato({ icono, titulo, children }: { icono: IconoNombre; titulo: string; children: ReactNode }): ReactNode {
  return (
    <div className="grid grid-cols-[2.25rem_minmax(0,1fr)] items-start gap-3">
      <span aria-hidden="true" className="grid size-9 place-items-center rounded-lg bg-publico-superficie-suave text-publico-tinta-media">
        <Icono nombre={icono} className="size-[1.125rem]" />
      </span>
      <div>
        <dt className="text-xs text-publico-tinta-suave">{titulo}</dt>
        <dd className="font-bold">{children}</dd>
      </div>
    </div>
  )
}
