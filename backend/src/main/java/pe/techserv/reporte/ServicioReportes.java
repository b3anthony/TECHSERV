package pe.techserv.reporte;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.techserv.comun.SolicitudInvalida;
import pe.techserv.mype.TecnicoRepository;
import pe.techserv.orden.CalificacionRepository;
import pe.techserv.orden.EstadoOrden;
import pe.techserv.orden.OrdenHistorialRepository;
import pe.techserv.orden.OrdenServicioRepository;
import pe.techserv.pago.PagoRepository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Cálculo de KPIs y reportes del taller para el panel de administración.
 *
 * Todas las consultas reciben el mypeId como primer filtro para garantizar
 * el aislamiento estricto multi-inquilino.
 */
@Service
public class ServicioReportes {

    public static final ZoneId ZONA_LIMA = ZoneId.of("America/Lima");

    private final PagoRepository pagos;
    private final OrdenServicioRepository ordenes;
    private final OrdenHistorialRepository historial;
    private final CalificacionRepository calificaciones;
    private final TecnicoRepository tecnicos;

    public ServicioReportes(PagoRepository pagos,
                            OrdenServicioRepository ordenes,
                            OrdenHistorialRepository historial,
                            CalificacionRepository calificaciones,
                            TecnicoRepository tecnicos) {
        this.pagos = pagos;
        this.ordenes = ordenes;
        this.historial = historial;
        this.calificaciones = calificaciones;
        this.tecnicos = tecnicos;
    }

    @Transactional(readOnly = true)
    public ReportePanel generar(Long mypeId, LocalDate desde, LocalDate hasta) {
        if (hasta == null) {
            hasta = LocalDate.now(ZONA_LIMA);
        }
        if (desde == null) {
            desde = hasta.minusDays(29);
        }
        if (desde.isAfter(hasta)) {
            throw new SolicitudInvalida("La fecha de inicio no puede ser posterior a la de fin");
        }

        OffsetDateTime desdeInstante = desde.atStartOfDay(ZONA_LIMA).toOffsetDateTime();
        OffsetDateTime hastaInstante = hasta.atTime(23, 59, 59, 999_999_000).atZone(ZONA_LIMA).toOffsetDateTime();

        BigDecimal ingresos = pagos.ingresosEntre(mypeId, desdeInstante, hastaInstante);
        if (ingresos == null) {
            ingresos = BigDecimal.ZERO;
        }

        Map<EstadoOrden, Long> ordenesPorEstado = new LinkedHashMap<>();
        for (EstadoOrden estado : EstadoOrden.values()) {
            ordenesPorEstado.put(estado, 0L);
        }
        for (OrdenServicioRepository.ConteoEstado conteo : ordenes.contarPorEstadoEnPeriodo(mypeId, desdeInstante, hastaInstante)) {
            ordenesPorEstado.put(conteo.getEstado(), conteo.getTotal());
        }

        long ordenesCreadas = ordenes.ordenesCreadasEntre(mypeId, desdeInstante, hastaInstante);

        Double horasMedias = historial.horasMediasDeAtencion(mypeId, desdeInstante, hastaInstante);

        long serviciosCalificados = calificaciones.serviciosCalificados(mypeId);
        Double calificacionPromedio = calificaciones.promedioDeLaMype(mypeId);

        List<TecnicoRanking> ranking = tecnicos.rankingTecnicos(mypeId, desdeInstante, hastaInstante)
                .stream()
                .map(p -> new TecnicoRanking(
                        p.getTecnicoId(),
                        p.getNombreCompleto(),
                        p.getOrdenesCompletadas() != null ? p.getOrdenesCompletadas() : 0L,
                        p.getIngresoGenerado() != null ? p.getIngresoGenerado() : BigDecimal.ZERO))
                .toList();

        return new ReportePanel(
                ingresos,
                ordenesPorEstado,
                ordenesCreadas,
                horasMedias,
                calificacionPromedio,
                serviciosCalificados,
                ranking
        );
    }
}
