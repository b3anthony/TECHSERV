import type { AtencionGarantia, Especialidad, EstadoOrden, GarantiaOrden, PasoHistorial, TipoOrden } from '../../tipos.ts'
import type { MetodoPago } from '../panel/tiposPanel.ts'

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
  /** Los que acepta el taller: entre ellos elige el cliente en el paso 5. */
  metodosPago: MetodoPago[]
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
  metodoPago: MetodoPago
}

export interface SeguimientoDatos {
  codigo: string
  tipo: TipoOrden
  garantia: GarantiaOrden | null
  atencionGarantia: AtencionGarantia | null
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
