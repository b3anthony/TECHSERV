package pe.techserv.visita.dto;

import pe.techserv.comun.Especialidad;
import pe.techserv.mype.Repuesto;
import pe.techserv.orden.EstadoOrden;
import pe.techserv.orden.dto.PasoHistorial;
import pe.techserv.pago.MetodoPago;
import pe.techserv.panel.dto.DetallePago;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

/**
 * Lo que ve el tecnico en su pagina. No lleva ids internos de la orden ni del
 * taller: el token es la unica llave, y no hace falta dar otras.
 */
public record VistaVisita(String codigo,
                          EstadoOrden estado,
                          String etiquetaEstado,
                          Especialidad especialidad,
                          String etiquetaEspecialidad,
                          String descripcionFalla,
                          String clienteNombre,
                          String clienteTelefono,
                          String direccion,
                          String referencia,
                          String distrito,
                          String urlMapa,
                          LocalDate fechaProgramada,
                          LocalTime horaProgramada,
                          String tallerNombre,
                          String tallerTelefono,
                          String tecnicoNombres,
                          List<String> fotosCliente,
                          List<String> fotosTrabajo,
                          int maximoFotosTrabajo,
                          String diagnostico,
                          BigDecimal precioManoObra,
                          BigDecimal total,
                          List<RepuestoCobrado> repuestos,
                          DetallePago pago,
                          /** La tarifa del taller para este servicio: el punto de partida de la mano de obra. */
                          BigDecimal tarifaSugerida,
                          /** Solo mientras hay que cerrar: los repuestos que puede elegir. */
                          List<RepuestoDisponible> catalogo,
                          /** Los métodos de pago que acepta el taller: los únicos que puede marcar al cobrar. */
                          List<MetodoPago> metodosPago,
                          /** Cómo dijo el cliente que pagaría. Si lo eligió, es el único que puede marcar. */
                          MetodoPago metodoPagoCliente,
                          List<PasoHistorial> historial) {

    public record RepuestoCobrado(String nombre, int cantidad, BigDecimal precioUnitario, BigDecimal subtotal) {}

    public record RepuestoDisponible(Long id, String nombre, BigDecimal precio, int stock) {
        public static RepuestoDisponible de(Repuesto r) {
            return new RepuestoDisponible(r.getId(), r.getNombre(), r.getPrecio(), r.getStock());
        }
    }
}
