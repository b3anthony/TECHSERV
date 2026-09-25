import type { MetodoPago } from './paginas/panel/tiposPanel.ts'

export type Rol = 'CLIENTE' | 'ADMIN_MYPE' | 'TECNICO'

export type EstadoOrden =
  | 'PENDIENTE' | 'ASIGNADA' | 'CONFIRMADA' | 'EN_CAMINO'
  | 'EN_PROCESO' | 'COMPLETADA' | 'CALIFICADA' | 'CANCELADA'

export type Especialidad =
  | 'SERVICIOS_HOGAR' | 'SOPORTE_INFORMATICO' | 'REPARACION_ELECTRODOMESTICOS'

export type ActorHistorial = 'CLIENTE' | 'ADMIN_MYPE' | 'TECNICO' | 'SISTEMA'

export interface UsuarioActual {
  id: number
  nombreCompleto: string
  email: string
  rol: Rol
  mypeId: number | null
  razonSocial: string | null
}

export interface RespuestaSesion {
  token: string
  expiraEn: string
  usuario: UsuarioActual
  /** El cliente había desactivado su cuenta y al entrar la recuperó. */
  cuentaReactivada?: boolean
}

/** Coincide con HorarioDia.java. `dia`: 1 = lunes … 7 = domingo. Horas "HH:mm". */
export interface HorarioDia {
  dia: number
  abre: string
  cierra: string
}

export interface ErrorApi {
  estado: number
  mensaje: string
  ruta: string
  momento: string
  campos?: Record<string, string>
}

/** Coincide con OrdenResumen.java del backend */
export interface OrdenResumen {
  id: number
  codigo: string
  estado: EstadoOrden
  etiquetaEstado: string
  especialidad: Especialidad
  etiquetaEspecialidad: string
  descripcionFalla: string
  clienteNombre: string
  direccion: string
  distrito: string
  fechaProgramada: string | null
  horaProgramada: string | null
  tecnicoNombre: string | null
  cantidadFotos: number
  /** Solo en la bandeja del taller: la nota del técnico que dijo que no puede ir. */
  rechazo?: string | null
}

/** Coincide con OrdenDetalle.java del backend */
export interface OrdenDetalle {
  id: number
  codigo: string
  estado: EstadoOrden
  etiquetaEstado: string
  especialidad: Especialidad
  etiquetaEspecialidad: string
  descripcionFalla: string
  clienteNombre: string
  clienteTelefono: string
  direccion: string
  referencia: string | null
  distrito: string
  urlMapa: string | null
  fechaProgramada: string | null
  horaProgramada: string | null
  tecnicoNombre: string | null
  tecnicoId: number | null
  diagnostico: string | null
  precioManoObra: number | null
  total: number | null
  /** Cómo dijo el cliente que pagaría. Falta en las órdenes antiguas. */
  metodoPago?: MetodoPago | null
  creadaEn: string
  fotos: string[]
  /** Las que subió el técnico durante el trabajo. */
  fotosTrabajo: string[]
  historial: PasoHistorial[]
  repuestos: RepuestoUsado[]
}

export interface RepuestoUsado {
  nombre: string
  cantidad: number
  precioUnitario: number
  subtotal: number
}

/** Coincide con PasoHistorial.java del backend */
export interface PasoHistorial {
  estado: EstadoOrden
  etiqueta: string
  actor: ActorHistorial
  nota: string | null
  ocurridoEn: string
}
