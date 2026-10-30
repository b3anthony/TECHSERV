import { useCallback, useEffect, useRef, useState } from 'react'
import type { JSX } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { mensajeDeError } from '../../api/cliente.ts'
import { Icono } from '../../componentes/Icono.tsx'
import { focoClaro } from '../../componentes/marco/foco.ts'
import { Paginacion } from '../../componentes/publico/Paginacion.tsx'
import type { EstadoOrden, OrdenResumen } from '../../tipos.ts'
import { CabeceraPagina, EsqueletoLista, ErrorCarga } from './comun.tsx'
import { ETIQUETA_ADMIN, EXPLICACION_ADMIN, TONO_ESTADO, contenedorPanel } from './formato.ts'
import { useConteosOrdenes, useOrdenes, useTecnicos } from './datos.ts'
import { DialogoAsignacion } from './DialogoAsignacion.tsx'
import { BarraFiltros } from './bandeja/BarraFiltros.tsx'
import { ListaOrdenes } from './bandeja/ListaOrdenes.tsx'
import { PESTANAS, escribirVista, filtrosDe, hayFiltros, leerVista } from './bandeja/filtros.ts'
import type { VistaBandeja } from './bandeja/filtros.ts'

const POR_PAGINA = 12

export function Bandeja(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const vista = leerVista(searchParams)
  const filtros = filtrosDe(vista)

  const ordenes = useOrdenes(vista.estado, vista.pagina - 1, POR_PAGINA, filtros)
  const conteos = useConteosOrdenes(filtros)
  const tecnicos = useTecnicos()
  const [asignando, setAsignando] = useState<OrdenResumen | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  /** Cambia la vista sobre la URL ACTUAL (no sobre la de este render): el buscador llama con retraso. */
  const cambiar = useCallback((cambios: Partial<VistaBandeja>, reemplazar = false) => {
    setSearchParams((actual) => escribirVista({ ...leerVista(actual), ...cambios }), { replace: reemplazar })
  }, [setSearchParams])

  function enlace(cambios: Partial<VistaBandeja>): string {
    const q = escribirVista({ ...vista, ...cambios }).toString()
    return q ? `/panel/ordenes?${q}` : '/panel/ordenes'
  }

  // Al pasar de página, el foco y la vista vuelven arriba de la lista. Solo
  // entonces: si saltara con cada filtro, se lo quitaría al buscador.
  const titulo = useRef<HTMLHeadingElement>(null)
  const paginaAnterior = useRef(vista.pagina)
  useEffect(() => {
    if (paginaAnterior.current === vista.pagina) return
    paginaAnterior.current = vista.pagina
    titulo.current?.focus({ preventScroll: true })
    titulo.current?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }, [vista.pagina])

  const lista = ordenes.data?.content ?? []
  const total = ordenes.data?.totalElements ?? 0
  const totalPaginas = ordenes.data?.totalPages ?? 0
  const filtrando = hayFiltros(vista)
  const buscado = vista.q.trim()

  return (
    <div className={contenedorPanel}>
      <CabeceraPagina titulo="Órdenes" detalle="Todas las visitas que te pidieron. Busca, filtra por etapa o por técnico, y entra a cada una para ver el detalle." />

      <BarraFiltros vista={vista} tecnicos={tecnicos.data ?? []} cambiar={cambiar} />

      {/* ─── Etapas ─── */}
      <nav aria-label="Filtrar por etapa" className="-mx-4 mt-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:overflow-visible sm:px-0">
        <ul className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
          {(['', ...PESTANAS] as const).map((e) => {
            const activo = e === vista.estado
            const n = e === '' ? conteos.data?.total : conteos.data?.porEstado[e]
            const llama = e === 'PENDIENTE' && (n ?? 0) > 0
            return (
              <li key={e || 'todas'}>
                <Link
                  to={enlace({ estado: e, pagina: 1 })}
                  aria-current={activo ? 'page' : undefined}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 text-sm font-bold whitespace-nowrap motion-safe:transition-colors ${focoClaro} ${
                    activo
                      ? 'border-publico-tinta bg-publico-panel text-publico-superficie shadow-sm shadow-publico-tinta/20'
                      : 'border-publico-linea bg-publico-superficie text-publico-tinta-media hover:border-publico-linea-fuerte hover:text-publico-tinta'
                  }`}
                >
                  {e !== '' && <span aria-hidden="true" className={`size-2 rounded-2xl ${TONO_ESTADO[e].punto} ${activo && e === 'PENDIENTE' ? 'ring-1 ring-publico-superficie' : ''}`} />}
                  {e === '' ? 'Todas' : ETIQUETA_ADMIN[e]}
                  {n !== undefined && (
                    <span className={`min-w-6 rounded-lg px-1.5 py-0.5 text-center text-xs tabular-nums ${
                      llama ? 'bg-publico-acento text-publico-tinta' : activo ? 'bg-publico-superficie/15 text-publico-superficie' : 'bg-publico-superficie-suave text-publico-tinta-media'
                    }`}>{n}</span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <h2 ref={titulo} tabIndex={-1} className="mt-5 mb-3 scroll-mt-32 text-sm text-publico-tinta-media focus:outline-none lg:scroll-mt-4">
        <span aria-live="polite">
          {ordenes.isPending ? 'Cargando…' : (
            <>
              <b className="text-publico-tinta">{total} {total === 1 ? 'orden' : 'órdenes'}</b>
              {buscado && <> {total === 1 ? 'coincide' : 'coinciden'} con «{buscado}»</>}
              {vista.estado && <> · {EXPLICACION_ADMIN[vista.estado]}</>}
              {totalPaginas > 1 && <> · página {vista.pagina} de {totalPaginas}</>}
            </>
          )}
        </span>
      </h2>

      {aviso && (
        <p role="status" className="mb-3 flex items-center gap-2 rounded-xl border border-publico-completada/40 bg-publico-superficie px-4 py-3 text-sm font-bold text-publico-completada">
          <Icono nombre="check" className="size-5" /> {aviso}
        </p>
      )}

      {ordenes.isPending ? (
        <EsqueletoLista filas={6} alto="h-20" etiqueta="Cargando órdenes…" />
      ) : ordenes.error ? (
        <ErrorCarga mensaje={mensajeDeError(ordenes.error)} reintentar={() => void ordenes.refetch()} />
      ) : lista.length === 0 ? (
        <Vacio vista={vista} filtrando={filtrando} limpiar={() => cambiar({ q: '', tecnico: '', cuando: '', desde: '', hasta: '', pagina: 1 })} />
      ) : (
        <div className={`motion-safe:transition-opacity ${ordenes.isPlaceholderData ? 'opacity-60' : ''}`} aria-busy={ordenes.isFetching}>
          <ListaOrdenes
            ordenes={lista}
            buscado={buscado}
            descripcion={`Órdenes${vista.estado ? ` «${ETIQUETA_ADMIN[vista.estado]}»` : ''}${buscado ? ` que coinciden con «${buscado}»` : ''}, página ${vista.pagina}`}
            alAsignar={setAsignando}
            etiquetas={(o) => o.tipo === 'GARANTIA' && (
              <span className="inline-flex items-center gap-1 rounded-md border border-publico-acento-hondo/40 bg-publico-acento-tenue px-1.5 py-0.5 text-xs font-bold text-publico-chip-texto">
                <Icono nombre="check" className="size-3.5" /> Garantía
              </span>
            )}
          />
          <div className="mt-6">
            <Paginacion pagina={vista.pagina} totalPaginas={totalPaginas} enlace={(n) => enlace({ pagina: n })} etiqueta="Páginas de órdenes" />
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

function Vacio({ vista, filtrando, limpiar }: { vista: VistaBandeja; filtrando: boolean; limpiar: () => void }): JSX.Element {
  const etapa: EstadoOrden | '' = vista.estado
  const buscado = vista.q.trim()
  const titulo = buscado
    ? `No hay órdenes que coincidan con «${buscado}»`
    : filtrando ? 'Ninguna orden cumple esos filtros'
    : etapa ? `No hay órdenes «${ETIQUETA_ADMIN[etapa].toLowerCase()}»`
    : 'Todavía no tienes órdenes'
  const detalle = filtrando
    ? 'Revisa lo escrito o quita algún filtro. Puedes buscar por código (ORD-0154 o solo 154), cliente, distrito o la falla.'
    : etapa ? 'Prueba con otra etapa o mira todas.'
    : 'Cuando un cliente reserve una visita con tu taller, aparecerá aquí.'
  return (
    <div className="grid justify-items-center rounded-2xl border border-dashed border-publico-linea-fuerte bg-publico-superficie px-6 py-12 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-publico-acento-tenue text-publico-chip-texto"><Icono nombre={filtrando ? 'lupa' : 'lista'} className="size-7" /></span>
      <p className="mt-4 text-lg font-bold">{titulo}</p>
      <p className="mt-1 max-w-md text-sm text-publico-tinta-media">{detalle}</p>
      {filtrando && (
        <button type="button" onClick={limpiar} className={`mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-publico-linea-fuerte bg-publico-superficie px-4 font-bold hover:bg-publico-superficie-suave ${focoClaro}`}>
          <Icono nombre="refrescar" className="size-4" /> Limpiar filtros
        </button>
      )}
    </div>
  )
}
