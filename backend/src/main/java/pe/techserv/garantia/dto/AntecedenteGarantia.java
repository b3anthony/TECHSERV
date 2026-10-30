package pe.techserv.garantia.dto;

import java.time.OffsetDateTime;
import java.util.List;

/** Solo los antecedentes de la orden original enlazada. */
public record AntecedenteGarantia(Long ordenOriginalId, String codigoOriginal,
                                 OffsetDateTime fechaReparacion, OffsetDateTime venceEn,
                                 String diagnosticoAnterior, List<RepuestoInstalado> repuestosInstalados,
                                 List<String> fotosAnteriores) {
    public record RepuestoInstalado(Long repuestoId, String nombre, int cantidad) {}
}
