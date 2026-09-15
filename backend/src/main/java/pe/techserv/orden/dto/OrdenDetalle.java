package pe.techserv.orden.dto;

import pe.techserv.comun.Especialidad;
import pe.techserv.orden.EstadoOrden;
import pe.techserv.orden.OrdenServicio;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;

/** Todo lo que hace falta para atender una orden, en una sola respuesta. */
public record OrdenDetalle(Long id,
                           String codigo,
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
                           String tecnicoNombre,
                           Long tecnicoId,
                           String diagnostico,
                           BigDecimal precioManoObra,
                           BigDecimal total,
                           OffsetDateTime creadaEn,
                           List<String> fotos,
                           List<PasoHistorial> historial,
                           List<RepuestoUsado> repuestos) {

    public record RepuestoUsado(String nombre, int cantidad,
                                BigDecimal precioUnitario, BigDecimal subtotal) {}

    public static OrdenDetalle de(OrdenServicio o) {
        return new OrdenDetalle(
                o.getId(), o.getCodigo(), o.getEstado(), o.getEstado().getEtiqueta(),
                o.getEspecialidad(), o.getEspecialidad().getTitulo(),
                o.getDescripcionFalla(),
                o.getCliente().getUsuario().getNombreCompleto(),
                o.getCliente().getUsuario().getTelefono(),
                o.getDireccion(), o.getReferencia(), o.getDistrito(), o.urlMapa(),
                o.getFechaProgramada(), o.getHoraProgramada(),
                o.getTecnico() == null ? null : o.getTecnico().getUsuario().getNombreCompleto(),
                o.getTecnico() == null ? null : o.getTecnico().getId(),
                o.getDiagnostico(), o.getPrecioManoObra(), o.getTotal(), o.getCreadaEn(),
                o.getFotos().stream().map(f -> f.getRuta()).toList(),
                o.getHistorial().stream().map(PasoHistorial::de).toList(),
                o.getRepuestos().stream()
                 .map(r -> new RepuestoUsado(r.getRepuesto().getNombre(), r.getCantidad(),
                                             r.getPrecioUnitario(), r.subtotal()))
                 .toList());
    }
}
