import type { IconoNombre } from '../../../componentes/Icono.tsx'
import type { EstadoOrden } from '../../../tipos.ts'
import { fechaAmigable, horaCorta } from '../fechas.ts'

/**
 * Cómo se le cuenta una orden a quien la pidió. El backend tiene 8 estados;
 * el cliente ve 5 etapas con nombres de la vida real, como el rastreo de un
 * pedido. ASIGNADA y CONFIRMADA caen en la misma etapa: para el cliente las
 * dos significan "ya hay técnico"; el titular dice si falta que confirme.
 */
export const ETAPAS: readonly { titulo: string; icono: IconoNombre }[] = [
  { titulo: 'Recibida', icono: 'documento' },
  { titulo: 'Técnico asignado', icono: 'herramienta' },
  { titulo: 'En camino', icono: 'auto' },
  { titulo: 'En tu casa', icono: 'casa' },
  { titulo: 'Terminado', icono: 'check' },
]

const ETAPA_DE: Record<EstadoOrden, number> = {
  PENDIENTE: 0,
  ASIGNADA: 1,
  CONFIRMADA: 1,
  EN_CAMINO: 2,
  EN_PROCESO: 3,
  COMPLETADA: 4,
  CALIFICADA: 4,
  CANCELADA: -1,
}

/** Índice de la etapa actual (0–4), o -1 si se canceló. */
export function etapaDe(estado: EstadoOrden): number {
  return ETAPA_DE[estado]
}

export type GrupoOrden = 'curso' | 'terminadas' | 'canceladas'

export const GRUPOS: readonly { clave: GrupoOrden; titulo: string; vacio: string }[] = [
  { clave: 'curso', titulo: 'En curso', vacio: 'No tienes visitas en curso.' },
  { clave: 'terminadas', titulo: 'Terminadas', vacio: 'Todavía no tienes visitas terminadas.' },
  { clave: 'canceladas', titulo: 'Canceladas', vacio: 'No tienes visitas canceladas.' },
]

export function grupoDe(estado: EstadoOrden): GrupoOrden {
  if (estado === 'CANCELADA') return 'canceladas'
  if (estado === 'COMPLETADA' || estado === 'CALIFICADA') return 'terminadas'
  return 'curso'
}

/** Nombre corto del estado para una etiqueta. */
export const ETIQUETA_ESTADO: Record<EstadoOrden, string> = {
  PENDIENTE: 'Recibida',
  ASIGNADA: 'Técnico asignado',
  CONFIRMADA: 'Visita confirmada',
  EN_CAMINO: 'En camino',
  EN_PROCESO: 'En tu casa',
  COMPLETADA: 'Falta calificar',
  CALIFICADA: 'Terminado',
  CANCELADA: 'Cancelada',
}

/** Nombre de cada movimiento en el historial (lo que pasó, no lo que falta). */
export const ETIQUETA_PASO: Record<EstadoOrden, string> = {
  ...ETIQUETA_ESTADO,
  COMPLETADA: 'Trabajo terminado',
  CALIFICADA: 'Calificaste el servicio',
}

/** Color de la etiqueta: en curso (amarillo), falta algo tuyo, terminado, cancelado. */
export function tonoEstado(estado: EstadoOrden): string {
  if (estado === 'CANCELADA') return 'border-publico-linea bg-publico-superficie-suave text-publico-tinta-media'
  if (estado === 'CALIFICADA') return 'border-publico-completada/30 bg-publico-superficie text-publico-completada'
  if (estado === 'COMPLETADA') return 'border-publico-acento-hondo bg-publico-acento text-publico-tinta'
  return 'border-publico-acento-hondo/40 bg-publico-acento-tenue text-publico-chip-texto'
}

interface DatosMensaje {
  estado: EstadoOrden
  tecnicoNombre?: string | null
  fechaProgramada?: string | null
  horaProgramada?: string | null
}

/** Titular y explicación en una frase, sin palabras técnicas. */
export function mensajeEstado({ estado, tecnicoNombre, fechaProgramada, horaProgramada }: DatosMensaje): { titular: string; detalle: string } {
  const tecnico = tecnicoNombre ?? 'El técnico'
  const dia = fechaAmigable(fechaProgramada)
  const cuando = `${['hoy', 'mañana', 'ayer'].includes(dia) ? dia : `el ${dia}`}${horaProgramada ? ` a las ${horaCorta(horaProgramada)}` : ''}`
  switch (estado) {
    case 'PENDIENTE':
      return { titular: 'Recibimos tu solicitud', detalle: `El taller la está revisando para asignarte un técnico. Tu visita es ${cuando}.` }
    case 'ASIGNADA':
      return { titular: 'Ya tienes un técnico', detalle: `${tecnico} atenderá tu caso ${cuando}. Falta que confirme la visita.` }
    case 'CONFIRMADA':
      return { titular: 'Tu visita está confirmada', detalle: `${tecnico} irá a tu domicilio ${cuando}.` }
    case 'EN_CAMINO':
      return { titular: 'El técnico va en camino', detalle: `${tecnico} ya salió hacia tu domicilio.` }
    case 'EN_PROCESO':
      return { titular: 'El técnico está en tu casa', detalle: `${tecnico} está revisando y solucionando el problema.` }
    case 'COMPLETADA':
      return { titular: 'Servicio terminado', detalle: '¿Cómo te fue? Califica el servicio: tu opinión ayuda a otros a elegir taller.' }
    case 'CALIFICADA':
      return { titular: 'Servicio terminado', detalle: 'Gracias por calificar el servicio.' }
    case 'CANCELADA':
      return { titular: 'Solicitud cancelada', detalle: 'Esta visita no se realizará.' }
  }
}
