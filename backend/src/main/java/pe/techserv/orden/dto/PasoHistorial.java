package pe.techserv.orden.dto;

import pe.techserv.orden.ActorHistorial;
import pe.techserv.orden.EstadoOrden;
import pe.techserv.orden.OrdenHistorial;

import java.time.OffsetDateTime;

public record PasoHistorial(EstadoOrden estado,
                            String etiqueta,
                            ActorHistorial actor,
                            String nota,
                            OffsetDateTime ocurridoEn) {

    public static PasoHistorial de(OrdenHistorial h) {
        return new PasoHistorial(h.getEstadoNuevo(), h.getEstadoNuevo().getEtiqueta(),
                                 h.getActor(), h.getNota(), h.getOcurridoEn());
    }
}
