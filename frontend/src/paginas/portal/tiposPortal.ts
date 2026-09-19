import type { Especialidad, EstadoOrden, PasoHistorial } from '../../tipos.ts'

export interface EspecialidadItem {
  clave: Especialidad
  titulo: string
  detalle: string
}

export interface TallerItem {
  id: number
  razonSocial: string
  descripcion: string
  direccion: string
  distrito: string
  tarifaBase: number
  promedio: number
  servicios: number
  atiendeHoy: boolean
}

export interface FranjaAgenda {
  hora: string
  disponible: boolean
  cuposLibres: number
}

export interface AgendaDia {
  fecha: string
  aforo: number
  franjas: FranjaAgenda[]
}

export interface NuevaReservaPayload {
  mypeId: number
  especialidad: Especialidad
  descripcionFalla: string
  direccion: string
  referencia?: string | null
  distrito: string
  fecha: string
  hora: string
}

export interface SeguimientoDatos {
  codigo: string
  estado: EstadoOrden
  etiquetaEstado: string
  tallerNombre: string
  tecnicoNombre: string | null
  fechaProgramada: string | null
  horaProgramada: string | null
  pasos: PasoHistorial[]
  puedeCancelar: boolean
  puedeCalificar: boolean
}

export interface DetalleCalificacionDatos {
  puntaje: number
  comentario: string | null
  creadaEn: string
}

export interface FotoCargada {
  id: string
  archivo: File
  nombre: string
  urlVistaPrevia: string
}
