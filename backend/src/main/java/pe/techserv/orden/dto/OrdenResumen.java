package pe.techserv.orden.dto;

import pe.techserv.comun.Especialidad;
import pe.techserv.orden.EstadoOrden;
import pe.techserv.orden.OrdenHistorial;
import pe.techserv.orden.OrdenServicio;
import pe.techserv.orden.TipoOrden;
import pe.techserv.garantia.dto.GarantiaResumen;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Comparator;

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
                           int cantidadFotos,
                           /** Solo para el taller: la nota del técnico que dijo que no puede ir, si es lo último que pasó. */
                           String rechazo,
                           TipoOrden tipo,
                           Long mypeId,
                           GarantiaResumen garantia) {

    /** Para el cliente: sin los asuntos entre el técnico y el taller. */
    public static OrdenResumen de(OrdenServicio o) {
        return componer(o, null, null);
    }

    public static OrdenResumen de(OrdenServicio o, GarantiaResumen garantia) {
        return componer(o, null, garantia);
    }

    /** Para la bandeja del taller: avisa si el técnico devolvió la orden y hay que asignarla otra vez. */
    public static OrdenResumen paraTaller(OrdenServicio o) {
        String rechazo = o.getEstado() != EstadoOrden.PENDIENTE ? null
                : o.getHistorial().stream()
                        .max(Comparator.comparing(OrdenHistorial::getOcurridoEn).thenComparing(OrdenHistorial::getId))
                        .filter(OrdenHistorial::esRechazoDelTecnico)
                        .map(OrdenHistorial::getNota)
                        .orElse(null);
        return componer(o, rechazo, null);
    }

    private static OrdenResumen componer(OrdenServicio o, String rechazo, GarantiaResumen garantia) {
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
                o.getFotos().size(),
                rechazo, o.getTipo(), o.getMype().getId(), garantia);
    }
}
