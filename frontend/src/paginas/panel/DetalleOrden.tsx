import { useState } from 'react'
import type { JSX, ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api, mensajeDeError } from '../../api/cliente.ts'
import { Icono } from '../../componentes/Icono.tsx'
import type { IconoNombre } from '../../componentes/Icono.tsx'
import { focoAmarillo, focoClaro, focoOscuro } from '../../componentes/marco/foco.ts'
import { Aviso } from '../../componentes/publico/Aviso.tsx'
import type { ActorHistorial, EstadoOrden, OrdenDetalle } from '../../tipos.ts'
import type { DetallePagoRespuesta, MetodoPago } from './tiposPanel.ts'
import { fechaAmigable, formatearFecha, formatearMomento, horaCorta } from '../portal/fechas.ts'
import { EsqueletoLista, TarjetaPanel } from './comun.tsx'
import { ETIQUETA_ADMIN, EXPLICACION_ADMIN, ICONO_ESPECIALIDAD, contenedorPanel, coordenadas, mapaEmbebido, soles } from './formato.ts'
import { iso } from './datos.ts'
import { DialogoAsignacion } from './DialogoAsignacion.tsx'
import { DialogoCierre } from './DialogoCierre.tsx'
import { DialogoPago } from './DialogoPago.tsx'

/** Las etapas que ve el administrador: una por estado real, sin juntar ninguno. */
const ETAPAS: { titulo: string; icono: IconoNombre }[] = [
  { titulo: 'Recibida', icono: 'documento' },
  { titulo: 'Asignada', icono: 'herramienta' },
  { titulo: 'Confirmada', icono: 'correo' },
  { titulo: 'En camino', icono: 'auto' },
  { titulo: 'En proceso', icono: 'casa' },
  { titulo: 'Terminada', icono: 'check' },
]

const ETAPA_DE: Record<EstadoOrden, number> = {
  PENDIENTE: 0,
  ASIGNADA: 1,
  CONFIRMADA: 2,
  EN_CAMINO: 3,
  EN_PROCESO: 4,
  COMPLETADA: 5,
  CALIFICADA: 5,
  CANCELADA: -1,
}

/** Lo que pasó en cada movimiento del historial, en pasado. */
const PASO: Record<EstadoOrden, string> = {
  PENDIENTE: 'Pedido recibido',
  ASIGNADA: 'Técnico asignado',
  CONFIRMADA: 'El técnico confirmó',
  EN_CAMINO: 'Salió hacia el domicilio',
  EN_PROCESO: 'Llegó y empezó el trabajo',
  COMPLETADA: 'Trabajo terminado',
  CALIFICADA: 'El cliente calificó',
  CANCELADA: 'Se canceló',
}

const ACTOR: Record<ActorHistorial, string> = {
  CLIENTE: 'Cliente',
  ADMIN_MYPE: 'Administrador',
  TECNICO: 'Técnico',
  SISTEMA: 'Sistema',
}

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
  const [aviso, setAviso] = useState<string | null>(null)

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
    // El técnico avanza la orden desde su página: el detalle se pone al día solo.
    refetchInterval: 30_000,
  })

  const error = errorObj ? mensajeDeError(errorObj) : null

  // Si ya se cobró, no se vuelve a pedir el pago (el servidor lo rechazaría).
  const pago = useQuery<DetallePagoRespuesta | null>({
    queryKey: ['panel', 'pago', id],
    queryFn: async () => {
      const res = await api.get(`/panel/ordenes/${id}/pago`)
      return res.status === 204 ? null : (res.data as DetallePagoRespuesta)
    },
    enabled: Boolean(id) && orden?.total != null,
    refetchInterval: 30_000,
  })

  // El enlace a la página del técnico, para mandárselo por WhatsApp o si no le llegó el correo.
  const [enlace, setEnlace] = useState<string | null>(null)
  const [pidiendoEnlace, setPidiendoEnlace] = useState(false)
  const [copiado, setCopiado] = useState(false)

  async function pedirEnlace(): Promise<void> {
    setPidiendoEnlace(true)
    setErrorAccion(null)
    setCopiado(false)
    try {
      const res = await api.post<{ url: string }>(`/panel/ordenes/${id}/enlace-tecnico`)
      setEnlace(res.data.url)
    } catch (err) {
      setErrorAccion(mensajeDeError(err))
    } finally {
      setPidiendoEnlace(false)
    }
  }

  async function copiarEnlace(): Promise<void> {
    if (!enlace) return
    try {
      await navigator.clipboard.writeText(enlace)
      setCopiado(true)
    } catch {
      setCopiado(false)
    }
  }

  async function manejarMarcarEnProceso(): Promise<void> {
    if (!orden) return
    setErrorAccion(null)
    setMarcandoEnProceso(true)
    try {
      await api.post(`/panel/ordenes/${orden.id}/en-proceso`)
      await queryClient.invalidateQueries({ queryKey: ['panel', 'orden', id] })
      setAviso('Marcaste que el técnico ya está trabajando en el domicilio.')
    } catch (err) {
      setErrorAccion(mensajeDeError(err))
    } finally {
      setMarcandoEnProceso(false)
    }
  }

  const volver = (
    <Link to="/panel/ordenes" className={`-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-bold text-publico-tinta-media hover:text-publico-tinta ${focoClaro}`}>
      <Icono nombre="flecha" className="size-4 rotate-180" /> Órdenes
    </Link>
  )

  if (cargando) {
    return (
      <div className={`${contenedorPanel} pt-6`}>
        {volver}
        <div aria-hidden="true" className="mt-3 h-64 rounded-2xl bg-publico-panel/90 motion-safe:animate-pulse" />
        <div className="mt-6"><EsqueletoLista filas={3} alto="h-32" etiqueta="Cargando la orden…" /></div>
      </div>
    )
  }

  if (error || !orden) {
    return (
      <div className={`${contenedorPanel} pt-6`}>
        {volver}
        <div className="mt-4 grid justify-items-center rounded-2xl border border-publico-linea bg-publico-superficie px-6 py-12 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-publico-superficie-suave text-publico-tinta-media"><Icono nombre="lupa" className="size-6" /></span>
          <h1 className="mt-3 text-xl font-bold">No encontramos esta orden</h1>
          <p className="mt-1 max-w-sm text-sm text-publico-tinta-media">{error ?? 'No existe o no pertenece a tu taller.'}</p>
          <div className="mt-4 flex gap-2">
            {error && <button type="button" onClick={() => void recargarOrden()} className={`inline-flex min-h-11 items-center rounded-lg border border-publico-linea-fuerte px-4 text-sm font-bold ${focoClaro}`}>Reintentar</button>}
            <Link to="/panel/ordenes" className={`inline-flex min-h-11 items-center rounded-lg border border-publico-acento bg-publico-acento px-4 text-sm font-bold ${focoAmarillo}`}>Ver todas las órdenes</Link>
          </div>
        </div>
      </div>
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
  const pagado = pagoRegistrado || pago.data != null
  const puedeRegistrarPago = orden.total != null && !pagado && pago.isSuccess
  const METODO: Record<MetodoPago, string> = { EFECTIVO: 'en efectivo', YAPE: 'con Yape', PLIN: 'con Plin', TRANSFERENCIA: 'por transferencia' }
  const textoPago = pago.data
    ? `${pago.data.cobradoPor ? `Cobrado por ${pago.data.cobradoPor}` : 'Pagado'} ${METODO[pago.data.metodo]} el ${formatearMomento(pago.data.pagadoEn)}`
    : pagoRegistrado ? 'Pago registrado' : null

  const etapa = ETAPA_DE[orden.estado]
  const tecnico = orden.tecnicoNombre ?? 'El técnico'
  const dia = fechaAmigable(orden.fechaProgramada)
  const cuando = `${['hoy', 'mañana', 'ayer'].includes(dia) ? dia : `el ${dia}`}${orden.horaProgramada ? ` a las ${horaCorta(orden.horaProgramada)}` : ''}`
  const punto = coordenadas(orden.urlMapa)

  const siguiente: { texto: ReactNode; accion?: ReactNode } = (() => {
    const boton = (texto: string, alPulsar: () => void, ocupado = false) => (
      <button type="button" onClick={alPulsar} disabled={ocupado} aria-busy={ocupado || undefined} className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-publico-acento bg-publico-acento px-5 text-sm font-bold text-publico-tinta hover:bg-publico-acento-vivo disabled:cursor-wait disabled:opacity-70 ${focoOscuro}`}>
        {ocupado && <span aria-hidden="true" className="size-4 animate-spin rounded-2xl border-2 border-current border-t-transparent motion-reduce:animate-none" />}
        {texto}
      </button>
    )
    if (puedeAsignar) return { texto: <>Elige qué técnico irá. Le enviaremos un correo con el enlace a su página de la visita.</>, accion: boton('Asignar técnico', () => setDialogoAsignarAbierto(true)) }
    if (orden.estado === 'ASIGNADA') return { texto: <>Esperando que <b>{tecnico}</b> confirme desde su página. No tienes que hacer nada.</> }
    if (orden.estado === 'CONFIRMADA') return { texto: <><b>{tecnico}</b> irá {cuando}. Marcará en su página cuando salga.</> }
    if (puedePasarAEnProceso) return { texto: <><b>{tecnico}</b> va en camino. Si ya llegó y no lo marcó, márcalo tú.</>, accion: boton('Ya llegó: marcar en proceso', () => void manejarMarcarEnProceso(), marcandoEnProceso) }
    if (puedeCerrar) return { texto: <><b>{tecnico}</b> está trabajando y cerrará la orden desde su página. Si prefieres, ciérrala tú.</>, accion: boton('Cerrar la orden', () => setDialogoCierreAbierto(true)) }
    if (puedeRegistrarPago) return { texto: <>El servicio está cerrado por <b>{soles(orden.total)}</b>. El técnico marcará el cobro, o regístralo tú.</>, accion: boton('Registrar pago', () => setDialogoPagoAbierto(true)) }
    if (orden.estado === 'CANCELADA') return { texto: <>Esta visita se canceló. No hay nada pendiente.</> }
    if (orden.total != null && !pagado && !pago.isSuccess) return { texto: <>Revisando si el servicio ya se cobró…</> }
    return { texto: <>Servicio terminado{orden.estado === 'CALIFICADA' ? ' y calificado por el cliente' : ''}. No hay nada pendiente.</> }
  })()

  return (
    <div className={`${contenedorPanel} pt-6`}>
      {volver}

      {/* ─── Cabecera oscura: qué es, en qué va y qué toca ─── */}
      <section aria-labelledby="titulo-orden" className="mt-2 overflow-hidden rounded-2xl bg-publico-panel text-publico-superficie shadow-xl shadow-publico-tinta/20">
        <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-10">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-publico-superficie/70">
              <Icono nombre={ICONO_ESPECIALIDAD[orden.especialidad]} className="size-4 text-publico-acento" />
              {orden.etiquetaEspecialidad}
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{orden.codigo}</span>
              <span aria-hidden="true">·</span>
              pedida el {formatearFecha(orden.creadaEn.slice(0, 10))}
            </p>
            <h1 id="titulo-orden" className="mt-2 text-[clamp(1.5rem,1.1rem+1.6vw,2.25rem)] leading-[1.15] font-bold tracking-[-0.025em] first-letter:uppercase">{orden.descripcionFalla}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-bold ${orden.estado === 'CANCELADA' ? 'bg-publico-superficie/15 text-publico-superficie' : 'bg-publico-acento text-publico-tinta'}`}>
                <span aria-hidden="true" className="size-1.5 rounded-2xl bg-current" />{ETIQUETA_ADMIN[orden.estado]}
              </span>
              <span className="text-sm text-publico-superficie/70">{EXPLICACION_ADMIN[orden.estado]}</span>
            </div>

            {etapa >= 0 ? (
              <ol aria-label={`Etapa ${etapa + 1} de ${ETAPAS.length}: ${ETAPAS[etapa].titulo}`} className="mt-7 grid grid-cols-6">
                {ETAPAS.map((e, i) => {
                  const hecha = i < etapa || (i === etapa && etapa === ETAPAS.length - 1)
                  const ahora = i === etapa && !hecha
                  return (
                    <li key={e.titulo} aria-current={i === etapa ? 'step' : undefined} className="relative flex flex-col items-center text-center">
                      {i > 0 && <span aria-hidden="true" className={`absolute top-[1.0625rem] right-1/2 left-[-50%] h-0.5 sm:top-5 ${i <= etapa ? 'bg-publico-acento' : 'bg-publico-superficie/20'}`} />}
                      <span aria-hidden="true" className={`relative z-10 grid size-9 place-items-center rounded-xl sm:size-10 ${hecha ? 'bg-publico-acento text-publico-tinta' : ahora ? 'bg-publico-panel text-publico-acento ring-2 ring-publico-acento ring-offset-4 ring-offset-publico-panel' : 'border border-publico-superficie/25 bg-publico-panel text-publico-superficie/40'}`}>
                        {ahora && <span className="absolute inset-0 rounded-xl bg-publico-acento/25 motion-safe:animate-ping" />}
                        <Icono nombre={hecha ? 'visto' : e.icono} className="relative size-4 sm:size-5" />
                      </span>
                      <span className={`mt-2 px-0.5 text-xs leading-tight ${i === etapa ? 'font-bold text-publico-superficie' : `max-sm:sr-only ${hecha ? 'text-publico-acento-tenue' : 'text-publico-superficie/55'}`}`}>{e.titulo}</span>
                      <span className="sr-only">{hecha ? ', hecha' : ahora ? ', ahora' : ', pendiente'}</span>
                    </li>
                  )
                })}
              </ol>
            ) : (
              <p className="mt-6 flex items-center gap-2 rounded-xl border border-publico-superficie/15 px-4 py-3 text-sm text-publico-superficie/80">
                <Icono nombre="pausa" className="size-5 shrink-0" /> La orden se canceló. Mira el historial para saber quién y por qué.
              </p>
            )}
          </div>

          <div className="grid content-start gap-3 rounded-xl bg-publico-superficie/[0.07] p-4 sm:p-5">
            <p className="text-xs font-bold tracking-[0.08em] text-publico-acento uppercase">Qué toca ahora</p>
            <p aria-live="polite" className="text-base/[1.5] text-publico-superficie/90">{siguiente.texto}</p>
            {siguiente.accion}
            {textoPago && (
              <p className="flex items-center gap-2 text-sm font-bold text-publico-acento"><Icono nombre="check" className="size-5 shrink-0" /> {textoPago}</p>
            )}
          </div>
        </div>
      </section>

      <div className="mt-4 grid gap-2" aria-live="polite">
        {errorAccion && <Aviso tipo="error">{errorAccion}</Aviso>}
        {aviso && <Aviso tipo="exito">{aviso}</Aviso>}
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid content-start gap-6">
          {/* Dónde */}
          <TarjetaPanel titulo="Dónde es la visita" icono="pin">
            <p className="font-bold">{orden.direccion}</p>
            <p className="mt-0.5 text-sm text-publico-tinta-media">
              {orden.distrito}{orden.referencia && <> · {orden.referencia}</>}
            </p>
            {punto && (
              <div className="mt-4 overflow-hidden rounded-xl border border-publico-linea bg-publico-superficie-suave focus-within:ring-2 focus-within:ring-publico-acento focus-within:ring-offset-2 focus-within:ring-offset-publico-superficie">
                <iframe
                  title={`Mapa de la zona de ${orden.direccion}`}
                  src={mapaEmbebido(punto)}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="block h-60 w-full sm:h-72"
                />
              </div>
            )}
            {orden.urlMapa && (
              <a href={orden.urlMapa} target="_blank" rel="noopener noreferrer" className={`mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg border border-publico-linea-fuerte bg-publico-superficie px-4 text-sm font-bold hover:bg-publico-superficie-suave ${focoClaro}`}>
                <Icono nombre="mapa" className="size-4" /> Abrir en Google Maps<span className="sr-only"> (se abre en otra pestaña)</span>
              </a>
            )}
          </TarjetaPanel>

          {/* Qué pidió */}
          <TarjetaPanel titulo="Lo que contó el cliente" icono="documento">
            <blockquote className="rounded-xl border-l-4 border-publico-acento bg-publico-lienzo px-4 py-3 text-base/[1.55] first-letter:uppercase">{orden.descripcionFalla}</blockquote>
            {orden.fotos && orden.fotos.length > 0 && (
              <>
                <h3 className="mt-5 mb-2 text-sm font-bold">Fotos que envió ({orden.fotos.length})</h3>
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {orden.fotos.map((foto, idx) => (
                    <li key={foto}>
                      <a href={foto} target="_blank" rel="noopener noreferrer" className={`group block aspect-[4/3] overflow-hidden rounded-xl border border-publico-linea bg-publico-superficie-suave ${focoClaro}`}>
                        <img src={foto} alt={`Foto ${idx + 1} de la falla, ${orden.codigo}`} className="size-full object-cover motion-safe:transition-transform group-hover:scale-105" />
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </TarjetaPanel>

          {/* Lo que subió el técnico */}
          {orden.fotosTrabajo && orden.fotosTrabajo.length > 0 && (
            <TarjetaPanel titulo={`Fotos del trabajo (${orden.fotosTrabajo.length})`} icono="camara">
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {orden.fotosTrabajo.map((foto, idx) => (
                  <li key={foto}>
                    <a href={foto} target="_blank" rel="noopener noreferrer" className={`group block aspect-[4/3] overflow-hidden rounded-xl border border-publico-linea bg-publico-superficie-suave ${focoClaro}`}>
                      <img src={foto} alt={`Foto ${idx + 1} del trabajo, ${orden.codigo}`} className="size-full object-cover motion-safe:transition-transform group-hover:scale-105" />
                    </a>
                  </li>
                ))}
              </ul>
            </TarjetaPanel>
          )}

          {/* Liquidación */}
          {orden.total != null && (
            <TarjetaPanel titulo="Lo que se cobró" icono="moneda">
              {orden.diagnostico && (
                <div className="mb-4">
                  <h3 className="text-sm font-bold">Diagnóstico del técnico</h3>
                  <p className="mt-1 text-base/[1.55] text-publico-tinta-media first-letter:uppercase">{orden.diagnostico}</p>
                </div>
              )}
              <table className="w-full text-sm">
                <caption className="sr-only">Detalle del cobro</caption>
                <thead className="text-xs text-publico-tinta-suave">
                  <tr className="border-b border-publico-linea">
                    <th scope="col" className="py-2 text-left font-bold">Concepto</th>
                    <th scope="col" className="w-14 py-2 text-center font-bold">Cant.</th>
                    <th scope="col" className="w-28 py-2 text-right font-bold">Importe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-publico-linea">
                  <tr>
                    <td className="py-2.5">Mano de obra</td>
                    <td className="py-2.5 text-center tabular-nums">1</td>
                    <td className="py-2.5 text-right tabular-nums">{soles(orden.precioManoObra)}</td>
                  </tr>
                  {orden.repuestos?.map((rep, idx) => (
                    <tr key={idx}>
                      <td className="py-2.5">{rep.nombre}<span className="block text-xs text-publico-tinta-suave">{soles(rep.precioUnitario)} c/u</span></td>
                      <td className="py-2.5 text-center tabular-nums">{rep.cantidad}</td>
                      <td className="py-2.5 text-right tabular-nums">{soles(rep.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-publico-tinta">
                    <th scope="row" colSpan={2} className="pt-3 text-left text-base font-bold">Total</th>
                    <td className="pt-3 text-right text-xl font-bold tabular-nums">{soles(orden.total)}</td>
                  </tr>
                </tfoot>
              </table>
              {textoPago ? (
                <p className="mt-4 flex items-center gap-2 rounded-lg bg-publico-lienzo px-3 py-2 text-sm font-bold text-publico-completada"><Icono nombre="check" className="size-4 shrink-0" /> {textoPago}</p>
              ) : puedeRegistrarPago && (
                <p className="mt-4 rounded-lg bg-publico-acento-tenue px-3 py-2 text-sm text-publico-chip-texto">Todavía no registraste el pago de este servicio.</p>
              )}
            </TarjetaPanel>
          )}

          {/* Historial */}
          <TarjetaPanel titulo="Historial" icono="reloj">
            {historialOrdenado.length === 0 ? (
              <p className="text-sm text-publico-tinta-media">Todavía no hay movimientos.</p>
            ) : (
              <ol className="grid">
                {historialOrdenado.map((paso, idx) => {
                  const ultimo = idx === historialOrdenado.length - 1
                  return (
                    <li key={idx} className="relative grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-3 pb-5 last:pb-0">
                      {!ultimo && <span aria-hidden="true" className="absolute top-6 bottom-0 left-[0.6875rem] w-0.5 bg-publico-linea" />}
                      <span aria-hidden="true" className={`relative z-10 mt-0.5 grid size-6 place-items-center rounded-2xl ${ultimo ? 'bg-publico-acento text-publico-tinta' : 'bg-publico-superficie-suave text-publico-tinta-media'}`}>
                        <Icono nombre="visto" className="size-3" />
                      </span>
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-baseline justify-between gap-x-3">
                          <span className="font-bold">{PASO[paso.estado]}</span>
                          <time dateTime={paso.ocurridoEn} className="text-xs text-publico-tinta-suave tabular-nums">{formatearMomento(paso.ocurridoEn)}</time>
                        </p>
                        <p className="mt-0.5 text-sm text-publico-tinta-media">
                          <span className="font-bold text-publico-tinta-suave">{ACTOR[paso.actor]}</span>
                          {paso.nota && <> · {paso.nota}</>}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
          </TarjetaPanel>
        </div>

        {/* ─── Columna lateral: personas y cita ─── */}
        <aside className="grid content-start gap-6 lg:sticky lg:top-6 lg:self-start">
          <TarjetaPanel titulo="Cliente" icono="equipo">
            <p className="text-lg font-bold">{orden.clienteNombre}</p>
            {orden.clienteTelefono && (
              <a href={`tel:${orden.clienteTelefono}`} className={`mt-3 flex min-h-11 items-center justify-center gap-2 rounded-lg border border-publico-linea-fuerte bg-publico-superficie px-4 text-sm font-bold hover:bg-publico-superficie-suave ${focoClaro}`}>
                <Icono nombre="telefono" className="size-4" /> Llamar al {orden.clienteTelefono}
              </a>
            )}
          </TarjetaPanel>

          <TarjetaPanel titulo="La visita" icono="calendario">
            <dl className="grid gap-3 text-sm">
              <Fila titulo="Día"><span className="block first-letter:uppercase">{dia}</span>{orden.estado === 'PENDIENTE' && orden.fechaProgramada != null && orden.fechaProgramada < iso(new Date()) && <span className="mt-0.5 block text-xs text-publico-peligro">La fecha ya pasó: coordina otra con el cliente</span>}{['hoy', 'mañana', 'ayer'].includes(dia) && orden.fechaProgramada && <span className="block text-xs font-normal text-publico-tinta-suave">{formatearFecha(orden.fechaProgramada)}</span>}</Fila>
              <Fila titulo="Hora">{orden.horaProgramada ? horaCorta(orden.horaProgramada) : 'Por confirmar'}</Fila>
              <Fila titulo="Técnico">
                {orden.tecnicoNombre ?? <span className="font-normal text-publico-tinta-suave">Sin asignar</span>}
              </Fila>
              <Fila titulo="Etapa">{ETIQUETA_ADMIN[orden.estado]}</Fila>
            </dl>
            {orden.tecnicoNombre && orden.estado !== 'CANCELADA' && (
              <div className="mt-4 border-t border-publico-linea pt-4">
                {enlace ? (
                  <div className="grid gap-2">
                    <label htmlFor="enlace-tecnico" className="text-xs font-bold text-publico-tinta-suave">Enlace de {orden.tecnicoNombre}</label>
                    <input id="enlace-tecnico" readOnly value={enlace} onFocus={(e) => e.currentTarget.select()} className={`min-h-11 w-full truncate rounded-lg border border-publico-linea-fuerte bg-publico-lienzo px-3 text-xs ${focoClaro}`} />
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => void copiarEnlace()} className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-publico-linea-fuerte bg-publico-superficie text-sm font-bold hover:bg-publico-superficie-suave ${focoClaro}`}>
                        <Icono nombre={copiado ? 'visto' : 'documento'} className="size-4" /> {copiado ? 'Copiado' : 'Copiar'}
                      </button>
                      <a href={enlace} target="_blank" rel="noopener noreferrer" className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-publico-linea-fuerte bg-publico-superficie text-sm font-bold hover:bg-publico-superficie-suave ${focoClaro}`}>
                        Abrir<span className="sr-only"> la página del técnico (se abre en otra pestaña)</span>
                      </a>
                    </div>
                    <p aria-live="polite" className="text-xs text-publico-tinta-suave">{copiado ? 'Listo para pegar en WhatsApp.' : 'Mándaselo si no le llegó el correo.'}</p>
                  </div>
                ) : (
                  <button type="button" onClick={() => void pedirEnlace()} disabled={pidiendoEnlace} aria-busy={pidiendoEnlace || undefined} className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-publico-linea-fuerte bg-publico-superficie text-sm font-bold hover:bg-publico-superficie-suave disabled:opacity-60 ${focoClaro}`}>
                    <Icono nombre="correo" className="size-4" /> Enlace para el técnico
                  </button>
                )}
              </div>
            )}
            {puedeAsignar && (
              <button type="button" onClick={() => setDialogoAsignarAbierto(true)} className={`mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-publico-linea-fuerte text-sm font-bold hover:border-publico-acento-hondo hover:bg-publico-acento-tenue ${focoClaro}`}>
                <Icono nombre="mas" className="size-4" /> Asignar técnico
              </button>
            )}
          </TarjetaPanel>
        </aside>
      </div>

      {/* Modales */}
      {puedeAsignar && (
        <DialogoAsignacion
          ordenId={orden.id}
          codigoOrden={orden.codigo}
          especialidadOrden={orden.especialidad}
          etiquetaEspecialidad={orden.etiquetaEspecialidad}
          resumen={orden.descripcionFalla}
          abierto={dialogoAsignarAbierto}
          alCerrar={() => setDialogoAsignarAbierto(false)}
          alAsignarExitoso={() => {
            setDialogoAsignarAbierto(false)
            setAviso('Técnico asignado. Le enviamos un correo con el enlace a su página de la visita.')
            void queryClient.invalidateQueries({ queryKey: ['panel'] })
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
            setAviso('Orden cerrada. Ya puedes registrar el pago.')
            void queryClient.invalidateQueries({ queryKey: ['panel'] })
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
            setAviso('Pago registrado. Ya cuenta en tus ingresos.')
            void queryClient.invalidateQueries({ queryKey: ['panel'] })
          }}
        />
      )}
    </div>
  )
}

function Fila({ titulo, children }: { titulo: string; children: ReactNode }): ReactNode {
  return (
    <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-2">
      <dt className="text-publico-tinta-suave">{titulo}</dt>
      <dd className="font-bold">{children}</dd>
    </div>
  )
}
