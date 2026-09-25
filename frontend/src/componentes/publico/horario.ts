import type { HorarioDia } from '../../tipos.ts'

/* El horario de atención tal como lo edita un formulario. Lo usan el registro
   del negocio y los ajustes del panel. */

/** Un día en el formulario: abierto o no, y su tramo. */
export interface DiaEditable {
  dia: number
  abierto: boolean
  abre: string
  cierra: string
}

export const NOMBRES_DIA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

/**
 * Los siete días para el formulario. Con horario guardado, ese; sin él, una
 * propuesta para editar: de lunes a sábado de 8:00 a 18:00.
 */
export function diasEditables(guardado?: HorarioDia[]): DiaEditable[] {
  return NOMBRES_DIA.map((_, i) => {
    const dia = i + 1
    if (guardado) {
      const h = guardado.find((x) => x.dia === dia)
      return h ? { dia, abierto: true, abre: h.abre.slice(0, 5), cierra: h.cierra.slice(0, 5) } : { dia, abierto: false, abre: '08:00', cierra: '18:00' }
    }
    return { dia, abierto: dia <= 6, abre: '08:00', cierra: '18:00' }
  })
}

/** Lo que se manda al servidor: solo los días abiertos. */
export function aHorarios(dias: DiaEditable[]): HorarioDia[] {
  return dias.filter((d) => d.abierto).map(({ dia, abre, cierra }) => ({ dia, abre, cierra }))
}

/** El primer problema del horario, en una frase, o null si vale. */
export function problemaHorario(dias: DiaEditable[]): string | null {
  if (!dias.some((d) => d.abierto)) return 'Marca al menos un día de atención'
  const mal = dias.find((d) => d.abierto && (!d.abre || !d.cierra || d.abre >= d.cierra))
  if (mal) return `El ${NOMBRES_DIA[mal.dia - 1].toLowerCase()} la hora de cierre tiene que ser posterior a la de apertura`
  return null
}
