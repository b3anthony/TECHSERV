import type { IconoNombre } from '../../componentes/Icono.tsx'
import { focoClaro } from '../../componentes/marco/foco.ts'
import type { Especialidad, EstadoOrden } from '../../tipos.ts'
import { MESES_ESPANOL, fechaAmigable } from '../portal/fechas.ts'

/* ─── Dinero ─── */

const formatoSoles = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' })
const formatoSolesRedondo = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 })

/** 1230 → "S/ 1,230.00". */
export function soles(monto: number | null | undefined): string {
  return formatoSoles.format(Number(monto ?? 0))
}

/** 1230 → "S/ 1,230" (para ejes y cifras grandes). */
export function solesRedondo(monto: number | null | undefined): string {
  return formatoSolesRedondo.format(Number(monto ?? 0))
}

/* ─── Estados de la orden, contados para quien administra ─── */

export const ETIQUETA_ADMIN: Record<EstadoOrden, string> = {
  PENDIENTE: 'Sin técnico',
  ASIGNADA: 'Asignada',
  CONFIRMADA: 'Confirmada',
  EN_CAMINO: 'En camino',
  EN_PROCESO: 'En proceso',
  COMPLETADA: 'Terminada',
  CALIFICADA: 'Calificada',
  CANCELADA: 'Cancelada',
}

/** Qué significa cada estado, en una frase, para el administrador. */
export const EXPLICACION_ADMIN: Record<EstadoOrden, string> = {
  PENDIENTE: 'El cliente pidió la visita y todavía no tiene técnico.',
  ASIGNADA: 'Ya tiene técnico; falta que confirme desde su correo.',
  CONFIRMADA: 'El técnico confirmó y hará la visita el día acordado.',
  EN_CAMINO: 'El técnico salió hacia el domicilio del cliente.',
  EN_PROCESO: 'El técnico está trabajando en el domicilio.',
  COMPLETADA: 'El trabajo terminó; falta que el cliente lo califique.',
  CALIFICADA: 'Servicio cerrado y calificado por el cliente.',
  CANCELADA: 'La visita no se realizará.',
}

/* ─── Especialidades ─── */

export const ESPECIALIDAD_CORTA: Record<Especialidad, string> = {
  SERVICIOS_HOGAR: 'Hogar',
  SOPORTE_INFORMATICO: 'Informática',
  REPARACION_ELECTRODOMESTICOS: 'Electrodomésticos',
}

export const ICONO_ESPECIALIDAD: Record<Especialidad, IconoNombre> = {
  SERVICIOS_HOGAR: 'casa',
  SOPORTE_INFORMATICO: 'laptop',
  REPARACION_ELECTRODOMESTICOS: 'lavadora',
}

/* ─── Personas ─── */

/** "Carlos Núñez" → "CN". */
export function iniciales(nombre: string): string {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

/** "Buenos días" / "Buenas tardes" / "Buenas noches" según la hora local. */
export function saludo(): string {
  const hora = new Date().getHours()
  if (hora < 12) return 'Buenos días'
  if (hora < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

/* ─── Clases compartidas ─── */

export const contenedorPanel = 'mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8'

/** Enlace de texto secundario ("Ver todas →"). */
export const enlaceSuave = `inline-flex min-h-11 items-center whitespace-nowrap gap-1 rounded-lg px-2 text-sm font-bold text-publico-tinta underline decoration-publico-acento decoration-2 underline-offset-4 hover:decoration-publico-acento-hondo ${focoClaro}`

/** Botón de icono cuadrado sobre fondo claro. */
export const botonIcono = `inline-grid size-11 shrink-0 place-items-center rounded-lg text-publico-tinta-media hover:bg-publico-superficie-suave hover:text-publico-tinta ${focoClaro}`

const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']

/** "hoy", "mañana", "ayer" o "sáb 19 set" (con el año si no es el actual). */
export function diaCorto(fecha: string | null | undefined): string {
  const amigable = fechaAmigable(fecha)
  if (!fecha || ['hoy', 'mañana', 'ayer'].includes(amigable)) return amigable
  const [a, m, d] = fecha.split('-').map(Number)
  const f = new Date(a, m - 1, d)
  const texto = `${DIAS_CORTOS[f.getDay()]} ${d} ${MESES_ESPANOL[m - 1].slice(0, 3)}`
  return a === new Date().getFullYear() ? texto : `${texto} ${a}`
}

/** Lat/long del enlace de Google Maps que guarda el backend ("…query=-8.11,-79.03"). */
export function coordenadas(urlMapa: string | null): { lat: number; lon: number } | null {
  if (!urlMapa) return null
  const m = /query=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(urlMapa)
  if (!m) return null
  const lat = Number(m[1])
  const lon = Number(m[2])
  return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null
}

export function mapaEmbebido({ lat, lon }: { lat: number; lon: number }): string {
  const d = 0.006
  const caja = [lon - d, lat - d * 0.6, lon + d, lat + d * 0.6].map((n) => n.toFixed(5)).join(',')
  return `https://www.openstreetmap.org/export/embed.html?bbox=${caja}&layer=mapnik&marker=${lat.toFixed(6)},${lon.toFixed(6)}`
}
