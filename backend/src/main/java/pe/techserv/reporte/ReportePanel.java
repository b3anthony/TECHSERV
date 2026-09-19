package pe.techserv.reporte;

import com.fasterxml.jackson.annotation.JsonInclude;
import pe.techserv.orden.EstadoOrden;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * Reporte consolidado de KPIs e indicadores del taller para el periodo consultado.
 */
@JsonInclude(JsonInclude.Include.ALWAYS)
public record ReportePanel(
        BigDecimal ingresos,
        Map<EstadoOrden, Long> ordenesPorEstado,
        long ordenesCreadas,
        @JsonInclude(JsonInclude.Include.ALWAYS) Double horasMediasDeAtencion,
        Double calificacionPromedio,
        long serviciosCalificados,
        List<TecnicoRanking> ranking
) {}
