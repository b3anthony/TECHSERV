package pe.techserv.visita.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import pe.techserv.comun.Especialidad;
import pe.techserv.diagnostico.dto.GuiaTecnico;
import pe.techserv.garantia.dto.GarantiaVisita;
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
                          List<PasoHistorial> historial,
                          /**
                           * Lo que la IA sugiere llevar y revisar, resumido. Solo
                           * mientras la visita esta en curso, y null si no hay
                           * diagnostico listo.
                           */
                          GuiaTecnico guiaIa,
                          @JsonInclude(JsonInclude.Include.ALWAYS) GarantiaVisita garantia,
                          /** Solo mientras está COMPLETADA y aún no se ha registrado el pago. */
                          @JsonInclude(JsonInclude.Include.ALWAYS)
                          DatosCobroVisita datosCobro) {

    public record RepuestoCobrado(String nombre, int cantidad, BigDecimal precioUnitario, BigDecimal subtotal) {}

    public record RepuestoDisponible(Long id, String nombre, BigDecimal precio, int stock, int cantidadCubierta) {
        public static RepuestoDisponible de(Repuesto r) {
            return de(r, 0);
        }
        public static RepuestoDisponible de(Repuesto r, int cantidadCubierta) {
            return new RepuestoDisponible(r.getId(), r.getNombre(), r.getPrecio(), r.getStock(), cantidadCubierta);
        }
    }
}
