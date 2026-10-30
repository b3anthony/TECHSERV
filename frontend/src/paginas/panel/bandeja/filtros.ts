import type { EstadoOrden } from '../../../tipos.ts'
import { iso, sumarDias } from '../datos.ts'
import type { FiltrosBandeja } from '../datos.ts'

/** El orden de las pestañas sigue la vida de una orden. */
export const PESTANAS: EstadoOrden[] = ['PENDIENTE', 'ASIGNADA', 'CONFIRMADA', 'EN_CAMINO', 'EN_PROCESO', 'COMPLETADA', 'CALIFICADA', 'CANCELADA']

export type Cuando = '' | 'hoy' | 'manana' | 'semana' | 'rango'

export const CUANDO: { valor: Cuando; texto: string }[] = [
  { valor: '', texto: 'Todas' },
  { valor: 'hoy', texto: 'Hoy' },
  { valor: 'manana', texto: 'Mañana' },
  { valor: 'semana', texto: 'Esta semana' },
  { valor: 'rango', texto: 'Elegir fechas' },
]

/**
 * Todo lo que se ve en la bandeja sale de la URL: recargar, volver atrás o
 * pasar el enlace a otra persona del taller deja la misma vista.
 */
export interface VistaBandeja {
  estado: EstadoOrden | ''
  q: string
  /** Un id de técnico, «sin» para las que no tienen, o vacío. */
  tecnico: string
  cuando: Cuando
  desde: string
  hasta: string
  proximas: boolean
  pagina: number
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/

export function leerVista(p: URLSearchParams): VistaBandeja {
  const estado = p.get('estado')
  const cuando = p.get('cuando')
  const tecnico = p.get('tecnico') ?? ''
  return {
    estado: PESTANAS.includes(estado as EstadoOrden) ? (estado as EstadoOrden) : '',
    q: (p.get('q') ?? '').slice(0, 80),
    tecnico: tecnico === 'sin' || /^\d+$/.test(tecnico) ? tecnico : '',
    cuando: CUANDO.some((c) => c.valor === cuando) ? (cuando as Cuando) : '',
    desde: FECHA.test(p.get('desde') ?? '') ? p.get('desde')! : '',
    hasta: FECHA.test(p.get('hasta') ?? '') ? p.get('hasta')! : '',
    proximas: p.get('orden') === 'proximas',
    pagina: Math.max(1, parseInt(p.get('pagina') || '1', 10) || 1),
  }
}

/** Solo lo que no es el valor por defecto: la URL limpia es la bandeja sin filtros. */
export function escribirVista(v: VistaBandeja): URLSearchParams {
  const p = new URLSearchParams()
  if (v.q.trim()) p.set('q', v.q.trim())
  if (v.estado) p.set('estado', v.estado)
  if (v.tecnico) p.set('tecnico', v.tecnico)
  if (v.cuando) p.set('cuando', v.cuando)
  if (v.cuando === 'rango' && v.desde) p.set('desde', v.desde)
  if (v.cuando === 'rango' && v.hasta) p.set('hasta', v.hasta)
  if (v.proximas) p.set('orden', 'proximas')
  if (v.pagina > 1) p.set('pagina', String(v.pagina))
  return p
}

/** Lunes a domingo de la semana de hoy. */
function semanaDe(hoy: Date): { desde: string; hasta: string } {
  const lunes = sumarDias(hoy, -((hoy.getDay() + 6) % 7))
  return { desde: iso(lunes), hasta: iso(sumarDias(lunes, 6)) }
}

export function rangoDe(v: VistaBandeja, hoy = new Date()): { desde?: string; hasta?: string } {
  switch (v.cuando) {
    case 'hoy': return { desde: iso(hoy), hasta: iso(hoy) }
    case 'manana': return { desde: iso(sumarDias(hoy, 1)), hasta: iso(sumarDias(hoy, 1)) }
    case 'semana': return semanaDe(hoy)
    case 'rango': {
      // Un rango al revés todavía a medio escribir no se manda: el servidor lo rechazaría.
      if (v.desde && v.hasta && v.desde > v.hasta) return {}
      return { desde: v.desde || undefined, hasta: v.hasta || undefined }
    }
    default: return {}
  }
}

/** Lo que va al servidor (sin la etapa ni la página, que van aparte). */
export function filtrosDe(v: VistaBandeja): FiltrosBandeja {
  return {
    q: v.q.trim() || undefined,
    tecnicoId: /^\d+$/.test(v.tecnico) ? Number(v.tecnico) : undefined,
    sinTecnico: v.tecnico === 'sin' || undefined,
    ...rangoDe(v),
    orden: v.proximas ? 'PROXIMAS' : undefined,
  }
}

export function hayFiltros(v: VistaBandeja): boolean {
  return Boolean(v.q.trim() || v.tecnico || v.cuando)
}

/* ─── Resaltar lo buscado ─── */

/** Una letra en minúscula y sin tilde. Letra a letra, para que los índices del texto original sigan valiendo. */
function plana(letra: string): string {
  return letra.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').charAt(0) || letra
}

/** Parte el texto en trozos [texto, coincide] buscando sin mayúsculas ni tildes, como el servidor. */
export function trozosResaltados(texto: string, buscado: string): [string, boolean][] {
  const aguja = Array.from(buscado.trim()).map(plana).join('')
  if (!aguja) return [[texto, false]]
  const letras = Array.from(texto)
  const pajar = letras.map(plana).join('')
  const trozos: [string, boolean][] = []
  let desde = 0
  let i = pajar.indexOf(aguja)
  while (i !== -1) {
    if (i > desde) trozos.push([letras.slice(desde, i).join(''), false])
    trozos.push([letras.slice(i, i + aguja.length).join(''), true])
    desde = i + aguja.length
    i = pajar.indexOf(aguja, desde)
  }
  if (desde < letras.length) trozos.push([letras.slice(desde).join(''), false])
  return trozos
}
