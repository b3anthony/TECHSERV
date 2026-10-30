package pe.techserv.garantia.dto;

import java.time.OffsetDateTime;
import java.util.List;

public record GarantiaVisita(String codigoOriginal, OffsetDateTime fechaReparacion,
                            OffsetDateTime venceEn, String diagnosticoAnterior,
                            List<GarantiaResumen.RepuestoCubierto> repuestosInstalados,
                            List<String> fotosAnteriores) {
    public static GarantiaVisita de(AntecedenteGarantia datos) {
        return datos == null ? null : new GarantiaVisita(datos.codigoOriginal(), datos.fechaReparacion(),
                datos.venceEn(), datos.diagnosticoAnterior(), datos.repuestosInstalados().stream()
                    .map(r -> new GarantiaResumen.RepuestoCubierto(r.nombre(), r.cantidad())).toList(),
                datos.fotosAnteriores());
    }
}
