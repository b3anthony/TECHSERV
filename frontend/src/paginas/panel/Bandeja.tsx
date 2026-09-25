import { useEffect, useRef, useState } from 'react'
import type { JSX } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { mensajeDeError } from '../../api/cliente.ts'
import { Icono } from '../../componentes/Icono.tsx'
import { focoAmarillo, focoClaro } from '../../componentes/marco/foco.ts'
import { Paginacion } from '../../componentes/publico/Paginacion.tsx'
import type { EstadoOrden, OrdenResumen } from '../../tipos.ts'
import { fechaAmigable, horaCorta } from '../portal/fechas.ts'
import { diaCorto } from './formato.ts'
import { CabeceraPagina, EsqueletoLista, ErrorCarga, EstadoChip } from './comun.tsx'
import { ESPECIALIDAD_CORTA, ETIQUETA_ADMIN, EXPLICACION_ADMIN, ICONO_ESPECIALIDAD, contenedorPanel } from './formato.ts'
import { iso, useOrdenes, useReporte } from './datos.ts'
import { DialogoAsignacion } from './DialogoAsignacion.tsx'

const POR_PAGINA = 12

/** El orden de las pestañas sigue la vida de una orden. */
const PESTANAS: EstadoOrden[] = ['PENDIENTE', 'ASIGNADA', 'CONFIRMADA', 'EN_CAMINO', 'EN_PROCESO', 'COMPLETADA', 'CALIFICADA', 'CANCELADA']

// Desde el principio: el reporte cuenta las órdenes creadas en el periodo.
const DESDE_SIEMPRE = '2000-01-01'
const HASTA_HOY = iso(new Date())

function esEstado(valor: string | null): valor is EstadoOrden {
  return PESTANAS.includes(valor as EstadoOrden)
}

export function Bandeja(): JSX.Element {
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const crudo = searchParams.get('estado')
  const estadoFiltro: EstadoOrden | '' = esEstado(crudo) ? crudo : ''
  const pagina = Math.max(1, parseInt(searchParams.get('pagina') || '1', 10) || 1)

  const ordenes = useOrdenes(estadoFiltro, pagina - 1, POR_PAGINA)
  const conteo = useReporte(DESDE_SIEMPRE, HASTA_HOY)
  const [asignando, setAsignando] = useState<OrdenResumen | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const titulo = useRef<HTMLHeadingElement>(null)
  const clave = searchParams.toString()
  const claveAnterior = useRef(clave)
  useEffect(() => {
    // Solo al cambiar de filtro o de página, no al llegar a la pantalla.
    if (claveAnterior.current === clave) return
    claveAnterior.current = clave
    titulo.current?.focus({ preventScroll: true })
    titulo.current?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }, [clave])

  function enlace(estado: EstadoOrden | '', n = 1): string {
    const p = new URLSearchParams()
    if (estado) p.set('estado', estado)
    if (n > 1) p.set('pagina', String(n))
    const q = p.toString()
    return q ? `/panel/ordenes?${q}` : '/panel/ordenes'
  }

  const lista = ordenes.data?.content ?? []
  const total = ordenes.data?.totalElements ?? 0
  const totalPaginas = ordenes.data?.totalPages ?? 0
  const porEstado = conteo.data?.ordenesPorEstado

  return (
    <div className={contenedorPanel}>
      <CabeceraPagina titulo="Órdenes" detalle="Todas las visitas que te pidieron. Filtra por etapa y entra a cada una para ver el detalle." />

      <nav aria-label="Filtrar por etapa" className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        <ul className="flex w-max gap-1 rounded-xl border border-publico-linea bg-publico-superficie-suave p-1">
          {(['', ...PESTANAS] as const).map((e) => {
            const activo = e === estadoFiltro
            const n = e === '' ? conteo.data?.ordenesCreadas : porEstado?.[e]
            return (
              <li key={e || 'todas'}>
                <Link
                  to={enlace(e)}
                  aria-current={activo ? 'page' : undefined}
                  className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2.5 text-sm font-bold whitespace-nowrap ${focoClaro} ${
                    activo ? 'bg-publico-superficie text-publico-tinta shadow-sm shadow-publico-tinta/10' : 'text-publico-tinta-media hover:bg-publico-superficie hover:text-publico-tinta'
                  }`}
                >
                  {e === '' ? 'Todas' : ETIQUETA_ADMIN[e]}
                  {n !== undefined && (
                    <span className={`rounded-md px-1.5 text-xs tabular-nums ${e === 'PENDIENTE' && n > 0 ? 'bg-publico-acento text-publico-tinta' : activo ? 'bg-publico-superficie-suave' : 'bg-publico-superficie'}`}>{n}</span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <h2 ref={titulo} tabIndex={-1} className="mt-5 mb-3 scroll-mt-32 text-sm text-publico-tinta-media focus:outline-none lg:scroll-mt-4">
        {ordenes.isPending ? 'Cargando…' : (
          <>
            <b className="text-publico-tinta">{total} {total === 1 ? 'orden' : 'órdenes'}</b>
            {estadoFiltro && <> · {EXPLICACION_ADMIN[estadoFiltro]}</>}
            {totalPaginas > 1 && <> · página {pagina} de {totalPaginas}</>}
          </>
        )}
      </h2>

      {aviso && (
        <p role="status" className="mb-3 flex items-center gap-2 rounded-xl border border-publico-completada/40 bg-publico-superficie px-4 py-3 text-sm font-bold text-publico-completada">
          <Icono nombre="check" className="size-5" /> {aviso}
        </p>
      )}

      {ordenes.isPending ? (
        <EsqueletoLista filas={6} alto="h-16" etiqueta="Cargando órdenes…" />
      ) : ordenes.error ? (
        <ErrorCarga mensaje={mensajeDeError(ordenes.error)} reintentar={() => void ordenes.refetch()} />
      ) : lista.length === 0 ? (
        <div className="grid justify-items-center rounded-2xl border border-dashed border-publico-linea-fuerte bg-publico-superficie px-6 py-12 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-publico-superficie-suave text-publico-tinta-media"><Icono nombre="lista" className="size-6" /></span>
          <p className="mt-3 font-bold">{estadoFiltro ? `No hay órdenes «${ETIQUETA_ADMIN[estadoFiltro].toLowerCase()}»` : 'Todavía no tienes órdenes'}</p>
          <p className="mt-1 max-w-sm text-sm text-publico-tinta-media">{estadoFiltro ? 'Prueba con otra etapa o mira todas.' : 'Cuando un cliente reserve una visita con tu taller, aparecerá aquí.'}</p>
        </div>
      ) : (
        <div className={`motion-safe:transition-opacity ${ordenes.isPlaceholderData ? 'opacity-60' : ''}`} aria-busy={ordenes.isFetching}>
          {/* Móvil: tarjetas */}
          <ul className="grid gap-3 md:hidden">
            {lista.map((o) => (
              <li key={o.id} className="relative rounded-2xl border border-publico-linea bg-publico-superficie p-4 shadow-sm shadow-publico-tinta/5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs text-publico-tinta-suave">{ESPECIALIDAD_CORTA[o.especialidad]} · <span className="tabular-nums">{o.codigo}</span></p>
                  <EstadoChip estado={o.estado} />
                </div>
                <h3 className="mt-1.5 line-clamp-2 leading-snug font-bold first-letter:uppercase">
                  <Link to={`/panel/ordenes/${o.id}`} className="after:absolute after:inset-0 after:rounded-2xl focus:outline-none focus:after:ring-2 focus:after:ring-publico-acento focus:after:ring-offset-2 focus:after:ring-offset-publico-lienzo">
                    {o.descripcionFalla}
                  </Link>
                </h3>
                {o.rechazo && <p className="mt-1.5 flex items-start gap-1.5 text-sm font-bold text-publico-peligro"><Icono nombre="pausa" className="mt-0.5 size-4 shrink-0" />{o.rechazo}</p>}
                <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-publico-tinta-media">
                  <span className="inline-flex items-center gap-1.5 first-letter:uppercase"><Icono nombre="calendario" className="size-4 text-publico-tinta-suave" />{cuando(o)}</span>
                  <span className="inline-flex items-center gap-1.5"><Icono nombre="pin" className="size-4 text-publico-tinta-suave" />{o.distrito}</span>
                  <span>{o.clienteNombre}</span>
                </p>
                <div className="mt-3 flex items-center justify-between gap-3 border-t border-publico-linea pt-3 text-sm">
                  <span className={o.tecnicoNombre ? 'font-bold' : 'text-publico-tinta-suave'}>{o.tecnicoNombre ?? 'Sin técnico'}</span>
                  {o.estado === 'PENDIENTE' && (
                    <button type="button" onClick={() => setAsignando(o)} className={`relative z-10 inline-flex min-h-11 items-center rounded-lg border border-publico-acento bg-publico-acento px-4 font-bold text-publico-tinta hover:bg-publico-acento-hondo ${focoAmarillo}`}>
                      Asignar
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {/* Escritorio: tabla */}
          <div className="hidden overflow-hidden rounded-2xl border border-publico-linea bg-publico-superficie shadow-sm shadow-publico-tinta/5 md:block">
            <table className="w-full table-fixed text-left text-sm">
              <caption className="sr-only">Órdenes{estadoFiltro && ` «${ETIQUETA_ADMIN[estadoFiltro]}»`}, página {pagina}</caption>
              <thead className="border-b border-publico-linea bg-publico-lienzo text-xs text-publico-tinta-suave">
                <tr>
                  <th scope="col" className="w-[7.5rem] px-4 py-3 font-bold">Visita</th>
                  <th scope="col" className="px-4 py-3 font-bold">Orden</th>
                  <th scope="col" className="w-[11rem] px-4 py-3 font-bold lg:w-[13rem]">Cliente</th>
                  <th scope="col" className="hidden w-[10rem] px-4 py-3 font-bold xl:table-cell">Técnico</th>
                  <th scope="col" className="w-[8.5rem] px-4 py-3 font-bold">Etapa</th>
                  <th scope="col" className="w-[8rem] px-4 py-3 text-right font-bold"><span className="sr-only">Acción</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-publico-linea">
                {lista.map((o) => (
                  <tr key={o.id} className="hover:bg-publico-lienzo">
                    <td className="px-4 py-3 align-top">
                      <span className="block font-bold first-letter:uppercase">{diaCorto(o.fechaProgramada)}</span>
                      <span className="text-publico-tinta-suave tabular-nums">{horaCorta(o.horaProgramada)}</span>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className="flex items-center gap-1.5 text-xs text-publico-tinta-suave">
                        <Icono nombre={ICONO_ESPECIALIDAD[o.especialidad]} className="size-3.5" />
                        {ESPECIALIDAD_CORTA[o.especialidad]} · <span className="tabular-nums">{o.codigo}</span>
                      </span>
                      <Link to={`/panel/ordenes/${o.id}`} className={`mt-0.5 line-clamp-1 rounded font-bold first-letter:uppercase hover:underline hover:decoration-publico-acento hover:decoration-2 hover:underline-offset-4 ${focoClaro}`}>
                        {o.descripcionFalla}
                      </Link>
                      {o.rechazo && <span className="mt-1 flex items-start gap-1 text-xs font-bold text-publico-peligro"><Icono nombre="pausa" className="mt-px size-3.5 shrink-0" />{o.rechazo}</span>}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className="block truncate">{o.clienteNombre}</span>
                      <span className="flex items-center gap-1 text-publico-tinta-suave"><Icono nombre="pin" className="size-3.5" />{o.distrito}</span>
                    </td>
                    <td className="hidden px-4 py-3 align-top xl:table-cell">
                      <span className={`block truncate ${o.tecnicoNombre ? '' : 'text-publico-tinta-suave'}`}>{o.tecnicoNombre ?? 'Sin técnico'}</span>
                    </td>
                    <td className="px-4 py-3 align-top"><EstadoChip estado={o.estado} /></td>
                    <td className="px-4 py-3 text-right align-top">
                      {o.estado === 'PENDIENTE' ? (
                        <button type="button" onClick={() => setAsignando(o)} className={`inline-flex min-h-10 items-center rounded-lg border border-publico-acento bg-publico-acento px-3 font-bold text-publico-tinta hover:bg-publico-acento-hondo ${focoAmarillo}`}>
                          Asignar<span className="sr-only"> técnico a {o.codigo}</span>
                        </button>
                      ) : (
                        <Link to={`/panel/ordenes/${o.id}`} className={`inline-flex min-h-10 items-center gap-1 rounded-lg px-3 font-bold text-publico-tinta-media hover:bg-publico-superficie-suave hover:text-publico-tinta ${focoClaro}`}>
                          Ver<span className="sr-only"> {o.codigo}</span> <Icono nombre="flecha" className="size-4" />
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6">
            <Paginacion pagina={pagina} totalPaginas={totalPaginas} enlace={(n) => enlace(estadoFiltro, n)} etiqueta="Páginas de órdenes" />
          </div>
        </div>
      )}

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
    </div>
  )
}

function cuando(o: OrdenResumen): string {
  const dia = fechaAmigable(o.fechaProgramada)
  const texto = o.horaProgramada ? `${dia}, ${horaCorta(o.horaProgramada)}` : dia
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}
