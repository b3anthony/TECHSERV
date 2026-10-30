import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icono } from '../../../componentes/Icono.tsx'
import { focoAmarillo, focoClaro } from '../../../componentes/marco/foco.ts'
import type { EstadoOrden, OrdenResumen } from '../../../tipos.ts'
import { MESES_ESPANOL, horaCorta } from '../../portal/fechas.ts'
import { EstadoChip } from '../comun.tsx'
import { iso, sumarDias } from '../datos.ts'
import { ESPECIALIDAD_CORTA, ICONO_ESPECIALIDAD, iniciales } from '../formato.ts'
import { trozosResaltados } from './filtros.ts'

interface ListaOrdenesProps {
  ordenes: OrdenResumen[]
  /** Lo buscado, para resaltarlo en cada fila. */
  buscado: string
  /** Describe la lista para lectores de pantalla («Órdenes sin técnico, página 2»). */
  descripcion: string
  alAsignar: (orden: OrdenResumen) => void
  /**
   * Etiquetas extra de una fila, junto al código («Garantía», «Urgente»…).
   * Es el hueco para que otra parte del panel marque órdenes sin tocar la tabla.
   */
  etiquetas?: (orden: OrdenResumen) => ReactNode
}

const CERRADAS: EstadoOrden[] = ['COMPLETADA', 'CALIFICADA', 'CANCELADA']

/** La franja de color a la izquierda de cada fila: la etapa se ve antes de leerla. */
const FRANJA: Record<EstadoOrden, string> = {
  PENDIENTE: 'border-l-publico-acento',
  ASIGNADA: 'border-l-publico-acento-hondo/50',
  CONFIRMADA: 'border-l-publico-acento-hondo/50',
  EN_CAMINO: 'border-l-publico-panel',
  EN_PROCESO: 'border-l-publico-panel',
  COMPLETADA: 'border-l-publico-completada',
  CALIFICADA: 'border-l-publico-completada/50',
  CANCELADA: 'border-l-publico-linea-fuerte',
}

/** Colores para las iniciales: el mismo nombre siempre cae en el mismo. */
const TONOS_AVATAR = [
  'bg-publico-acento-tenue text-publico-chip-texto',
  'bg-publico-completada/15 text-publico-tinta',
  'bg-publico-pendiente/15 text-publico-tinta',
  'bg-publico-panel text-publico-superficie',
  'bg-publico-superficie-suave text-publico-tinta',
]

function tonoDe(nombre: string): string {
  let h = 0
  for (const letra of nombre) h = (h * 31 + letra.charCodeAt(0)) >>> 0
  return TONOS_AVATAR[h % TONOS_AVATAR.length]
}

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']

type Momento = 'hoy' | 'manana' | 'atrasada' | 'futura' | 'pasada'

/** Hoy y mañana se destacan; una visita de un día pasado que sigue abierta, se avisa. */
function momentoDe(o: OrdenResumen, hoy: string, manana: string): Momento {
  if (!o.fechaProgramada) return 'futura'
  if (o.fechaProgramada === hoy) return 'hoy'
  if (o.fechaProgramada === manana) return 'manana'
  if (o.fechaProgramada < hoy) return CERRADAS.includes(o.estado) ? 'pasada' : 'atrasada'
  return 'futura'
}

const HOJA: Record<Momento, string> = {
  hoy: 'border-publico-acento-hondo bg-publico-acento text-publico-tinta',
  manana: 'border-publico-acento-hondo/40 bg-publico-acento-tenue text-publico-tinta',
  atrasada: 'border-publico-peligro/60 bg-publico-superficie text-publico-peligro',
  futura: 'border-publico-linea-fuerte bg-publico-superficie text-publico-tinta',
  pasada: 'border-publico-linea bg-publico-lienzo text-publico-tinta-media',
}

const AVISO_MOMENTO: Partial<Record<Momento, { texto: string; clase: string }>> = {
  hoy: { texto: 'Hoy', clase: 'bg-publico-tinta text-publico-acento' },
  manana: { texto: 'Mañana', clase: 'bg-publico-acento-tenue text-publico-chip-texto' },
  atrasada: { texto: 'Atrasada', clase: 'bg-publico-peligro text-publico-superficie' },
}

/** La hoja de calendario: día de la semana, número y mes. */
function HojaCalendario({ fecha, momento }: { fecha: string | null; momento: Momento }): ReactNode {
  if (!fecha) {
    return <span className="grid size-14 shrink-0 place-items-center rounded-xl border border-dashed border-publico-linea-fuerte text-xs text-publico-tinta-suave">Sin fecha</span>
  }
  const [a, m, d] = fecha.split('-').map(Number)
  const dia = new Date(a, m - 1, d)
  return (
    <span aria-hidden="true" className={`grid w-14 shrink-0 justify-items-center rounded-xl border py-1 leading-none ${HOJA[momento]}`}>
      <span className="text-xs font-bold uppercase">{DIAS[dia.getDay()]}</span>
      <span className="mt-0.5 text-xl font-bold tabular-nums">{d}</span>
      <span className="mt-0.5 text-xs">{MESES_ESPANOL[m - 1].slice(0, 3)}</span>
    </span>
  )
}

/** "lunes 12 de octubre a las 10:00, hoy" para quien no ve la hoja. */
function fechaLeida(o: OrdenResumen): string {
  if (!o.fechaProgramada) return 'Sin fecha'
  const [a, m, d] = o.fechaProgramada.split('-').map(Number)
  const dia = new Date(a, m - 1, d)
  const largo = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][dia.getDay()]
  const texto = `${largo} ${d} de ${MESES_ESPANOL[m - 1]}${a !== new Date().getFullYear() ? ` de ${a}` : ''}`
  return o.horaProgramada ? `${texto} a las ${horaCorta(o.horaProgramada)}` : texto
}

function Resaltado({ texto, buscado }: { texto: string; buscado: string }): ReactNode {
  return trozosResaltados(texto, buscado).map(([trozo, coincide], i) =>
    coincide ? <mark key={i} className="rounded-sm bg-publico-acento-vivo px-0.5 text-publico-tinta">{trozo}</mark> : trozo,
  )
}

function Persona({ nombre, buscado, detalle }: { nombre: string; buscado: string; detalle?: ReactNode }): ReactNode {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <span aria-hidden="true" className={`grid size-9 shrink-0 place-items-center rounded-2xl text-xs font-bold ${tonoDe(nombre)}`}>{iniciales(nombre)}</span>
      <span className="min-w-0">
        <span className="block truncate font-bold"><Resaltado texto={nombre} buscado={buscado} /></span>
        {detalle}
      </span>
    </span>
  )
}

function SinTecnico(): ReactNode {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-publico-pendiente/60 px-2 py-1 text-xs font-bold text-publico-tinta-media">
      <span aria-hidden="true" className="size-1.5 rounded-2xl bg-publico-pendiente" />
      Sin técnico
    </span>
  )
}

function BotonAsignar({ orden, alAsignar, ancho = false }: { orden: OrdenResumen; alAsignar: (o: OrdenResumen) => void; ancho?: boolean }): ReactNode {
  return (
    <button
      type="button"
      onClick={() => alAsignar(orden)}
      className={`relative z-10 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-publico-acento-hondo bg-publico-acento px-4 font-bold text-publico-tinta shadow-sm shadow-publico-acento-hondo/30 hover:bg-publico-acento-vivo ${ancho ? 'w-full' : ''} ${focoAmarillo}`}
    >
      <Icono nombre="equipo" className="size-4" />
      Asignar<span className="sr-only"> técnico a {orden.codigo}</span>
    </button>
  )
}

export function ListaOrdenes({ ordenes, buscado, descripcion, alAsignar, etiquetas }: ListaOrdenesProps): ReactNode {
  const ahora = new Date()
  const hoy = iso(ahora)
  const manana = iso(sumarDias(ahora, 1))

  const filas = ordenes.map((o) => {
    const momento = momentoDe(o, hoy, manana)
    return { o, momento, aviso: AVISO_MOMENTO[momento], extra: etiquetas?.(o) }
  })

  return (
    <>
      {/* ─── Móvil: tarjetas ─── */}
      <ul aria-label={descripcion} className="grid gap-3 md:hidden">
        {filas.map(({ o, momento, aviso, extra }) => (
          <li key={o.id} className={`relative rounded-2xl border border-l-4 border-publico-linea bg-publico-superficie p-4 shadow-sm shadow-publico-tinta/5 ${FRANJA[o.estado]}`}>
            <div className="flex items-start gap-3">
              <HojaCalendario fecha={o.fechaProgramada} momento={momento} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <EstadoChip estado={o.estado} />
                  {aviso && <span className={`rounded-md px-1.5 py-0.5 text-xs font-bold ${aviso.clase}`}>{aviso.texto}</span>}
                  {extra}
                </div>
                <p className="mt-1.5 text-sm text-publico-tinta-media">
                  <span className="sr-only">{fechaLeida(o)}. </span>
                  <span aria-hidden="true" className="font-bold text-publico-tinta tabular-nums">{horaCorta(o.horaProgramada)}</span>
                  <span aria-hidden="true"> · </span>
                  <span className="tabular-nums"><Resaltado texto={o.codigo} buscado={buscado} /></span>
                </p>
              </div>
            </div>
            <h3 className="mt-3 line-clamp-2 leading-snug font-bold first-letter:uppercase">
              <Link to={`/panel/ordenes/${o.id}`} className="after:absolute after:inset-0 after:rounded-2xl focus:outline-none focus:after:ring-2 focus:after:ring-publico-acento focus:after:ring-offset-2 focus:after:ring-offset-publico-lienzo">
                <Resaltado texto={o.descripcionFalla} buscado={buscado} />
              </Link>
            </h3>
            {o.rechazo && <p className="mt-1.5 flex items-start gap-1.5 text-sm font-bold text-publico-peligro"><Icono nombre="pausa" className="mt-0.5 size-4 shrink-0" />{o.rechazo}</p>}
            <div className="mt-3 grid gap-2 text-sm">
              <Persona nombre={o.clienteNombre} buscado={buscado} detalle={
                <span className="flex items-center gap-1 text-xs text-publico-tinta-suave"><Icono nombre="pin" className="size-3.5" /><Resaltado texto={o.distrito} buscado={buscado} /></span>
              } />
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-publico-linea pt-3 text-sm">
              {o.tecnicoNombre
                ? <span className="min-w-0 truncate"><span className="text-publico-tinta-suave">Técnico: </span><b><Resaltado texto={o.tecnicoNombre} buscado={buscado} /></b></span>
                : o.estado === 'PENDIENTE' ? <span className="text-publico-tinta-media">Falta asignar técnico</span> : <SinTecnico />}
              {o.estado === 'PENDIENTE' && <BotonAsignar orden={o} alAsignar={alAsignar} />}
            </div>
          </li>
        ))}
      </ul>

      {/* ─── Escritorio: tabla ─── */}
      <div className="hidden overflow-hidden rounded-2xl border border-publico-linea bg-publico-superficie shadow-sm shadow-publico-tinta/5 md:block">
        <table className="w-full table-fixed text-left text-sm">
          <caption className="sr-only">{descripcion}</caption>
          <thead className="border-b border-publico-linea bg-publico-lienzo text-xs text-publico-tinta-suave">
            <tr>
              <th scope="col" className="w-[10.5rem] py-3 pr-3 pl-5 font-bold">Visita</th>
              <th scope="col" className="px-3 py-3 font-bold">Orden</th>
              <th scope="col" className="w-[12rem] px-3 py-3 font-bold lg:w-[14rem]">Cliente</th>
              <th scope="col" className="hidden w-[11rem] px-3 py-3 font-bold xl:table-cell">Técnico</th>
              <th scope="col" className="w-[8.5rem] px-3 py-3 font-bold">Etapa</th>
              <th scope="col" className="w-[8.5rem] py-3 pr-5 pl-3 text-right font-bold"><span className="sr-only">Acción</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-publico-linea">
            {filas.map(({ o, momento, aviso, extra }) => (
              <tr key={o.id} className="group motion-safe:transition-colors hover:bg-publico-acento-tenue/40">
                <td className={`border-l-4 py-3 pr-3 pl-4 align-top ${FRANJA[o.estado]}`}>
                  <span className="flex items-center gap-2.5">
                    <HojaCalendario fecha={o.fechaProgramada} momento={momento} />
                    <span className="grid gap-1">
                      <span className="sr-only">{fechaLeida(o)}</span>
                      <span aria-hidden="true" className="font-bold tabular-nums">{horaCorta(o.horaProgramada)}</span>
                      {aviso && <span className={`w-fit rounded-md px-1.5 py-0.5 text-xs font-bold ${aviso.clase}`}>{aviso.texto}</span>}
                    </span>
                  </span>
                </td>
                <td className="px-3 py-3 align-top">
                  <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-publico-tinta-suave">
                    <span className="inline-flex items-center gap-1 rounded-md bg-publico-superficie-suave px-1.5 py-0.5 font-bold text-publico-tinta-media">
                      <Icono nombre={ICONO_ESPECIALIDAD[o.especialidad]} className="size-3.5" />
                      {ESPECIALIDAD_CORTA[o.especialidad]}
                    </span>
                    <span className="font-bold tabular-nums text-publico-tinta-media"><Resaltado texto={o.codigo} buscado={buscado} /></span>
                    {o.cantidadFotos > 0 && (
                      <span className="inline-flex items-center gap-1"><Icono nombre="camara" className="size-3.5" />{o.cantidadFotos}<span className="sr-only"> {o.cantidadFotos === 1 ? 'foto' : 'fotos'}</span></span>
                    )}
                    {extra}
                  </span>
                  <Link to={`/panel/ordenes/${o.id}`} className={`mt-1 line-clamp-2 rounded font-bold leading-snug first-letter:uppercase hover:underline hover:decoration-publico-acento hover:decoration-2 hover:underline-offset-4 ${focoClaro}`}>
                    <Resaltado texto={o.descripcionFalla} buscado={buscado} />
                  </Link>
                  {o.rechazo && <span className="mt-1 flex items-start gap-1 text-xs font-bold text-publico-peligro"><Icono nombre="pausa" className="mt-px size-3.5 shrink-0" />{o.rechazo}</span>}
                </td>
                <td className="px-3 py-3 align-top">
                  <Persona nombre={o.clienteNombre} buscado={buscado} detalle={
                    <span className="flex items-center gap-1 truncate text-xs text-publico-tinta-suave"><Icono nombre="pin" className="size-3.5 shrink-0" /><Resaltado texto={o.distrito} buscado={buscado} /></span>
                  } />
                </td>
                <td className="hidden px-3 py-3 align-top xl:table-cell">
                  {o.tecnicoNombre ? <Persona nombre={o.tecnicoNombre} buscado={buscado} /> : <SinTecnico />}
                </td>
                <td className="px-3 py-3 align-top">
                  <EstadoChip estado={o.estado} />
                  {/* Sin la columna de técnico (pantallas medianas), se dice aquí. */}
                  {!o.tecnicoNombre && o.estado !== 'PENDIENTE' && o.estado !== 'CANCELADA' && <span className="mt-1 block text-xs text-publico-tinta-suave xl:hidden">Sin técnico</span>}
                  {o.tecnicoNombre && <span className="mt-1 block truncate text-xs text-publico-tinta-suave xl:hidden">{o.tecnicoNombre}</span>}
                </td>
                <td className="py-3 pr-5 pl-3 text-right align-top">
                  {o.estado === 'PENDIENTE' ? (
                    <BotonAsignar orden={o} alAsignar={alAsignar} />
                  ) : (
                    <Link to={`/panel/ordenes/${o.id}`} className={`inline-flex min-h-11 items-center gap-1 rounded-xl px-3 font-bold text-publico-tinta-media hover:bg-publico-superficie-suave hover:text-publico-tinta ${focoClaro}`}>
                      Ver<span className="sr-only"> {o.codigo}</span>
                      <Icono nombre="flecha" className="size-4 motion-safe:transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
