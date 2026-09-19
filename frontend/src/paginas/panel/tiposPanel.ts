import type { Especialidad } from '../../tipos.ts'

export interface IndicadoresPanel {
  pendientes: number
  asignadas: number
  enCamino: number
  completadasHoy: number
}

export interface TecnicoDisponible {
  id: number
  nombreCompleto: string
  email: string
  telefono: string
  disponible: boolean
  especialidades: Especialidad[]
  ordenesHoy: number
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
