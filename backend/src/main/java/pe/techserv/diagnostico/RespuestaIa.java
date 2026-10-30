package pe.techserv.diagnostico;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

/**
 * Lo que devuelve la IA, tal cual lo pide el esquema. Es la forma que se
 * guarda en la columna {@code resultado} DESPUES de validarla: los repuestos
 * del inventario solo por id, y solo ids de ese taller.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record RespuestaIa(Equipo equipo,
                          String resumen,
                          List<Falla> posiblesFallas,
                          List<RepuestoElegido> repuestosInventario,
                          List<OtroRepuesto> otrosRepuestos,
                          List<String> precauciones,
                          List<String> herramientas) {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Equipo(String tipo, String marca, String modelo, String fuente) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Falla(String falla, String probabilidad, String explicacion, String solucion) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record RepuestoElegido(Long repuestoId, String motivo) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record OtroRepuesto(String nombre, String motivo) {}
}
