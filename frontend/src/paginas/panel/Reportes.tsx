import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { mensajeDeError } from '../../api/cliente.ts'
import { Icono } from '../../componentes/Icono.tsx'
import type { IconoNombre } from '../../componentes/Icono.tsx'
import { focoClaro } from '../../componentes/marco/foco.ts'
import { Boton } from '../../componentes/publico/Boton.tsx'
import type { EstadoOrden } from '../../tipos.ts'
import { CabeceraPagina, EsqueletoLista, ErrorCarga, TarjetaPanel } from './comun.tsx'
import { ETIQUETA_ADMIN, contenedorPanel, soles } from './formato.ts'
import { desdeIso, diasEntre, fechaCorta, horas, iso, sumarDias, tramosDe, useReporte, useSerieIngresos } from './datos.ts'
import { GraficoBarras } from './GraficoBarras.tsx'
import { Estrellas, Ranking } from './PiezasReporte.tsx'

type Clave = '7' | '30' | '90' | 'anio' | 'rango'

const PERIODOS: { clave: Exclude<Clave, 'rango'>; texto: string }[] = [
  { clave: '7', texto: '7 días' },
  { clave: '30', texto: '30 días' },
  { clave: '90', texto: '3 meses' },
  { clave: 'anio', texto: 'Este año' },
]

const ORDEN_ESTADOS: EstadoOrden[] = ['PENDIENTE', 'ASIGNADA', 'CONFIRMADA', 'EN_CAMINO', 'EN_PROCESO', 'COMPLETADA', 'CALIFICADA', 'CANCELADA']

function rangoDe(clave: Clave, desdeUrl: string | null, hastaUrl: string | null): { desde: string; hasta: string } {
  const hoy = new Date()
  if (clave === 'rango' && desdeUrl && hastaUrl && /^\d{4}-\d{2}-\d{2}$/.test(desdeUrl) && /^\d{4}-\d{2}-\d{2}$/.test(hastaUrl) && desdeUrl <= hastaUrl) {
    return { desde: desdeUrl, hasta: hastaUrl }
  }
  if (clave === 'anio') return { desde: `${hoy.getFullYear()}-01-01`, hasta: iso(hoy) }
  const dias = clave === '7' ? 7 : clave === '90' ? 90 : 30
  return { desde: iso(sumarDias(hoy, -(dias - 1))), hasta: iso(hoy) }
}

function fechaLarga(texto: string): string {
  const f = desdeIso(texto)
  return `${fechaCorta(texto)} ${f.getFullYear()}`
}

export function Reportes(): ReactNode {
  const [params, setParams] = useSearchParams()
  const crudo = params.get('periodo')
  const clave: Clave = crudo === '7' || crudo === '90' || crudo === 'anio' || crudo === 'rango' ? crudo : '30'
  const { desde, hasta } = rangoDe(clave, params.get('desde'), params.get('hasta'))
  const dias = diasEntre(desde, hasta)
  const anterior = { desde: iso(sumarDias(desdeIso(desde), -dias)), hasta: iso(sumarDias(desdeIso(desde), -1)) }

  const reporte = useReporte(desde, hasta)
  const previo = useReporte(anterior.desde, anterior.hasta)
  const tramos = tramosDe(desde, hasta)
  const serie = useSerieIngresos(tramos)

  const [rangoDesde, setRangoDesde] = useState(desde)
  const [rangoHasta, setRangoHasta] = useState(hasta)
  const [errorRango, setErrorRango] = useState<string | null>(null)
  const [verRango, setVerRango] = useState(clave === 'rango')

  function aplicarRango(ev: FormEvent): void {
    ev.preventDefault()
    if (!rangoDesde || !rangoHasta) return setErrorRango('Elige las dos fechas')
    if (rangoDesde > rangoHasta) return setErrorRango('La fecha de inicio va antes que la de fin')
    setErrorRango(null)
    setParams({ periodo: 'rango', desde: rangoDesde, hasta: rangoHasta })
  }

  const d = reporte.data
  const ingresos = Number(d?.ingresos ?? 0)
  const ingresosPrevios = previo.data ? Number(previo.data.ingresos) : null
  const cambio = ingresosPrevios && ingresosPrevios > 0 ? Math.round(((ingresos - ingresosPrevios) / ingresosPrevios) * 100) : null
  const canceladas = d?.ordenesPorEstado.CANCELADA ?? 0
  const terminadas = (d?.ordenesPorEstado.COMPLETADA ?? 0) + (d?.ordenesPorEstado.CALIFICADA ?? 0)
  const maxEstado = Math.max(1, ...ORDEN_ESTADOS.map((e) => d?.ordenesPorEstado[e] ?? 0))
  const agrupado = dias <= 14 ? 'por día' : dias <= 92 ? 'por semana' : 'por mes'

  return (
    <div className={contenedorPanel}>
      <CabeceraPagina titulo="Reportes" detalle={<>Cómo le fue a tu taller del <b className="text-publico-tinta">{fechaLarga(desde)}</b> al <b className="text-publico-tinta">{fechaLarga(hasta)}</b>.</>} />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <nav aria-label="Periodo del reporte" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <ul className="flex w-max gap-1 rounded-xl border border-publico-linea bg-publico-superficie-suave p-1">
            {PERIODOS.map((p) => (
              <li key={p.clave}>
                <Link
                  to={p.clave === '30' ? '/panel/reportes' : `/panel/reportes?periodo=${p.clave}`}
                  onClick={() => setVerRango(false)}
                  aria-current={clave === p.clave ? 'page' : undefined}
                  className={`inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-bold whitespace-nowrap sm:px-4 ${focoClaro} ${clave === p.clave ? 'bg-publico-superficie shadow-sm shadow-publico-tinta/10' : 'text-publico-tinta-media hover:bg-publico-superficie hover:text-publico-tinta'}`}
                >
                  {p.texto}
                </Link>
              </li>
            ))}
            <li>
              <button
                type="button"
                aria-expanded={verRango}
                aria-controls="rango-personalizado"
                onClick={() => setVerRango((v) => !v)}
                className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-bold whitespace-nowrap sm:px-4 ${focoClaro} ${clave === 'rango' ? 'bg-publico-superficie shadow-sm shadow-publico-tinta/10' : 'text-publico-tinta-media hover:bg-publico-superficie hover:text-publico-tinta'}`}
              >
                <Icono nombre="calendario" className="size-4" /> Elegir fechas
              </button>
            </li>
          </ul>
        </nav>

        {verRango && (
          <form id="rango-personalizado" onSubmit={aplicarRango} noValidate className="flex flex-wrap items-end gap-2 rounded-xl border border-publico-linea bg-publico-superficie p-3">
            <div className="grid gap-1">
              <label htmlFor="rango-desde" className="text-xs font-bold">Desde</label>
              <input id="rango-desde" type="date" value={rangoDesde} max={iso(new Date())} onChange={(e) => setRangoDesde(e.target.value)} className={`min-h-11 rounded-lg border border-publico-linea-fuerte px-2 ${focoClaro}`} />
            </div>
            <div className="grid gap-1">
              <label htmlFor="rango-hasta" className="text-xs font-bold">Hasta</label>
              <input id="rango-hasta" type="date" value={rangoHasta} max={iso(new Date())} onChange={(e) => setRangoHasta(e.target.value)} className={`min-h-11 rounded-lg border border-publico-linea-fuerte px-2 ${focoClaro}`} />
            </div>
            <Boton type="submit">Ver</Boton>
            <p role="alert" className="w-full text-xs font-bold text-publico-peligro empty:hidden">{errorRango ?? ''}</p>
          </form>
        )}
      </div>

      {reporte.error ? (
        <div className="mt-6"><ErrorCarga mensaje={mensajeDeError(reporte.error)} reintentar={() => void reporte.refetch()} /></div>
      ) : !d ? (
        <div className="mt-6"><EsqueletoLista filas={3} alto="h-40" etiqueta="Preparando el reporte…" /></div>
      ) : (
        <div className={`mt-6 grid gap-6 motion-safe:transition-opacity ${reporte.isPlaceholderData ? 'opacity-60' : ''}`} aria-busy={reporte.isFetching}>
          <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Cifra icono="moneda" titulo="Ingresos" valor={soles(ingresos)} oscura
              detalle={cambio === null ? 'Sin datos del periodo anterior para comparar' : `${cambio >= 0 ? '▲' : '▼'} ${Math.abs(cambio)} % frente a los ${dias} días anteriores`} />
            <Cifra icono="lista" titulo="Pedidos recibidos" valor={String(d.ordenesCreadas)} detalle={`${terminadas} terminados · ${canceladas} ${canceladas === 1 ? 'cancelado' : 'cancelados'}`} />
            <Cifra icono="reloj" titulo="Tiempo de atención" valor={d.horasMediasDeAtencion != null ? horas(d.horasMediasDeAtencion) : '—'} detalle="Promedio desde el pedido hasta que el técnico termina" />
            <Cifra icono="estrella" titulo="Calificación" valor={d.calificacionPromedio != null ? `${d.calificacionPromedio.toFixed(1)} de 5` : '—'} detalle={`Promedio histórico de ${d.serviciosCalificados} servicios`}>
              <Estrellas valor={d.calificacionPromedio ?? 0} />
            </Cifra>
          </ul>

          <TarjetaPanel titulo={`Ingresos ${agrupado}`} icono="grafico">
            {serie.serie ? (
              <GraficoBarras serie={serie.serie} alto="h-56" etiqueta={`Ingresos ${agrupado} entre el ${fechaLarga(desde)} y el ${fechaLarga(hasta)}`} />
            ) : serie.error ? (
              <ErrorCarga mensaje="No se pudo dibujar el gráfico." reintentar={serie.reintentar} />
            ) : (
              <div aria-hidden="true" className="h-56 rounded-xl bg-publico-superficie-suave motion-safe:animate-pulse" />
            )}
            {tramos.length > 0 && tramos[0].desde !== desde && (
              <p className="mt-3 text-xs text-publico-tinta-suave">El gráfico muestra los últimos 12 meses del periodo; el total de arriba cuenta el periodo completo.</p>
            )}
          </TarjetaPanel>

          <div className="grid gap-6 lg:grid-cols-2">
            <TarjetaPanel titulo="Pedidos del periodo, según en qué van" icono="lista">
              {d.ordenesCreadas === 0 ? (
                <p className="text-sm text-publico-tinta-media">No entraron pedidos en estas fechas.</p>
              ) : (
                <ul className="grid gap-2.5">
                  {ORDEN_ESTADOS.map((e) => {
                    const n = d.ordenesPorEstado[e] ?? 0
                    return (
                      <li key={e} className="grid grid-cols-[7.5rem_minmax(0,1fr)_2.5rem] items-center gap-3 text-sm">
                        <Link to={`/panel/ordenes?estado=${e}`} className={`rounded font-bold hover:underline hover:decoration-publico-acento hover:decoration-2 hover:underline-offset-4 ${focoClaro}`}>{ETIQUETA_ADMIN[e]}</Link>
                        <span aria-hidden="true" className="h-3 overflow-hidden rounded-2xl bg-publico-superficie-suave">
                          <span style={{ width: `${(n / maxEstado) * 100}%` }} className={`block h-full origin-left rounded-2xl motion-safe:animate-[panel-crecer-x_0.7s_ease-out] ${e === 'CANCELADA' ? 'bg-publico-linea-fuerte' : e === 'CALIFICADA' || e === 'COMPLETADA' ? 'bg-publico-completada' : e === 'PENDIENTE' ? 'bg-publico-acento-hondo' : 'bg-publico-panel/70'}`} />
                        </span>
                        <span className="text-right font-bold tabular-nums">{n}</span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </TarjetaPanel>

            <TarjetaPanel titulo="Ingresos por técnico" icono="equipo">
              {d.ranking.length === 0 ? (
                <p className="text-sm text-publico-tinta-media">Ningún técnico terminó servicios cobrados en estas fechas.</p>
              ) : (
                <Ranking ranking={d.ranking} />
              )}
            </TarjetaPanel>
          </div>
        </div>
      )}
    </div>
  )
}

function Cifra({ icono, titulo, valor, detalle, oscura = false, children }: { icono: IconoNombre; titulo: string; valor: string; detalle: string; oscura?: boolean; children?: ReactNode }): ReactNode {
  return (
    <li className={`grid content-start gap-1 rounded-2xl border p-4 sm:p-5 ${oscura ? 'col-span-2 border-publico-panel bg-publico-panel text-publico-superficie lg:col-span-1' : 'border-publico-linea bg-publico-superficie shadow-sm shadow-publico-tinta/5'}`}>
      <p className={`flex items-center gap-2 text-sm font-bold ${oscura ? 'text-publico-superficie/70' : 'text-publico-tinta-media'}`}>
        <Icono nombre={icono} className={`size-4 ${oscura ? 'text-publico-acento' : ''}`} />{titulo}
      </p>
      <p className={`text-[clamp(1.5rem,1.2rem+1vw,2rem)] leading-tight font-bold tracking-[-0.02em] tabular-nums ${oscura ? 'text-publico-acento' : ''}`}>{valor}</p>
      {children}
      <p className={`text-xs ${oscura ? 'text-publico-superficie/70' : 'text-publico-tinta-suave'}`}>{detalle}</p>
    </li>
  )
}
