import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { mensajeDeError } from '../../api/cliente.ts'
import { Icono } from '../../componentes/Icono.tsx'
import type { IconoNombre } from '../../componentes/Icono.tsx'
import { focoAmarillo, focoClaro, focoOscuro } from '../../componentes/marco/foco.ts'
import { useSesion } from '../../sesion/SesionProvider.tsx'
import type { OrdenResumen } from '../../tipos.ts'
import { fechaAmigable, horaCorta } from '../portal/fechas.ts'
import { EsqueletoLista, ErrorCarga, TarjetaPanel } from './comun.tsx'
import { ESPECIALIDAD_CORTA, ICONO_ESPECIALIDAD, contenedorPanel, enlaceSuave, iniciales, saludo, soles } from './formato.ts'
import { horas, iso, sumarDias, ultimosMeses, useIndicadores, useOrdenes, useReporte, useSerieIngresos, useTecnicos } from './datos.ts'
import { DialogoAsignacion } from './DialogoAsignacion.tsx'
import { DialogoTecnico } from './DialogoTecnico.tsx'
import { GraficoBarras } from './GraficoBarras.tsx'
import { Estrellas, Ranking } from './PiezasReporte.tsx'

const HOY = new Date()
const PERIODO = { desde: iso(sumarDias(HOY, -29)), hasta: iso(HOY) }
const PERIODO_ANTERIOR = { desde: iso(sumarDias(HOY, -59)), hasta: iso(sumarDias(HOY, -30)) }
const MESES = ultimosMeses(6)

/** "+12 %" frente al periodo anterior; null si no hay con qué comparar. */
function variacion(actual: number, anterior: number): number | null {
  if (anterior <= 0) return null
  return Math.round(((actual - anterior) / anterior) * 100)
}

export function Inicio(): ReactNode {
  const { usuario } = useSesion()
  const queryClient = useQueryClient()
  const indicadores = useIndicadores()
  const pendientes = useOrdenes('PENDIENTE', 0, 5)
  const tecnicos = useTecnicos()
  const reporte = useReporte(PERIODO.desde, PERIODO.hasta)
  const anterior = useReporte(PERIODO_ANTERIOR.desde, PERIODO_ANTERIOR.hasta)
  const meses = useSerieIngresos(MESES)

  const [asignando, setAsignando] = useState<OrdenResumen | null>(null)
  const [nuevoTecnico, setNuevoTecnico] = useState(0)
  const [tecnicoAbierto, setTecnicoAbierto] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  const nombre = usuario?.nombreCompleto.split(' ')[0] ?? ''
  const ingresos = Number(reporte.data?.ingresos ?? 0)
  const cambio = anterior.data ? variacion(ingresos, Number(anterior.data.ingresos)) : null
  const esperan = indicadores.data?.pendientes ?? 0

  return (
    <div className={contenedorPanel}>
      <header className="flex flex-col gap-1 pt-6 pb-5 lg:pt-8">
        <h1 className="text-[clamp(1.75rem,1.2rem+1.8vw,2.5rem)] leading-[1.12] font-bold tracking-[-0.03em]">
          {saludo()}{nombre && `, ${nombre}`}
        </h1>
        <p className="text-base/[1.55] text-publico-tinta-media">
          {indicadores.isPending ? 'Revisando cómo va tu taller…' : esperan > 0 ? (
            <>Tienes <b className="text-publico-tinta">{esperan} {esperan === 1 ? 'orden que espera' : 'órdenes que esperan'} técnico</b>. Empieza por ahí.</>
          ) : 'Todo al día: ninguna orden espera técnico.'}
        </p>
      </header>

      {aviso && (
        <p role="status" className="mb-4 flex items-center gap-2 rounded-xl border border-publico-completada/40 bg-publico-superficie px-4 py-3 text-sm font-bold text-publico-completada">
          <Icono nombre="check" className="size-5" /> {aviso}
        </p>
      )}

      {/* ─── Lo principal: dinero y pulso del día ─── */}
      <section aria-labelledby="titulo-ingresos" className="relative overflow-hidden rounded-2xl bg-publico-panel text-publico-superficie shadow-xl shadow-publico-tinta/20">
        <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-2xl bg-publico-acento/10 blur-3xl" />
        <div className="relative grid gap-8 p-5 sm:p-7 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] xl:gap-10">
          <div className="grid gap-6">
            <div>
              <h2 id="titulo-ingresos" className="flex items-center gap-2 text-sm font-bold text-publico-superficie/70">
                <Icono nombre="moneda" className="size-5 text-publico-acento" /> Ingresos de los últimos 30 días
              </h2>
              {reporte.isPending ? (
                <div aria-hidden="true" className="mt-3 h-14 w-64 rounded-xl bg-publico-superficie/10 motion-safe:animate-pulse" />
              ) : reporte.error ? (
                <p className="mt-3 text-sm text-publico-superficie/80">No se pudieron cargar los ingresos.</p>
              ) : (
                <div className="mt-2 flex flex-wrap items-end gap-x-4 gap-y-2">
                  <p className="text-[clamp(2.5rem,1.8rem+3vw,4rem)] leading-none font-bold tracking-[-0.04em] text-publico-acento tabular-nums">{soles(ingresos)}</p>
                  {cambio !== null && (
                    <p className={`mb-1.5 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-bold ${cambio >= 0 ? 'bg-publico-completada text-publico-superficie' : 'bg-publico-superficie/15 text-publico-superficie'}`}>
                      <span aria-hidden="true">{cambio >= 0 ? '▲' : '▼'}</span>
                      {Math.abs(cambio)} %<span className="font-normal opacity-90"> {cambio >= 0 ? 'más' : 'menos'} que los 30 días anteriores</span>
                    </p>
                  )}
                </div>
              )}
            </div>
            <div>
              <p className="mb-3 text-sm text-publico-superficie/70">Mes a mes</p>
              {meses.serie ? (
                <GraficoBarras serie={meses.serie} tono="oscuro" alto="h-40" etiqueta="Ingresos de los últimos 6 meses" />
              ) : meses.error ? (
                <button type="button" onClick={meses.reintentar} className={`min-h-11 text-sm font-bold text-publico-acento underline underline-offset-4 ${focoOscuro}`}>No se pudo cargar el gráfico. Reintentar</button>
              ) : (
                <div aria-hidden="true" className="h-40 rounded-xl bg-publico-superficie/5 motion-safe:animate-pulse" />
              )}
            </div>
          </div>

          <div className="grid content-start gap-3">
            <h2 className="text-sm font-bold text-publico-superficie/70">Ahora mismo</h2>
            <div className="grid grid-cols-2 gap-3">
              <Contador a="/panel/ordenes?estado=PENDIENTE" valor={indicadores.data?.pendientes} texto="Esperan técnico" icono="campana" resaltar={esperan > 0} />
              <Contador a="/panel/ordenes?estado=ASIGNADA" valor={indicadores.data?.asignadas} texto="Asignadas o confirmadas" icono="herramienta" />
              <Contador a="/panel/ordenes?estado=EN_CAMINO" valor={indicadores.data?.enCamino} texto="En camino o trabajando" icono="auto" />
              <Contador a="/panel/ordenes?estado=COMPLETADA" valor={indicadores.data?.completadasHoy} texto="Terminadas hoy" icono="check" />
            </div>
            <Link to="/panel/reportes" className={`mt-1 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-publico-superficie/25 px-4 text-sm font-bold text-publico-superficie hover:bg-publico-superficie/10 ${focoOscuro}`}>
              Ver reportes completos <Icono nombre="flecha" className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid content-start gap-6">
          {/* ─── Cola: órdenes sin técnico ─── */}
          <TarjetaPanel
            titulo={<>Esperan técnico{pendientes.data && pendientes.data.totalElements > 0 && <span className="rounded-md bg-publico-acento px-1.5 text-sm tabular-nums">{pendientes.data.totalElements}</span>}</>}
            icono="campana"
            accion={<Link to="/panel/ordenes" className={enlaceSuave}>Todas las órdenes</Link>}
          >
            {pendientes.isPending ? (
              <EsqueletoLista filas={2} alto="h-28" etiqueta="Cargando órdenes sin técnico…" />
            ) : pendientes.error ? (
              <ErrorCarga mensaje={mensajeDeError(pendientes.error)} reintentar={() => void pendientes.refetch()} />
            ) : pendientes.data.content.length === 0 ? (
              <div className="grid justify-items-center rounded-xl border border-dashed border-publico-linea-fuerte px-4 py-10 text-center">
                <span className="grid size-12 place-items-center rounded-2xl bg-publico-superficie-suave text-publico-completada"><Icono nombre="check" className="size-6" /></span>
                <p className="mt-3 font-bold">Todo al día</p>
                <p className="mt-1 max-w-xs text-sm text-publico-tinta-media">Cuando un cliente pida una visita, aparecerá aquí y te avisaremos abajo a la derecha.</p>
              </div>
            ) : (
              <ul className="grid gap-3">
                {pendientes.data.content.map((o) => (
                  <li key={o.id}><OrdenEnCola orden={o} alAsignar={() => setAsignando(o)} /></li>
                ))}
              </ul>
            )}
          </TarjetaPanel>

          {/* ─── Mejores técnicos del periodo ─── */}
          {reporte.data && reporte.data.ranking.length > 0 && (
            <TarjetaPanel titulo="Quién generó más en los últimos 30 días" icono="grafico" accion={<Link to="/panel/reportes" className={enlaceSuave}>Ver más</Link>}>
              <Ranking ranking={reporte.data.ranking} />
            </TarjetaPanel>
          )}
        </div>

        {/* ─── Equipo ─── */}
        <div className="grid content-start gap-6">
          <TarjetaPanel titulo="Tu equipo hoy" icono="equipo" accion={<Link to="/panel/equipo" className={enlaceSuave}>Gestionar</Link>}>
            {tecnicos.isPending ? (
              <EsqueletoLista filas={3} alto="h-12" etiqueta="Cargando técnicos…" />
            ) : tecnicos.error ? (
              <ErrorCarga mensaje={mensajeDeError(tecnicos.error)} reintentar={() => void tecnicos.refetch()} />
            ) : (
              <>
                {tecnicos.data.length === 0 ? (
                  <p className="text-sm text-publico-tinta-media">Aún no tienes técnicos. Añade al primero para empezar a asignar visitas.</p>
                ) : (
                  <ul className="grid gap-1">
                    {tecnicos.data.map((t) => (
                      <li key={t.id} className="flex items-center gap-3 rounded-xl px-1 py-2">
                        <span aria-hidden="true" className="relative grid size-10 shrink-0 place-items-center rounded-xl bg-publico-panel text-sm font-bold text-publico-acento">
                          {iniciales(t.nombreCompleto)}
                          <span className={`absolute -right-0.5 -bottom-0.5 size-3 rounded-2xl ring-2 ring-publico-superficie ${t.disponible ? 'bg-publico-completada' : 'bg-publico-linea-fuerte'}`} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold">{t.nombreCompleto}</span>
                          <span className="block text-xs text-publico-tinta-suave">
                            {t.disponible ? 'Disponible' : 'No disponible'} · {t.ordenesHoy === 0 ? 'sin visitas hoy' : `${t.ordenesHoy} ${t.ordenesHoy === 1 ? 'visita' : 'visitas'} hoy`}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  type="button"
                  onClick={() => { setNuevoTecnico((n) => n + 1); setTecnicoAbierto(true) }}
                  className={`mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-publico-linea-fuerte text-sm font-bold text-publico-tinta hover:border-publico-acento-hondo hover:bg-publico-acento-tenue ${focoClaro}`}
                >
                  <Icono nombre="mas" className="size-4" /> Añadir técnico
                </button>
              </>
            )}
          </TarjetaPanel>

          <TarjetaPanel titulo="Lo que dicen tus clientes" icono="estrella">
            {reporte.data ? (
              <div className="grid gap-4">
                <div className="flex items-end gap-3">
                  <p className="text-4xl leading-none font-bold tabular-nums">
                    {reporte.data.calificacionPromedio != null ? reporte.data.calificacionPromedio.toFixed(1) : '—'}
                  </p>
                  <div>
                    <Estrellas valor={reporte.data.calificacionPromedio ?? 0} />
                    <p className="mt-0.5 text-xs text-publico-tinta-suave">de {reporte.data.serviciosCalificados} servicios calificados</p>
                  </div>
                </div>
                <dl className="grid grid-cols-2 gap-3 border-t border-publico-linea pt-4 text-sm">
                  <div>
                    <dt className="text-publico-tinta-suave">Tiempo de atención</dt>
                    <dd className="mt-0.5 text-lg font-bold">{reporte.data.horasMediasDeAtencion != null ? horas(reporte.data.horasMediasDeAtencion) : '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-publico-tinta-suave">Pedidos en 30 días</dt>
                    <dd className="mt-0.5 text-lg font-bold tabular-nums">{reporte.data.ordenesCreadas}</dd>
                  </div>
                </dl>
                <p className="text-xs text-publico-tinta-suave">El tiempo de atención va desde que el cliente pide la visita hasta que el técnico termina.</p>
              </div>
            ) : (
              <EsqueletoLista filas={2} alto="h-12" etiqueta="Cargando calificaciones…" />
            )}
          </TarjetaPanel>
        </div>
      </div>

      {asignando && (
        <DialogoAsignacion
          key={asignando.id}
          ordenId={asignando.id}
          codigoOrden={asignando.codigo}
          especialidadOrden={asignando.especialidad}
          etiquetaEspecialidad={asignando.etiquetaEspecialidad}
          resumen={asignando.descripcionFalla}
          abierto
          alCerrar={() => setAsignando(null)}
          alAsignarExitoso={() => {
            setAviso(`Listo: ${asignando.codigo} ya tiene técnico y le enviamos el correo.`)
            setAsignando(null)
            void queryClient.invalidateQueries({ queryKey: ['panel'] })
          }}
        />
      )}

      <DialogoTecnico key={nuevoTecnico} abierto={tecnicoAbierto} alCerrar={() => setTecnicoAbierto(false)} alGuardar={(n) => setAviso(`${n} ya es parte de tu equipo.`)} />
    </div>
  )
}

function Contador({ a, valor, texto, icono, resaltar = false }: { a: string; valor: number | undefined; texto: string; icono: IconoNombre; resaltar?: boolean }): ReactNode {
  return (
    <Link
      to={a}
      className={`group grid min-h-28 content-between gap-3 rounded-xl p-4 motion-safe:transition-colors ${resaltar ? `bg-publico-acento text-publico-tinta hover:bg-publico-acento-vivo ${focoOscuro}` : `bg-publico-superficie/[0.07] text-publico-superficie hover:bg-publico-superficie/[0.12] ${focoOscuro}`}`}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="text-3xl leading-none font-bold tabular-nums">{valor ?? '–'}</span>
        <Icono nombre={icono} className={`size-5 ${resaltar ? '' : 'text-publico-acento'}`} />
      </span>
      <span className={`text-sm leading-snug ${resaltar ? 'font-bold' : 'text-publico-superficie/75'}`}>{texto}</span>
    </Link>
  )
}

function OrdenEnCola({ orden, alAsignar }: { orden: OrdenResumen; alAsignar: () => void }): ReactNode {
  const dia = fechaAmigable(orden.fechaProgramada)
  const pronto = dia === 'hoy' || dia === 'mañana'
  const atrasada = orden.fechaProgramada != null && orden.fechaProgramada < iso(new Date())
  return (
    <article className={`grid gap-3 rounded-xl border p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center ${pronto ? 'border-publico-acento-hondo bg-publico-acento-tenue/50' : 'border-publico-linea'}`}>
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-publico-tinta-suave">
          <span className="inline-flex items-center gap-1 rounded-md bg-publico-superficie-suave px-1.5 py-0.5 font-bold text-publico-tinta-media">
            <Icono nombre={ICONO_ESPECIALIDAD[orden.especialidad]} className="size-3.5" />{ESPECIALIDAD_CORTA[orden.especialidad]}
          </span>
          <span className="tabular-nums">{orden.codigo}</span>
          {orden.cantidadFotos > 0 && <span>· {orden.cantidadFotos} {orden.cantidadFotos === 1 ? 'foto' : 'fotos'}</span>}
          {atrasada && <span className="rounded-md border border-publico-peligro/40 px-1.5 py-0.5 font-bold text-publico-peligro">La fecha ya pasó: llama al cliente</span>}
          {pronto && <span className="rounded-md bg-publico-panel px-1.5 py-0.5 font-bold text-publico-acento">Es {dia}</span>}
        </p>
        <h3 className="mt-1.5 line-clamp-2 leading-snug font-bold first-letter:uppercase">{orden.descripcionFalla}</h3>
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-publico-tinta-media">
          <span className={`inline-flex items-center gap-1.5 ${pronto ? 'font-bold text-publico-tinta' : ''}`}>
            <Icono nombre="calendario" className="size-4 text-publico-tinta-suave" />
            <span className="first-letter:uppercase">{dia}{orden.horaProgramada && `, ${horaCorta(orden.horaProgramada)}`}</span>
          </span>
          <span className="inline-flex min-w-0 items-center gap-1.5"><Icono nombre="pin" className="size-4 shrink-0 text-publico-tinta-suave" /><span className="truncate">{orden.distrito}</span></span>
          <span className="inline-flex min-w-0 items-center gap-1.5"><span className="truncate">{orden.clienteNombre}</span></span>
        </p>
      </div>
      <div className="flex gap-2 sm:flex-col sm:items-stretch">
        <button type="button" onClick={alAsignar} className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-publico-acento bg-publico-acento px-4 text-sm font-bold text-publico-tinta hover:bg-publico-acento-hondo ${focoAmarillo}`}>
          Asignar técnico
        </button>
        <Link to={`/panel/ordenes/${orden.id}`} aria-label={`Ver el detalle de ${orden.codigo}`} className={`inline-flex min-h-11 flex-1 items-center justify-center rounded-lg border border-publico-linea-fuerte bg-publico-superficie px-4 text-sm font-bold hover:bg-publico-superficie-suave ${focoClaro}`}>
          Ver detalle
        </Link>
      </div>
    </article>
  )
}
