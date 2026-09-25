import type { ReactNode } from 'react'
import { focoClaro } from '../marco/foco.ts'
import { NOMBRES_DIA } from './horario.ts'
import type { DiaEditable } from './horario.ts'

interface EditorHorarioProps {
  id: string
  dias: DiaEditable[]
  alCambiar: (dias: DiaEditable[]) => void
  error?: string | null
  deshabilitado?: boolean
  /** Si ya hay un título visible encima (una tarjeta), la leyenda queda solo para lectores de pantalla. */
  leyendaOculta?: boolean
}

const campoHora = `min-h-11 w-full min-w-0 rounded-lg border bg-publico-superficie px-2.5 text-base tabular-nums text-publico-tinta hover:border-publico-tinta-suave disabled:opacity-60 ${focoClaro}`

/**
 * El horario de atención, día por día: una casilla para abrir o cerrar el día
 * y, si abre, de qué hora a qué hora.
 */
export function EditorHorario({ id, dias, alCambiar, error, deshabilitado = false, leyendaOculta = false }: EditorHorarioProps): ReactNode {
  const ayudaId = `${id}-ayuda`
  const errorId = `${id}-error`

  function cambiar(dia: number, cambios: Partial<DiaEditable>): void {
    alCambiar(dias.map((d) => (d.dia === dia ? { ...d, ...cambios } : d)))
  }

  return (
    <fieldset aria-describedby={`${ayudaId} ${errorId}`} className="grid gap-2">
      <legend className={leyendaOculta ? 'sr-only' : 'mb-1 text-sm font-bold text-publico-tinta'}>Horario de atención</legend>
      <p id={ayudaId} className="mb-1 text-xs text-publico-tinta-suave">
        Los clientes solo podrán reservar visitas dentro de este horario. Las visitas empiezan entre las 8:00 y las 11:00, o entre las 14:00 y las 16:00.
      </p>
      <ul className="grid gap-1.5">
        {dias.map((d) => {
          const nombre = NOMBRES_DIA[d.dia - 1]
          const invalido = d.abierto && (!d.abre || !d.cierra || d.abre >= d.cierra)
          return (
            <li key={d.dia} className={`grid grid-cols-1 items-center gap-x-3 rounded-lg border px-3 py-1.5 min-[480px]:grid-cols-[7.5rem_minmax(0,1fr)] ${d.abierto ? 'border-publico-linea-fuerte bg-publico-superficie' : 'border-publico-linea bg-publico-superficie-suave'}`}>
              <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm font-bold text-publico-tinta">
                <input
                  type="checkbox"
                  checked={d.abierto}
                  disabled={deshabilitado}
                  onChange={(e) => cambiar(d.dia, { abierto: e.target.checked })}
                  className={`size-5 shrink-0 cursor-pointer rounded accent-publico-tinta ${focoClaro}`}
                />
                {nombre}
              </label>
              {d.abierto ? (
                <div className="flex items-center gap-2 pb-1.5 min-[480px]:pb-0">
                  <label htmlFor={`${id}-${d.dia}-abre`} className="sr-only">{nombre}, abre a las</label>
                  <input id={`${id}-${d.dia}-abre`} type="time" step={1800} value={d.abre} disabled={deshabilitado} onChange={(e) => cambiar(d.dia, { abre: e.target.value })} aria-invalid={invalido || undefined} className={`${campoHora} ${invalido ? 'border-publico-peligro' : 'border-publico-linea-fuerte'}`} />
                  <span aria-hidden="true" className="text-sm text-publico-tinta-media">a</span>
                  <label htmlFor={`${id}-${d.dia}-cierra`} className="sr-only">{nombre}, cierra a las</label>
                  <input id={`${id}-${d.dia}-cierra`} type="time" step={1800} value={d.cierra} disabled={deshabilitado} onChange={(e) => cambiar(d.dia, { cierra: e.target.value })} aria-invalid={invalido || undefined} className={`${campoHora} ${invalido ? 'border-publico-peligro' : 'border-publico-linea-fuerte'}`} />
                </div>
              ) : (
                <p className="text-sm text-publico-tinta-suave">Cerrado</p>
              )}
            </li>
          )
        })}
      </ul>
      <p id={errorId} role="alert" className="min-h-5 text-xs font-bold text-publico-peligro">{error ?? ''}</p>
    </fieldset>
  )
}
