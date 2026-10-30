import type { Especialidad, EstadoOrden, PasoHistorial, ReparacionGarantia } from '../../tipos.ts'
import type { DetallePagoRespuesta, FuenteEquipo, MetodoPago, ProbabilidadFalla } from '../panel/tiposPanel.ts'

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
  /** Lo que la IA sugiere llevar y revisar. Solo mientras dura la visita. */
  guiaIa?: GuiaTecnico | null
  garantia: ReparacionGarantia | null
  /** Solo al cobrar: los datos configurados de los métodos que puede usar el cliente. */
  datosCobro: DatosCobroVisita | null
}

export interface DatosCobroVisita {
  yape?: { numero: string | null; qr: string | null }
  plin?: { numero: string | null; qr: string | null }
  transferencia?: { banco: string; titular: string; numeroCuenta: string | null; cci: string | null }
}

/** Coincide con GuiaTecnico.java: el diagnóstico de la IA, resumido para el técnico. */
export interface GuiaTecnico {
  equipo?: { tipo?: string; marca?: string; modelo?: string; fuente: FuenteEquipo }
  repuestos: { nombre: string; sinStock: boolean }[]
  herramientas: string[]
  quizaFalten: string[]
  revisar: { falla: string; probabilidad: ProbabilidadFalla; queHacer?: string }[]
  precauciones: string[]
}

export interface RepuestoDisponible {
  id: number
  nombre: string
  precio: number
  stock: number
  /** Unidades cubiertas por la reparación original; 0 en una visita normal. */
  cantidadCubierta: number
}
