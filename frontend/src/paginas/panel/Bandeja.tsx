import type { JSX } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api, mensajeDeError } from '../../api/cliente.ts'
import { AvisoError } from '../../componentes/AvisoError.tsx'
import { Boton } from '../../componentes/Boton.tsx'
import { Cargando } from '../../componentes/Cargando.tsx'
import { EstadoOrdenEtiqueta } from '../../componentes/EstadoOrdenEtiqueta.tsx'
import { Vacio } from '../../componentes/Vacio.tsx'
import type { OrdenResumen } from '../../tipos.ts'
import type { IndicadoresPanel, RespuestaPaginada } from './tiposPanel.ts'

interface PestanaEstado {
  etiqueta: string
  valor: string
}

const PESTANAS: PestanaEstado[] = [
  { etiqueta: 'Todas', valor: '' },
  { etiqueta: 'Pendientes', valor: 'PENDIENTE' },
  { etiqueta: 'Asignadas', valor: 'ASIGNADA' },
  { etiqueta: 'En camino', valor: 'EN_CAMINO' },
  { etiqueta: 'Completadas', valor: 'COMPLETADA' },
]

export function Bandeja(): JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams()

  const estadoFiltro = searchParams.get('estado') || ''
  const pagina = parseInt(searchParams.get('pagina') || '0', 10)

  // Indicadores
  const {
    data: indicadores,
    isLoading: cargandoIndicadores,
    error: errorIndicadoresObj,
    refetch: recargarIndicadores,
  } = useQuery<IndicadoresPanel>({
    queryKey: ['panel', 'indicadores'],
    queryFn: async () => {
      const res = await api.get('/panel/indicadores')
      return res.data as IndicadoresPanel
    },
  })

  const errorIndicadores = errorIndicadoresObj
    ? mensajeDeError(errorIndicadoresObj)
    : null

  // Órdenes
  const {
    data: ordenesPaginadas,
    isLoading: cargandoOrdenes,
    error: errorOrdenesObj,
    refetch: recargarOrdenes,
  } = useQuery<RespuestaPaginada<OrdenResumen>>({
    queryKey: ['panel', 'ordenes', estadoFiltro, pagina],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        pagina,
        tamano: 10,
      }
      if (estadoFiltro) {
        params.estado = estadoFiltro
      }
      const res = await api.get('/panel/ordenes', { params })
      return res.data as RespuestaPaginada<OrdenResumen>
    },
  })

  const errorOrdenes = errorOrdenesObj ? mensajeDeError(errorOrdenesObj) : null

  function cambiarEstado(nuevoEstado: string): void {
    const nuevosParams = new URLSearchParams()
    if (nuevoEstado) {
      nuevosParams.set('estado', nuevoEstado)
    }
    nuevosParams.set('pagina', '0')
    setSearchParams(nuevosParams)
  }

  function irAPagina(nuevaPagina: number): void {
    const nuevosParams = new URLSearchParams(searchParams)
    nuevosParams.set('pagina', String(nuevaPagina))
    setSearchParams(nuevosParams)
  }

  const totalPaginas = ordenesPaginadas?.totalPages || 0
  const totalElementos = ordenesPaginadas?.totalElements || 0
  const ordenes = ordenesPaginadas?.content || []

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      {/* Título de la página */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-tinta">Bandeja de órdenes</h1>
        <p className="mt-1 text-sm text-tinta-suave">
          Gestión de solicitudes de servicio técnico y asignación de técnicos del taller.
        </p>
      </div>

      {/* 4 Indicadores arriba */}
      <section
        aria-label="Indicadores del día"
        aria-busy={cargandoIndicadores}
        className="mb-8"
      >
        {cargandoIndicadores ? (
          <Cargando />
        ) : errorIndicadores ? (
          <AvisoError
            mensaje="No se pudieron cargar los indicadores del día."
            reintentar={() => void recargarIndicadores()}
          />
        ) : indicadores ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {/* Pendientes */}
            <button
              type="button"
              onClick={() => cambiarEstado('PENDIENTE')}
              aria-label={`Ver órdenes pendientes: ${indicadores.pendientes}`}
              className={`flex flex-col items-start rounded-2xl border p-4 text-left transition-colors motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-accion focus:ring-offset-2 focus:ring-offset-lienzo ${
                estadoFiltro === 'PENDIENTE'
                  ? 'border-accion bg-accion-tenue'
                  : 'border-linea bg-superficie hover:border-linea-fuerte'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-pendiente" aria-hidden="true" />
                <span className="text-xs font-semibold text-tinta-media">Pendientes</span>
              </div>
              <span className="mt-2 text-2xl font-bold text-tinta">
                {indicadores.pendientes}
              </span>
            </button>

            {/* Asignadas */}
            <button
              type="button"
              onClick={() => cambiarEstado('ASIGNADA')}
              aria-label={`Ver órdenes asignadas: ${indicadores.asignadas}`}
              className={`flex flex-col items-start rounded-2xl border p-4 text-left transition-colors motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-accion focus:ring-offset-2 focus:ring-offset-lienzo ${
                estadoFiltro === 'ASIGNADA'
                  ? 'border-accion bg-accion-tenue'
                  : 'border-linea bg-superficie hover:border-linea-fuerte'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-asignada" aria-hidden="true" />
                <span className="text-xs font-semibold text-tinta-media">Asignadas</span>
              </div>
              <span className="mt-2 text-2xl font-bold text-tinta">
                {indicadores.asignadas}
              </span>
            </button>

            {/* En camino */}
            <button
              type="button"
              onClick={() => cambiarEstado('EN_CAMINO')}
              aria-label={`Ver órdenes en camino: ${indicadores.enCamino}`}
              className={`flex flex-col items-start rounded-2xl border p-4 text-left transition-colors motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-accion focus:ring-offset-2 focus:ring-offset-lienzo ${
                estadoFiltro === 'EN_CAMINO'
                  ? 'border-accion bg-accion-tenue'
                  : 'border-linea bg-superficie hover:border-linea-fuerte'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-camino" aria-hidden="true" />
                <span className="text-xs font-semibold text-tinta-media">En camino</span>
              </div>
              <span className="mt-2 text-2xl font-bold text-tinta">
                {indicadores.enCamino}
              </span>
            </button>

            {/* Completadas hoy */}
            <button
              type="button"
              onClick={() => cambiarEstado('COMPLETADA')}
              aria-label={`Ver órdenes completadas hoy: ${indicadores.completadasHoy}`}
              className={`flex flex-col items-start rounded-2xl border p-4 text-left transition-colors motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-accion focus:ring-offset-2 focus:ring-offset-lienzo ${
                estadoFiltro === 'COMPLETADA'
                  ? 'border-accion bg-accion-tenue'
                  : 'border-linea bg-superficie hover:border-linea-fuerte'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-completada" aria-hidden="true" />
                <span className="text-xs font-semibold text-tinta-media">Completadas hoy</span>
              </div>
              <span className="mt-2 text-2xl font-bold text-tinta">
                {indicadores.completadasHoy}
              </span>
            </button>
          </div>
        ) : null}
      </section>

      {/* Pestañas de filtro por estado */}
      <section aria-label="Filtro de órdenes" className="mb-6 border-b border-linea">
        <div className="flex items-center gap-2 overflow-x-auto pb-px sm:flex-wrap" role="tablist" aria-label="Estados de órdenes">
          {PESTANAS.map((tab) => {
            const esActivo = estadoFiltro === tab.valor
            return (
              <button
                key={tab.valor}
                type="button"
                role="tab"
                aria-selected={esActivo}
                onClick={() => cambiarEstado(tab.valor)}
                className={`shrink-0 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors motion-reduce:transition-none focus:outline-none focus:ring-2 focus:ring-accion focus:ring-offset-2 focus:ring-offset-lienzo min-h-[44px] inline-flex items-center ${
                  esActivo
                    ? 'border-accion text-accion'
                    : 'border-transparent text-tinta-suave hover:border-linea-fuerte hover:text-tinta'
                }`}
              >
                {tab.etiqueta}
              </button>
            )
          })}
        </div>
      </section>

      {/* Contenido de la bandeja */}
      {cargandoOrdenes ? (
        <Cargando />
      ) : errorOrdenes ? (
        <AvisoError mensaje={errorOrdenes} reintentar={() => void recargarOrdenes()} />
      ) : ordenes.length === 0 ? (
        <Vacio
          titulo="No hay órdenes"
          detalle={
            estadoFiltro
              ? 'No se encontraron órdenes con el estado seleccionado.'
              : 'No hay órdenes registradas en tu taller.'
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-linea bg-superficie shadow-sm">
          {/* Vista móvil: tarjetas apiladas */}
          <div className="divide-y divide-linea sm:hidden">
            {ordenes.map((orden) => (
              <article key={orden.id} className="p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <Link
                    to={`/panel/ordenes/${orden.id}`}
                    className="font-mono text-base font-bold text-accion hover:underline focus:outline-none focus:ring-2 focus:ring-accion focus:ring-offset-2 focus:ring-offset-superficie rounded min-h-[44px] inline-flex items-center"
                  >
                    {orden.codigo}
                  </Link>
                  <EstadoOrdenEtiqueta
                    estado={orden.estado}
                    etiqueta={orden.etiquetaEstado}
                  />
                </div>

                <div className="text-sm">
                  <div className="font-semibold text-tinta">{orden.clienteNombre}</div>
                  <div className="text-xs text-tinta-suave">{orden.distrito}</div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-tinta-media">
                  <span className="rounded-md border border-linea bg-superficie-suave px-2 py-0.5 font-medium">
                    {orden.etiquetaEspecialidad}
                  </span>
                  <span>
                    {orden.fechaProgramada || '—'}{' '}
                    {orden.horaProgramada ? orden.horaProgramada.substring(0, 5) : ''}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-linea/60">
                  <div className="text-xs">
                    <span className="text-tinta-suave">Técnico: </span>
                    {orden.tecnicoNombre ? (
                      <span className="font-semibold text-tinta">{orden.tecnicoNombre}</span>
                    ) : (
                      <span className="italic text-tinta-suave">Sin asignar</span>
                    )}
                  </div>

                  <Link
                    to={`/panel/ordenes/${orden.id}`}
                    className="inline-flex min-h-[44px] items-center gap-1.5 px-3 py-2 font-semibold text-xs text-accion hover:underline focus:outline-none focus:ring-2 focus:ring-accion focus:ring-offset-2 focus:ring-offset-superficie rounded-lg"
                  >
                    {orden.estado === 'PENDIENTE' ? 'Asignar técnico' : 'Ver detalle'}
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </Link>
                </div>
              </article>
            ))}
          </div>

          {/* Vista escritorio: tabla con desplazamiento horizontal interno */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs text-tinta">
              <thead className="border-b border-linea bg-superficie-suave font-bold text-tinta-media">
                <tr>
                  <th scope="col" className="px-4 py-3">Código</th>
                  <th scope="col" className="px-4 py-3">Cliente</th>
                  <th scope="col" className="px-4 py-3">Especialidad</th>
                  <th scope="col" className="px-4 py-3">Fecha y hora</th>
                  <th scope="col" className="px-4 py-3">Técnico</th>
                  <th scope="col" className="px-4 py-3">Estado</th>
                  <th scope="col" className="px-4 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-linea">
                {ordenes.map((orden) => (
                  <tr
                    key={orden.id}
                    className="hover:bg-superficie-suave transition-colors motion-reduce:transition-none"
                  >
                    <td className="px-4 py-3 font-bold">
                      <Link
                        to={`/panel/ordenes/${orden.id}`}
                        className="text-accion hover:underline focus:outline-none focus:ring-2 focus:ring-accion focus:ring-offset-2 focus:ring-offset-superficie rounded"
                      >
                        {orden.codigo}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-tinta">{orden.clienteNombre}</div>
                      <div className="text-micro text-tinta-suave">{orden.distrito}</div>
                    </td>
                    <td className="px-4 py-3 text-tinta-media">
                      {orden.etiquetaEspecialidad}
                    </td>
                    <td className="px-4 py-3 text-tinta-media">
                      <div>{orden.fechaProgramada || '—'}</div>
                      <div className="text-micro text-tinta-suave">
                        {orden.horaProgramada ? orden.horaProgramada.substring(0, 5) : ''}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {orden.tecnicoNombre ? (
                        <span className="font-semibold text-tinta">{orden.tecnicoNombre}</span>
                      ) : (
                        <span className="italic text-tinta-suave">Sin asignar</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <EstadoOrdenEtiqueta
                        estado={orden.estado}
                        etiqueta={orden.etiquetaEstado}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/panel/ordenes/${orden.id}`}
                        className="inline-flex min-h-[36px] items-center gap-1 font-semibold text-accion hover:underline focus:outline-none focus:ring-2 focus:ring-accion focus:ring-offset-2 focus:ring-offset-superficie rounded px-2 py-1"
                      >
                        {orden.estado === 'PENDIENTE' ? 'Asignar técnico' : 'Ver detalle'}
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-linea px-4 py-3">
            <span className="text-xs text-tinta-suave text-center sm:text-left">
              Página <span className="font-semibold text-tinta">{pagina + 1}</span> de{' '}
              <span className="font-semibold text-tinta">{totalPaginas || 1}</span> ({totalElementos}{' '}
              {totalElementos === 1 ? 'orden' : 'órdenes'})
            </span>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-end">
              <Boton
                type="button"
                variante="secundario"
                disabled={pagina <= 0 || cargandoOrdenes}
                onClick={() => irAPagina(pagina - 1)}
                className="flex-1 sm:flex-none min-h-[44px]"
              >
                Anterior
              </Boton>
              <Boton
                type="button"
                variante="secundario"
                disabled={pagina >= totalPaginas - 1 || cargandoOrdenes}
                onClick={() => irAPagina(pagina + 1)}
                className="flex-1 sm:flex-none min-h-[44px]"
              >
                Siguiente
              </Boton>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
