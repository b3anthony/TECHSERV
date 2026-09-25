import type { Especialidad, EstadoOrden, PasoHistorial } from '../../tipos.ts'
import type { DetallePagoRespuesta, MetodoPago } from '../panel/tiposPanel.ts'

/** Lo que devuelve /api/visita/{token}: la orden vista por el técnico. */
export interface VistaVisita {
  codigo: string
  estado: EstadoOrden
  etiquetaEstado: string
  especialidad: Especialidad
  etiquetaEspecialidad: string
  descripcionFalla: string
  clienteNombre: string
  clienteTelefono: string | null
  direccion: string
  referencia: string | null
  distrito: string
  urlMapa: string | null
  fechaProgramada: string | null
  horaProgramada: string | null
  tallerNombre: string
  tallerTelefono: string | null
  tecnicoNombres: string
  fotosCliente: string[]
  fotosTrabajo: string[]
  maximoFotosTrabajo: number
  diagnostico: string | null
  precioManoObra: number | null
  total: number | null
  repuestos: { nombre: string; cantidad: number; precioUnitario: number; subtotal: number }[]
  pago: DetallePagoRespuesta | null
  tarifaSugerida: number | null
  catalogo: RepuestoDisponible[]
  /** Los métodos de pago que acepta el taller. */
  metodosPago: MetodoPago[]
  /** Cómo dijo el cliente que pagaría: si lo eligió, es el único que se puede marcar. */
  metodoPagoCliente?: MetodoPago | null
  historial: PasoHistorial[]
}

export interface RepuestoDisponible {
  id: number
  nombre: string
  precio: number
  stock: number
}
