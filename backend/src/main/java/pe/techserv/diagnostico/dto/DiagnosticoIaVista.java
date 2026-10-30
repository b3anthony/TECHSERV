package pe.techserv.diagnostico.dto;

import pe.techserv.diagnostico.EstadoDiagnostico;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * El diagnostico como lo ve el admin del taller. Solo sale por /api/panel:
 * el cliente no lo ve nunca.
 *
 * Los repuestos del inventario traen nombre, precio y stock de la base de
 * datos, no del texto de la IA.
 */
public record DiagnosticoIaVista(EstadoDiagnostico estado,
                                 String modelo,
                                 OffsetDateTime generadoEn,
                                 Integer fotosAnalizadas,
                                 Integer fotosOmitidas,
                                 String error,
                                 Equipo equipo,
                                 String resumen,
                                 List<Falla> posiblesFallas,
                                 List<RepuestoSugerido> repuestosInventario,
                                 List<OtroRepuesto> otrosRepuestos,
                                 List<String> precauciones,
                                 List<String> herramientas) {

    public record Equipo(String tipo, String marca, String modelo, String fuente) {}

    public record Falla(String falla, String probabilidad, String explicacion, String solucion) {}

    public record RepuestoSugerido(Long repuestoId, String nombre, BigDecimal precio,
                                   int stock, String motivo) {}

    public record OtroRepuesto(String nombre, String motivo) {}

    public static DiagnosticoIaVista soloEstado(EstadoDiagnostico estado) {
        return new DiagnosticoIaVista(estado, null, null, null, null, null,
                                      null, null, null, null, null, null, null);
    }
}
