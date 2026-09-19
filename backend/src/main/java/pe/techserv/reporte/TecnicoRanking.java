package pe.techserv.reporte;

import java.math.BigDecimal;

public record TecnicoRanking(Long tecnicoId,
                             String nombreCompleto,
                             long ordenesCompletadas,
                             BigDecimal ingresoGenerado) {}
