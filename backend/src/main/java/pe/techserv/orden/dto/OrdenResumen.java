package pe.techserv.orden.dto;

import pe.techserv.comun.Especialidad;
import pe.techserv.orden.EstadoOrden;
import pe.techserv.orden.OrdenServicio;

import java.time.LocalDate;
import java.time.LocalTime;

/** Una orden tal como se ve en la bandeja del taller: una tarjeta de la lista. */
public record OrdenResumen(Long id,
                           String codigo,
                           EstadoOrden estado,
                           String etiquetaEstado,
                           Especialidad especialidad,
                           String etiquetaEspecialidad,
                           String descripcionFalla,
                           String clienteNombre,
                           String direccion,
                           String distrito,
                           LocalDate fechaProgramada,
                           LocalTime horaProgramada,
                           String tecnicoNombre,
                           int cantidadFotos) {

    public static OrdenResumen de(OrdenServicio o) {
        return new OrdenResumen(
                o.getId(),
                o.getCodigo(),
                o.getEstado(),
                o.getEstado().getEtiqueta(),
                o.getEspecialidad(),
                o.getEspecialidad().getTitulo(),
                o.getDescripcionFalla(),
                o.getCliente().getUsuario().getNombreCompleto(),
                o.getDireccion(),
                o.getDistrito(),
                o.getFechaProgramada(),
                o.getHoraProgramada(),
                o.getTecnico() == null ? null : o.getTecnico().getUsuario().getNombreCompleto(),
                o.getFotos().size());
    }
}
