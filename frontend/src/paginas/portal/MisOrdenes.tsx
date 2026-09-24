import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api, mensajeDeError } from '../../api/cliente.ts'
import { Icono } from '../../componentes/Icono.tsx'
import { focoAmarillo, focoClaro } from '../../componentes/marco/foco.ts'
import { Aviso } from '../../componentes/publico/Aviso.tsx'
import { Paginacion } from '../../componentes/publico/Paginacion.tsx'
import type { OrdenResumen } from '../../tipos.ts'
import { MESES_ESPANOL, horaCorta } from './fechas.ts'
import { BarraEtapasMini } from './ordenes/BarraEtapas.tsx'
import { ETIQUETA_ESTADO, GRUPOS, grupoDe, tonoEstado } from './ordenes/etapas.ts'
import type { GrupoOrden } from './ordenes/etapas.ts'

const POR_PAGINA = 6

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

  // Pestaña y página viven en la URL: atrás/adelante y recargar las respetan.
  const [params] = useSearchParams()
  const conteo = useMemo(() => {
    const c: Record<GrupoOrden, number> = { curso: 0, terminadas: 0, canceladas: 0 }
    for (const o of ordenes) c[grupoDe(o.estado)]++
    return c
  }, [ordenes])
  const verParam = params.get('ver')
  const ver: GrupoOrden = GRUPOS.find((g) => g.clave === verParam)?.clave ?? (conteo.curso > 0 ? 'curso' : 'terminadas')
  const filtradas = ordenes.filter((o) => grupoDe(o.estado) === ver)
  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA))
  const pagina = Math.min(Math.max(parseInt(params.get('pagina') ?? '1', 10) || 1, 1), totalPaginas)
  const visibles = filtradas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)
  const enlace = (n: number, grupo: GrupoOrden = ver) => `?ver=${grupo}${n > 1 ? `&pagina=${n}` : ''}`
  const grupo = GRUPOS.find((g) => g.clave === ver)!

  // Al cambiar de pestaña o de página, el foco y la vista van al inicio de la lista.
  const tituloLista = useRef<HTMLHeadingElement>(null)
  const claveUrl = params.toString()
  const claveInicial = useRef(claveUrl)
  useEffect(() => {
    if (claveUrl === claveInicial.current) return
    claveInicial.current = claveUrl
    tituloLista.current?.focus({ preventScroll: true })
    tituloLista.current?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }, [claveUrl])

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-5 py-6 sm:flex-row sm:items-end sm:justify-between lg:pt-10 lg:pb-8">
        <div>
          <p className="text-sm text-publico-tinta-suave">
            <Link to="/" className={`underline decoration-publico-acento underline-offset-4 ${focoClaro}`}>Inicio</Link> / Mis órdenes
          </p>
          <h1 className="mt-2 text-[clamp(2rem,1.3rem+2.5vw,3rem)] leading-[1.12] font-bold tracking-[-0.035em]">Mis órdenes</h1>
          <p className="mt-2.5 max-w-xl text-[1.0625rem] leading-[1.55] text-publico-tinta-media">Aquí ves en qué va cada visita que pediste.</p>
        </div>
        <Link to="/reservar" className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-start rounded-lg border border-publico-acento bg-publico-acento px-5 py-2.5 text-sm font-bold text-publico-tinta hover:bg-publico-acento-hondo motion-safe:transition-colors sm:self-auto ${focoAmarillo}`}>
          Pedir otra visita <Icono nombre="flecha" className="size-4" />
        </Link>
      </header>

      {cargando && (
        <div role="status" className="grid gap-3">
          <span className="sr-only">Cargando tus órdenes…</span>
          {[0, 1, 2].map((i) => (
            <div key={i} aria-hidden="true" className="h-32 rounded-2xl border border-publico-linea bg-publico-superficie motion-safe:animate-pulse" />
          ))}
        </div>
      )}

      {!cargando && error && (
        <Aviso tipo="error">
          {error}{' '}
          <button type="button" onClick={recargar} className={`font-bold underline decoration-publico-acento underline-offset-4 ${focoClaro}`}>Reintentar</button>
        </Aviso>
      )}

      {!cargando && !error && ordenes.length === 0 && (
        <section className="grid justify-items-center rounded-2xl border border-publico-linea bg-publico-superficie px-6 py-12 text-center shadow-lg shadow-publico-tinta/10">
          <span className="grid size-14 place-items-center rounded-2xl bg-publico-acento-tenue text-publico-chip-texto">
            <Icono nombre="herramienta" className="size-7" />
          </span>
          <h2 className="mt-4 text-xl font-bold">Aún no has pedido ninguna visita</h2>
          <p className="mt-1.5 max-w-sm text-sm/[1.55] text-publico-tinta-media">Cuando reserves, verás aquí en qué etapa va tu visita: si ya tiene técnico, si va en camino o si ya terminó.</p>
          <Link to="/reservar" className={`mt-5 inline-flex min-h-11 items-center rounded-lg border border-publico-acento bg-publico-acento px-5 text-sm font-bold text-publico-tinta hover:bg-publico-acento-hondo ${focoAmarillo}`}>Reservar una visita</Link>
        </section>
      )}

      {!cargando && !error && ordenes.length > 0 && (
        <>
          <nav aria-label="Filtrar órdenes" className="grid grid-cols-3 gap-1 rounded-lg border border-publico-linea bg-publico-superficie-suave p-1 sm:inline-grid sm:grid-cols-[repeat(3,auto)]">
            {GRUPOS.map((g) => (
              <Link
                key={g.clave}
                to={enlace(1, g.clave)}
                aria-current={g.clave === ver ? 'true' : undefined}
                className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md px-2 text-sm font-bold sm:px-4 ${g.clave === ver ? 'bg-publico-superficie text-publico-tinta shadow-sm shadow-publico-tinta/10' : 'text-publico-tinta-media hover:bg-publico-superficie hover:text-publico-tinta'} ${focoClaro}`}
              >
                {g.titulo}
                <span className={`rounded-md px-1.5 text-xs tabular-nums ${g.clave === ver ? 'bg-publico-acento text-publico-tinta' : 'bg-publico-superficie text-publico-tinta-media'}`}>{conteo[g.clave]}</span>
              </Link>
            ))}
          </nav>

          <h2 ref={tituloLista} tabIndex={-1} className="mt-6 mb-3 scroll-mt-4 text-sm text-publico-tinta-media focus:outline-none">
            {filtradas.length === 0
              ? grupo.vacio
              : `${grupo.titulo}: ${filtradas.length} ${filtradas.length === 1 ? 'visita' : 'visitas'}${totalPaginas > 1 ? ` · página ${pagina} de ${totalPaginas}` : ''}`}
          </h2>

          {filtradas.length === 0 && ver === 'curso' && (
            <p className="rounded-2xl border border-dashed border-publico-linea-fuerte bg-publico-superficie px-5 py-8 text-center text-sm text-publico-tinta-media">
              ¿Se malogró algo?{' '}
              <Link to="/reservar" className={`font-bold text-publico-tinta underline decoration-publico-acento decoration-2 underline-offset-4 ${focoClaro}`}>Pide una visita</Link>
            </p>
          )}

          <ul className="grid gap-3">
            {visibles.map((orden) => (
              <li key={orden.id}>
                <TarjetaOrden orden={orden} />
              </li>
            ))}
          </ul>

          <div className="mt-6">
            <Paginacion pagina={pagina} totalPaginas={totalPaginas} enlace={(n) => enlace(n)} etiqueta="Páginas de órdenes" />
          </div>
        </>
      )}
    </div>
  )
}

function TarjetaOrden({ orden }: { orden: OrdenResumen }): ReactNode {
  const [anio, mes, dia] = (orden.fechaProgramada ?? '').split('-').map((x) => parseInt(x, 10))
  const otroAnio = anio && anio !== new Date().getFullYear()
  const porCalificar = orden.estado === 'COMPLETADA'
  const cancelada = orden.estado === 'CANCELADA'
  return (
    <article className={`relative grid grid-cols-[3.75rem_minmax(0,1fr)] gap-x-4 gap-y-3 rounded-2xl border bg-publico-superficie p-4 shadow-sm shadow-publico-tinta/5 hover:border-publico-linea-fuerte hover:shadow-md motion-safe:transition-shadow sm:grid-cols-[4.25rem_minmax(0,1fr)_12.5rem] sm:items-center sm:p-5 ${porCalificar ? 'border-publico-acento-hondo' : 'border-publico-linea'}`}>
      <p className={`grid self-start rounded-xl py-2 text-center ${cancelada ? 'bg-publico-superficie-suave text-publico-tinta-suave' : 'bg-publico-panel text-publico-superficie'}`}>
        {dia ? (
          <>
            <b className="text-2xl leading-none tabular-nums">{dia}</b>
            <span className="mt-0.5 text-xs font-bold uppercase">{MESES_ESPANOL[mes - 1]?.slice(0, 3)}</span>
            {otroAnio && <span className="text-xs opacity-80">{anio}</span>}
          </>
        ) : (
          <span className="text-xs">Sin fecha</span>
        )}
      </p>

      <div className="min-w-0">
        <p className="text-xs text-publico-tinta-suave">{orden.etiquetaEspecialidad} · <span className="tabular-nums">{orden.codigo}</span></p>
        <h3 className="mt-1 line-clamp-2 leading-snug font-bold first-letter:uppercase">{orden.descripcionFalla}</h3>
        <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-publico-tinta-media">
          {orden.horaProgramada && (
            <span className="inline-flex items-center gap-1.5"><Icono nombre="reloj" className="size-4 text-publico-tinta-suave" />{horaCorta(orden.horaProgramada)}</span>
          )}
          <span className="inline-flex items-center gap-1.5"><Icono nombre="herramienta" className="size-4 text-publico-tinta-suave" />{orden.tecnicoNombre ?? 'Técnico por asignar'}</span>
          <span className="inline-flex min-w-0 items-center gap-1.5"><Icono nombre="pin" className="size-4 shrink-0 text-publico-tinta-suave" /><span className="truncate">{orden.distrito}</span></span>
        </p>
      </div>

      <div className="col-span-2 grid gap-2.5 border-t border-publico-linea pt-3 sm:col-span-1 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-5">
        <span className={`justify-self-start rounded-lg border px-2 py-0.5 text-xs font-bold ${tonoEstado(orden.estado)}`}>{ETIQUETA_ESTADO[orden.estado]}</span>
        <BarraEtapasMini estado={orden.estado} />
        {/* El enlace cubre toda la tarjeta (after:inset-0); el foco se ve en la tarjeta entera. */}
        <Link
          to={`/mis-ordenes/${orden.id}`}
          className={`inline-flex items-center gap-1.5 text-sm font-bold text-publico-tinta after:absolute after:inset-0 after:rounded-2xl focus:outline-none focus:after:ring-2 focus:after:ring-publico-acento focus:after:ring-offset-2 focus:after:ring-offset-publico-lienzo`}
        >
          {porCalificar ? 'Calificar el servicio' : 'Ver seguimiento'}
          <Icono nombre="flecha" className="size-4" />
          <span className="sr-only">de la orden {orden.codigo}</span>
        </Link>
      </div>
    </article>
  )
}
