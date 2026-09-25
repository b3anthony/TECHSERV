import type { Especialidad, EstadoOrden, HorarioDia } from '../../tipos.ts'

export interface IndicadoresPanel {
  pendientes: number
  asignadas: number
  enCamino: number
  completadasHoy: number
}

export interface TecnicoDisponible {
  id: number
  nombreCompleto: string
  nombres: string
  apellidos: string
  email: string
  telefono: string
  disponible: boolean
  especialidades: Especialidad[]
  ordenesHoy: number
  /** Promedio de sus calificaciones, con un decimal. No viene si aún no tiene. */
  promedio?: number
  calificaciones: number
}

export interface RepuestoCatalogo {
  id: number
  nombre: string
  descripcion: string
  precio: number
  stock: number
  activo: boolean
}

export interface PeticionCierre {
  diagnostico: string
  precioManoObra: number
  repuestos: Array<{
    repuestoId: number
    cantidad: number
  }>
}

export type MetodoPago = 'EFECTIVO' | 'YAPE' | 'PLIN' | 'TRANSFERENCIA'

export interface DetallePagoRespuesta {
  id: number
  ordenId: number
  metodo: MetodoPago
  monto: number
  estado: string
  pagadoEn: string
  /** El técnico que cobró en el domicilio; no viene si lo registró el taller. */
  cobradoPor?: string
}

export interface RespuestaPaginada<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
  first: boolean
  last: boolean
}

/** Coincide con TarifaResumen.java */
export interface TarifaResumen {
  especialidad: Especialidad
  titulo: string
  tarifaBase: number
}

/**
 * Cuerpo de POST /panel/tecnicos (sin `disponible`) y de PATCH /panel/tecnicos/{id}.
 * Sin `especialidades`, el técnico atiende la especialidad del taller.
 */
export interface DatosTecnico {
  nombres: string
  apellidos: string
  email?: string
  telefono: string
  disponible?: boolean
  especialidades?: Especialidad[]
}

/** Coincide con AjustesTaller.java */
export interface AjustesTaller {
  cuenta: { nombres: string; apellidos: string; email: string; telefono?: string }
  negocio: { razonSocial: string; ruc: string; descripcion?: string; telefono?: string; direccion: string; distrito: string }
  especialidad?: TarifaResumen
  horarios: HorarioDia[]
  metodosPago: MetodoPago[]
}

/** Coincide con TecnicoRanking.java */
export interface TecnicoRanking {
  tecnicoId: number
  nombreCompleto: string
  ordenesCompletadas: number
  ingresoGenerado: number
}

/** Coincide con ReportePanel.java */
export interface ReportePanel {
  ingresos: number
  ordenesPorEstado: Record<EstadoOrden, number>
  ordenesCreadas: number
  horasMediasDeAtencion: number | null
  calificacionPromedio: number | null
  serviciosCalificados: number
  ranking: TecnicoRanking[]
}
