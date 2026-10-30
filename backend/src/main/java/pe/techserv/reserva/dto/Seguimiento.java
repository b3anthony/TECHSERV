package pe.techserv.reserva.dto;

import pe.techserv.orden.EstadoOrden;
import pe.techserv.orden.OrdenHistorial;
import pe.techserv.orden.OrdenServicio;
import pe.techserv.orden.OrigenFoto;
import pe.techserv.orden.dto.OrdenDetalle;
import pe.techserv.orden.dto.PasoHistorial;
import pe.techserv.orden.TipoOrden;
import pe.techserv.garantia.dto.GarantiaResumen;
import pe.techserv.garantia.dto.AntecedenteGarantia;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Comparator;
import java.util.List;

public record Seguimiento(String codigo,
                          EstadoOrden estado,
                          String etiquetaEstado,
                          String tallerNombre,
                          String tecnicoNombre,   // null mientras no haya
                          LocalDate fechaProgramada,
                          LocalTime horaProgramada,
                          List<PasoHistorial> pasos,
                          boolean puedeCancelar,
                          boolean puedeCalificar,
                          List<String> fotosTrabajo,
                          TipoOrden tipo,
                          GarantiaResumen garantia,
                          AntecedenteGarantia atencionGarantia) {

    public static Seguimiento de(OrdenServicio orden, boolean tieneCalificacion) {
        return de(orden, tieneCalificacion, null, null);
    }

    public static Seguimiento de(OrdenServicio orden, boolean tieneCalificacion,
                                  GarantiaResumen garantia, AntecedenteGarantia antecedente) {
        boolean puedeCancelar = orden.getEstado().permite(EstadoOrden.CANCELADA);
        boolean puedeCalificar = orden.getEstado() == EstadoOrden.COMPLETADA && !tieneCalificacion;
        List<PasoHistorial> pasos = orden.getHistorial().stream()
                .filter(paso -> !paso.esRechazoDelTecnico())
                .sorted(Comparator.comparing(
                        OrdenHistorial::getOcurridoEn,
                        Comparator.nullsLast(Comparator.naturalOrder())))
                .map(PasoHistorial::de)
                .toList();

        return new Seguimiento(
                orden.getCodigo(),
                orden.getEstado(),
                orden.getEstado().getEtiqueta(),
                orden.getMype().getRazonSocial(),
                orden.getTecnico() == null ? null : orden.getTecnico().getUsuario().getNombreCompleto(),
                orden.getFechaProgramada(),
                orden.getHoraProgramada(),
                pasos,
                puedeCancelar,
                puedeCalificar,
                OrdenDetalle.rutas(orden, OrigenFoto.TECNICO),
                orden.getTipo(), garantia, antecedente
        );
    }
}
