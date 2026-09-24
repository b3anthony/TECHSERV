import { useEffect, useId, useRef } from 'react'
import type { HTMLAttributes, ReactNode, Ref } from 'react'
import { Icono } from '../../componentes/Icono.tsx'
import type { IconoNombre } from '../../componentes/Icono.tsx'
import { focoClaro } from '../../componentes/marco/foco.ts'
import type { EstadoOrden } from '../../tipos.ts'
import { ETIQUETA_ADMIN, botonIcono } from './formato.ts'

const TONO_ESTADO: Record<EstadoOrden, { chip: string; punto: string }> = {
  PENDIENTE: { chip: 'border-publico-acento-hondo bg-publico-acento text-publico-tinta', punto: 'bg-publico-tinta' },
  ASIGNADA: { chip: 'border-publico-acento-hondo/40 bg-publico-acento-tenue text-publico-chip-texto', punto: 'bg-publico-acento-hondo' },
  CONFIRMADA: { chip: 'border-publico-acento-hondo/40 bg-publico-acento-tenue text-publico-chip-texto', punto: 'bg-publico-acento-hondo' },
  EN_CAMINO: { chip: 'border-publico-panel bg-publico-panel text-publico-superficie', punto: 'bg-publico-acento' },
  EN_PROCESO: { chip: 'border-publico-panel bg-publico-panel text-publico-superficie', punto: 'bg-publico-acento' },
  COMPLETADA: { chip: 'border-publico-completada/40 bg-publico-superficie text-publico-completada', punto: 'bg-publico-completada' },
  CALIFICADA: { chip: 'border-publico-completada/30 bg-publico-superficie text-publico-completada', punto: 'bg-publico-completada' },
  CANCELADA: { chip: 'border-publico-linea bg-publico-superficie-suave text-publico-tinta-media', punto: 'bg-publico-tinta-suave' },
}

export function EstadoChip({ estado, className = '' }: { estado: EstadoOrden; className?: string }): ReactNode {
  const tono = TONO_ESTADO[estado]
  return (
    <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-bold whitespace-nowrap ${tono.chip} ${className}`}>
      <span aria-hidden="true" className={`size-1.5 rounded-2xl ${tono.punto}`} />
      {ETIQUETA_ADMIN[estado]}
    </span>
  )
}

/* ─── Piezas de maquetación ─── */

export function CabeceraPagina({ titulo, detalle, acciones, antes }: { titulo: string; detalle?: ReactNode; acciones?: ReactNode; antes?: ReactNode }): ReactNode {
  return (
    <header className="flex flex-col gap-4 pt-6 pb-5 sm:flex-row sm:items-end sm:justify-between lg:pt-8 lg:pb-6">
      <div className="min-w-0">
        {antes}
        <h1 className="text-[clamp(1.75rem,1.2rem+1.8vw,2.5rem)] leading-[1.12] font-bold tracking-[-0.03em]">{titulo}</h1>
        {detalle && <p className="mt-1.5 max-w-2xl text-base/[1.55] text-publico-tinta-media">{detalle}</p>}
      </div>
      {acciones && <div className="flex shrink-0 flex-wrap gap-2">{acciones}</div>}
    </header>
  )
}

interface TarjetaPanelProps extends HTMLAttributes<HTMLElement> {
  titulo?: ReactNode
  icono?: IconoNombre
  accion?: ReactNode
  children: ReactNode
}

/** Tarjeta blanca con título opcional; el título es un h2. */
export function TarjetaPanel({ titulo, icono, accion, children, className = '', ...rest }: TarjetaPanelProps): ReactNode {
  return (
    <section className={`rounded-2xl border border-publico-linea bg-publico-superficie p-4 shadow-sm shadow-publico-tinta/5 sm:p-5 ${className}`} {...rest}>
      {(titulo || accion) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          {titulo && (
            <h2 className="flex min-w-0 items-center gap-2 text-base font-bold">
              {icono && (
                <span className="grid size-8 place-items-center rounded-lg bg-publico-acento-tenue text-publico-chip-texto">
                  <Icono nombre={icono} className="size-4" />
                </span>
              )}
              {titulo}
            </h2>
          )}
          {accion}
        </div>
      )}
      {children}
    </section>
  )
}

export function EsqueletoLista({ filas = 3, alto = 'h-20', etiqueta }: { filas?: number; alto?: string; etiqueta: string }): ReactNode {
  return (
    <div role="status" className="grid gap-2.5">
      <span className="sr-only">{etiqueta}</span>
      {Array.from({ length: filas }, (_, i) => (
        <div key={i} aria-hidden="true" className={`${alto} rounded-xl bg-publico-superficie-suave motion-safe:animate-pulse`} />
      ))}
    </div>
  )
}

export function ErrorCarga({ mensaje, reintentar }: { mensaje: string; reintentar: () => void }): ReactNode {
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-publico-peligro/40 bg-publico-superficie px-4 py-3 text-sm text-publico-peligro">
      <span>{mensaje}</span>
      <button type="button" onClick={reintentar} className={`min-h-11 rounded-lg px-2 font-bold text-publico-tinta underline decoration-publico-acento decoration-2 underline-offset-4 ${focoClaro}`}>
        Reintentar
      </button>
    </div>
  )
}

/* ─── Diálogo modal ─── */

interface DialogoPanelProps {
  ref?: Ref<HTMLDialogElement>
  abierto: boolean
  titulo: string
  detalle?: ReactNode
  alCerrar: () => void
  /** Bloquea el botón de cerrar mientras se guarda. */
  ocupado?: boolean
  ancho?: 'md' | 'lg' | 'xl'
  pie?: ReactNode
  children: ReactNode
}

const ANCHOS = { md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl' }

/**
 * <dialog> nativo: atrapa el foco, cierra con Escape y devuelve el foco al
 * botón que lo abrió. Quien lo usa decide cuándo está abierto.
 */
export function DialogoPanel({ ref, abierto, titulo, detalle, alCerrar, ocupado = false, ancho = 'lg', pie, children }: DialogoPanelProps): ReactNode {
  const propio = useRef<HTMLDialogElement>(null)
  const idTitulo = useId()

  useEffect(() => {
    const el = propio.current
    if (!el) return
    if (abierto && !el.open) el.showModal()
    if (!abierto && el.open) el.close()
  }, [abierto])

  function asignarRef(el: HTMLDialogElement | null): void {
    propio.current = el
    if (typeof ref === 'function') ref(el)
    else if (ref) ref.current = el
  }

  return (
    <dialog
      ref={asignarRef}
      onClose={alCerrar}
      aria-labelledby={idTitulo}
      className={`m-auto flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] ${ANCHOS[ancho]} flex-col rounded-2xl border border-publico-linea bg-publico-superficie p-0 font-publico text-publico-tinta shadow-2xl shadow-publico-tinta/30 backdrop:bg-publico-panel/60 [&:not([open])]:hidden`}
    >
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-publico-linea px-5 pt-5 pb-4 sm:px-6">
        <div className="min-w-0">
          <h2 id={idTitulo} className="text-lg leading-tight font-bold">{titulo}</h2>
          {detalle && <div className="mt-1 text-sm text-publico-tinta-media">{detalle}</div>}
        </div>
        <button type="button" onClick={() => propio.current?.close()} disabled={ocupado} aria-label="Cerrar" className={`-mt-1.5 -mr-2 ${botonIcono}`}>
          <Icono nombre="cerrar" className="size-5" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">{children}</div>
      {pie && <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-publico-linea bg-publico-lienzo px-5 py-4 sm:flex-row sm:justify-end sm:px-6">{pie}</div>}
    </dialog>
  )
}

/* ─── Interruptor accesible (role=switch) ─── */

export function Interruptor({ activo, alCambiar, etiqueta, deshabilitado = false }: { activo: boolean; alCambiar: () => void; etiqueta: string; deshabilitado?: boolean }): ReactNode {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      aria-label={etiqueta}
      disabled={deshabilitado}
      onClick={alCambiar}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-2xl border motion-safe:transition-colors disabled:cursor-wait disabled:opacity-60 ${activo ? 'border-publico-completada bg-publico-completada' : 'border-publico-linea-fuerte bg-publico-superficie-suave'} ${focoClaro}`}
    >
      <span aria-hidden="true" className={`absolute top-0.5 size-5.5 rounded-2xl bg-publico-superficie shadow-sm shadow-publico-tinta/30 motion-safe:transition-[left] ${activo ? 'left-[1.4rem]' : 'left-0.5'}`} />
    </button>
  )
}
