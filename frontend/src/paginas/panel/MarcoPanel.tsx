import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Icono, SpriteIconos } from '../../componentes/Icono.tsx'
import type { IconoNombre } from '../../componentes/Icono.tsx'
import { focoClaro, focoOscuro } from '../../componentes/marco/foco.ts'
import { useSesion } from '../../sesion/SesionProvider.tsx'
import { MESES_ESPANOL } from '../portal/fechas.ts'
import { useIndicadores } from './datos.ts'

interface Seccion {
  a: string
  texto: string
  icono: IconoNombre
  fin?: boolean
}

const SECCIONES: Seccion[] = [
  { a: '/panel', texto: 'Inicio', icono: 'casa', fin: true },
  { a: '/panel/ordenes', texto: 'Órdenes', icono: 'lista' },
  { a: '/panel/equipo', texto: 'Equipo', icono: 'equipo' },
  { a: '/panel/precios', texto: 'Precios', icono: 'etiqueta' },
  { a: '/panel/reportes', texto: 'Reportes', icono: 'grafico' },
  { a: '/panel/ajustes', texto: 'Ajustes', icono: 'engranaje' },
]

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

function hoyLargo(): string {
  const h = new Date()
  const texto = `${DIAS[h.getDay()]} ${h.getDate()} de ${MESES_ESPANOL[h.getMonth()]}`
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

function Logo({ razonSocial }: { razonSocial: string | null }): ReactNode {
  return (
    <Link to="/panel" aria-label="TechServ, inicio del panel" className={`flex min-h-11 min-w-0 items-center gap-2.5 rounded-lg ${focoOscuro}`}>
      <svg className="size-8 shrink-0 text-publico-superficie" viewBox="0 0 28 28" aria-hidden="true"><rect width="28" height="28" rx="7" fill="currentColor" /><path d="M9 10.5h10M14 10.5v9" className="stroke-publico-acento-hondo" strokeWidth="2.6" strokeLinecap="round" /></svg>
      <span className="min-w-0">
        <span className="block text-lg leading-tight font-bold tracking-[-0.01em]">TechServ</span>
        {razonSocial && <span className="block truncate text-xs text-publico-superficie/60">{razonSocial}</span>}
      </span>
    </Link>
  )
}

function Campana({ pendientes, oscura }: { pendientes: number | undefined; oscura: boolean }): ReactNode {
  const hay = (pendientes ?? 0) > 0
  const texto = pendientes === undefined ? 'Órdenes sin técnico' : hay ? `${pendientes} ${pendientes === 1 ? 'orden espera' : 'órdenes esperan'} técnico` : 'Ninguna orden espera técnico'
  return (
    <Link
      to="/panel/ordenes?estado=PENDIENTE"
      aria-label={texto}
      title={texto}
      className={`relative inline-grid size-11 shrink-0 place-items-center rounded-lg ${oscura ? `text-publico-superficie hover:bg-publico-superficie/10 ${focoOscuro}` : `border border-publico-linea bg-publico-superficie text-publico-tinta hover:bg-publico-superficie-suave ${focoClaro}`}`}
    >
      <Icono nombre="campana" className="size-5" />
      {hay && (
        <span aria-hidden="true" className="absolute -top-1 -right-1 grid min-w-5 place-items-center rounded-2xl bg-publico-acento px-1 text-xs leading-5 font-bold text-publico-tinta ring-2 ring-publico-panel">
          {pendientes}
        </span>
      )}
    </Link>
  )
}

function Navegacion({ pendientes, horizontal }: { pendientes: number | undefined; horizontal: boolean }): ReactNode {
  return (
    <nav aria-label="Secciones del panel">
      <ul className={horizontal ? 'flex gap-1 overflow-x-auto px-4 pb-2 sm:px-6' : 'grid gap-1'}>
        {SECCIONES.map((s) => (
          <li key={s.a} className="shrink-0">
            <NavLink
              to={s.a}
              end={s.fin}
              className={({ isActive }) =>
                `group flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-bold motion-safe:transition-colors ${focoOscuro} ${
                  isActive ? 'bg-publico-acento text-publico-tinta' : 'text-publico-superficie/75 hover:bg-publico-superficie/10 hover:text-publico-superficie'
                }`
              }
            >
              <Icono nombre={s.icono} className="size-5 shrink-0" />
              {s.texto}
              {s.a === '/panel/ordenes' && (pendientes ?? 0) > 0 && (
                <span className="ml-auto rounded-md bg-publico-superficie px-1.5 text-xs leading-5 text-publico-tinta tabular-nums group-aria-[current=page]:bg-publico-panel group-aria-[current=page]:text-publico-superficie">
                  {pendientes}
                  <span className="sr-only"> sin técnico</span>
                </span>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/**
 * El marco del administrador: barra lateral oscura en escritorio, cabecera con
 * pestañas en el móvil. Pregunta cada 30 s si hay órdenes nuevas; cuando las
 * hay, avisa abajo a la derecha, pone el número en la campana y en el título
 * de la pestaña del navegador.
 */
export function MarcoPanel(): ReactNode {
  const { usuario, salir } = useSesion()
  const queryClient = useQueryClient()
  const { data: indicadores } = useIndicadores()
  const pendientes = indicadores?.pendientes

  // Guardar el valor anterior en estado y compararlo durante el render es la
  // forma que React recomienda para reaccionar a un cambio de datos.
  const [anterior, setAnterior] = useState<number | undefined>(undefined)
  const [nuevas, setNuevas] = useState(0)
  if (pendientes !== undefined && pendientes !== anterior) {
    setAnterior(pendientes)
    if (anterior !== undefined && pendientes > anterior) setNuevas((n) => n + pendientes - anterior)
  }

  useEffect(() => {
    if (nuevas > 0) void queryClient.invalidateQueries({ queryKey: ['panel', 'ordenes'] })
  }, [nuevas, queryClient])

  useEffect(() => {
    const original = document.title
    document.title = pendientes ? `(${pendientes}) Panel · TechServ` : 'Panel · TechServ'
    return () => {
      document.title = original
    }
  }, [pendientes])

  const nombre = usuario?.nombreCompleto ?? ''
  const razonSocial = usuario?.razonSocial ?? null

  return (
    <div className="min-h-screen bg-publico-lienzo font-publico text-publico-tinta lg:grid lg:grid-cols-[15.5rem_minmax(0,1fr)]">
      <SpriteIconos />

      {/* Escritorio: barra lateral fija */}
      <aside className="hidden bg-publico-panel text-publico-superficie lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:gap-8 lg:px-4 lg:py-5">
        <div className="px-1"><Logo razonSocial={razonSocial} /></div>
        <Navegacion pendientes={pendientes} horizontal={false} />
        <div className="mt-auto grid gap-1 border-t border-publico-superficie/15 pt-4">
          <p className="truncate px-3 text-sm font-bold" title={nombre}>{nombre}</p>
          <p className="px-3 pb-2 text-xs text-publico-superficie/60">Administrador</p>
          <Link to="/" className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-publico-superficie/75 hover:bg-publico-superficie/10 hover:text-publico-superficie ${focoOscuro}`}>
            <Icono nombre="flecha" className="size-5 rotate-180" /> Ver la web de clientes
          </Link>
          <button type="button" onClick={salir} className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-left text-sm text-publico-superficie/75 hover:bg-publico-superficie/10 hover:text-publico-superficie ${focoOscuro}`}>
            <Icono nombre="salir" className="size-5" /> Salir
          </button>
        </div>
      </aside>

      {/* Móvil y tableta: cabecera con pestañas */}
      <header className="sticky top-0 z-30 bg-publico-panel text-publico-superficie lg:hidden">
        <div className="flex min-h-16 items-center justify-between gap-3 px-4 sm:px-6">
          <Logo razonSocial={razonSocial} />
          <div className="flex items-center gap-1">
            <Campana pendientes={pendientes} oscura />
            <button type="button" onClick={salir} className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-2.5 text-sm text-publico-superficie/80 hover:bg-publico-superficie/10 ${focoOscuro}`}>
              <Icono nombre="salir" className="size-5" /><span className="max-sm:sr-only">Salir</span>
            </button>
          </div>
        </div>
        <Navegacion pendientes={pendientes} horizontal />
      </header>

      <div className="min-w-0">
        <div className="hidden items-center justify-between gap-4 border-b border-publico-linea bg-publico-superficie/70 px-8 py-3 lg:flex">
          <p className="text-sm text-publico-tinta-media">
            <span className="font-bold text-publico-tinta">{hoyLargo()}</span>
            <span aria-hidden="true" className="mx-2 text-publico-linea-fuerte">·</span>
            Las órdenes nuevas aparecen solas, sin recargar
          </p>
          <Campana pendientes={pendientes} oscura={false} />
        </div>
        <main id="contenido" className="pb-16">
          <Outlet />
        </main>
      </div>

      <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-4 z-40 flex justify-end sm:inset-x-auto sm:right-6 sm:bottom-6">
        {nuevas > 0 && (
          <div className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-publico-acento bg-publico-panel p-4 text-publico-superficie shadow-2xl shadow-publico-tinta/40 motion-safe:animate-[panel-aviso_0.3s_ease-out]">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-publico-acento text-publico-tinta">
              <Icono nombre="campana" className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-bold">{nuevas === 1 ? 'Llegó una orden nueva' : `Llegaron ${nuevas} órdenes nuevas`}</p>
              <p className="mt-0.5 text-sm text-publico-superficie/70">Esperan que les asignes un técnico.</p>
              <Link to="/panel/ordenes?estado=PENDIENTE" onClick={() => setNuevas(0)} className={`mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg text-sm font-bold text-publico-acento underline underline-offset-4 ${focoOscuro}`}>
                Ver y asignar <Icono nombre="flecha" className="size-4" />
              </Link>
            </div>
            <button type="button" onClick={() => setNuevas(0)} aria-label="Cerrar aviso" className={`-mt-1 -mr-1 inline-grid size-11 shrink-0 place-items-center rounded-lg text-publico-superficie/70 hover:bg-publico-superficie/10 ${focoOscuro}`}>
              <Icono nombre="cerrar" className="size-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
