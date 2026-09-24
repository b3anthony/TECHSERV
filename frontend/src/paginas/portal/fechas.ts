export const MESES_ESPANOL = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'setiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

/**
 * Formatea una fecha YYYY-MM-DD y una hora HH:mm en español peruano ("19 de setiembre de 2026, 10:00").
 */
export function formatearFechaHora(fechaStr?: string | null, horaStr?: string | null): string {
  if (!fechaStr) return horaStr ?? '—'
  const partes = fechaStr.split('-')
  const horaTexto = horaStr ? horaStr.substring(0, 5) : ''
  if (partes.length === 3) {
    const anio = partes[0]
    const mesIdx = parseInt(partes[1], 10) - 1
    const dia = parseInt(partes[2], 10)
    const mes = MESES_ESPANOL[mesIdx] ?? ''
    if (horaTexto) {
      return `${dia} de ${mes} de ${anio}, ${horaTexto}`
    }
    return `${dia} de ${mes} de ${anio}`
  }
  return horaTexto ? `${fechaStr}, ${horaTexto}` : fechaStr
}

/**
 * Formatea solo la fecha YYYY-MM-DD ("19 de setiembre de 2026").
 */
export function formatearFecha(fechaStr?: string | null): string {
  return formatearFechaHora(fechaStr, null)
}

/**
 * Formatea un ISO string o timestamp para historial ("19 set 2026, 10:15").
 */
export function formatearMomento(momentoIso?: string | null): string {
  if (!momentoIso) return '—'
  try {
    const fecha = new Date(momentoIso)
    if (isNaN(fecha.getTime())) return momentoIso
    const dia = fecha.getDate()
    const mesCorto = MESES_ESPANOL[fecha.getMonth()]?.substring(0, 3) ?? ''
    const anio = fecha.getFullYear()
    const horas = String(fecha.getHours()).padStart(2, '0')
    const minutos = String(fecha.getMinutes()).padStart(2, '0')
    return `${dia} ${mesCorto} ${anio}, ${horas}:${minutos}`
  } catch {
    return momentoIso
  }
}

/**
 * Devuelve la fecha actual en formato local YYYY-MM-DD para inicializar inputs de fecha.
 */
export function hoyString(): string {
  const ahora = new Date()
  const anio = ahora.getFullYear()
  const mes = String(ahora.getMonth() + 1).padStart(2, '0')
  const dia = String(ahora.getDate()).padStart(2, '0')
  return `${anio}-${mes}-${dia}`
}

const DIAS_ESPANOL = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

/**
 * Fecha YYYY-MM-DD como la diría una persona: "hoy", "mañana", "ayer" o
 * "sábado 19 de setiembre" (con el año solo si no es el actual).
 */
export function fechaAmigable(fechaStr?: string | null): string {
  if (!fechaStr) return 'fecha por confirmar'
  const [anio, mes, dia] = fechaStr.split('-').map((x) => parseInt(x, 10))
  if (!anio || !mes || !dia) return fechaStr
  const fecha = new Date(anio, mes - 1, dia)
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const diferencia = Math.round((fecha.getTime() - hoy.getTime()) / 86_400_000)
  if (diferencia === 0) return 'hoy'
  if (diferencia === 1) return 'mañana'
  if (diferencia === -1) return 'ayer'
  const base = `${DIAS_ESPANOL[fecha.getDay()]} ${dia} de ${MESES_ESPANOL[mes - 1]}`
  return anio === hoy.getFullYear() ? base : `${base} de ${anio}`
}

/** "14:00:00" → "14:00". */
export function horaCorta(horaStr?: string | null): string {
  return horaStr ? horaStr.substring(0, 5) : ''
}
