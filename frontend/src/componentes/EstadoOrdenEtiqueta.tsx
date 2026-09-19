import type { JSX } from 'react'
import type { EstadoOrden } from '../tipos'

interface EstadoConfig {
  texto: string
  puntoClase: string
}

const MAPA_ESTADOS: Record<EstadoOrden, EstadoConfig> = {
  PENDIENTE: {
    texto: 'Pendiente',
    puntoClase: 'bg-pendiente',
  },
  ASIGNADA: {
    texto: 'Asignada',
    puntoClase: 'bg-asignada',
  },
  CONFIRMADA: {
    texto: 'Confirmada',
    puntoClase: 'bg-asignada',
  },
  EN_CAMINO: {
    texto: 'En camino',
    puntoClase: 'bg-camino',
  },
  EN_PROCESO: {
    texto: 'En proceso',
    puntoClase: 'bg-proceso',
  },
  COMPLETADA: {
    texto: 'Completada',
    puntoClase: 'bg-completada',
  },
  CALIFICADA: {
    texto: 'Calificada',
    puntoClase: 'bg-completada',
  },
  CANCELADA: {
    texto: 'Cancelada',
    puntoClase: 'bg-cancelada',
  },
}

export interface EstadoOrdenEtiquetaProps {
  estado: EstadoOrden
  etiqueta?: string
  className?: string
}

export function EstadoOrdenEtiqueta({
  estado,
  etiqueta,
  className = '',
}: EstadoOrdenEtiquetaProps): JSX.Element {
  const config = MAPA_ESTADOS[estado] ?? {
    texto: estado,
    puntoClase: 'bg-tinta-suave',
  }
  const textoAMostrar = etiqueta || config.texto

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-tinta bg-superficie-suave border border-linea ${className}`.trim()}
    >
      <span className={`w-2 h-2 rounded-full shrink-0 ${config.puntoClase}`} aria-hidden="true" />
      <span>{textoAMostrar}</span>
    </span>
  )
}
