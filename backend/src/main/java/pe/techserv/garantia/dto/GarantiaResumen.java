package pe.techserv.garantia.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.OffsetDateTime;
import java.util.List;

public record GarantiaResumen(OffsetDateTime venceEn, boolean vigente, int dias,
                              List<RepuestoCubierto> repuestos,
                              @JsonInclude(JsonInclude.Include.ALWAYS) AtencionAbierta atencionAbierta) {
    public record RepuestoCubierto(String nombre, int cantidad) {}
    public record AtencionAbierta(Long id, String codigo) {}
}
