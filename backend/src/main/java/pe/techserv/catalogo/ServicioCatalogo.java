package pe.techserv.catalogo;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.techserv.comun.Especialidad;
import pe.techserv.comun.RecursoNoEncontrado;
import pe.techserv.mype.MypeRepository;
import pe.techserv.mype.TecnicoRepository;
import pe.techserv.orden.OrdenServicioRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

/** La parte pública: qué se puede pedir y a quién. Sin sesión. */
@Service
public class ServicioCatalogo {

    /** Las franjas que ofrece la plataforma. Media mañana y media tarde. */
    public static final List<LocalTime> FRANJAS = List.of(
            LocalTime.of(8, 0), LocalTime.of(9, 0), LocalTime.of(10, 0), LocalTime.of(11, 0),
            LocalTime.of(14, 0), LocalTime.of(15, 0), LocalTime.of(16, 0));

    private final MypeRepository mypes;
    private final TecnicoRepository tecnicos;
    private final OrdenServicioRepository ordenes;

    public ServicioCatalogo(MypeRepository mypes, TecnicoRepository tecnicos,
                            OrdenServicioRepository ordenes) {
        this.mypes = mypes;
        this.tecnicos = tecnicos;
        this.ordenes = ordenes;
    }

    public List<EspecialidadResumen> especialidades() {
        return java.util.Arrays.stream(Especialidad.values())
                .map(EspecialidadResumen::de)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<MypeCatalogo> talleres(Especialidad especialidad, String distrito) {
        LocalDate hoy = LocalDate.now();

        return mypes.buscarPorEspecialidad(especialidad,
                        (distrito == null || distrito.isBlank()) ? null : distrito)
                .stream()
                .map(r -> new MypeCatalogo(
                        r.getId(), r.getRazonSocial(), r.getDescripcion(),
                        r.getDireccion(), r.getDistrito(), r.getTarifaBase(),
                        redondear(r.getPromedio()), r.getServicios(),
                        !franjasLibres(r.getId(), hoy).isEmpty()))
                .toList();
    }

    /**
     * La agenda de un taller para un día: qué franjas quedan.
     *
     * El aforo de una franja es el número de técnicos activos del taller, no uno.
     * Un taller con tres técnicos puede atender tres visitas a las diez; fijar el
     * tope en uno sería modelar mal el negocio y dejar al taller sin vender.
     */
    @Transactional(readOnly = true)
    public AgendaDia agenda(Long mypeId, LocalDate fecha) {
        if (mypes.findById(mypeId).filter(m -> m.isActivo()).isEmpty()) {
            throw new RecursoNoEncontrado("No se encontró el taller " + mypeId);
        }
        long aforo = aforoDe(mypeId);
        Map<LocalTime, Long> ocupacion = ocupacionDe(mypeId, fecha);

        List<Franja> franjas = FRANJAS.stream()
                .map(hora -> {
                    long ocupadas = ocupacion.getOrDefault(hora, 0L);
                    boolean pasada = fecha.isEqual(LocalDate.now())
                                  && hora.isBefore(LocalTime.now());
                    return new Franja(hora, ocupadas < aforo && !pasada, Math.max(aforo - ocupadas, 0));
                })
                .sorted(Comparator.comparing(Franja::hora))
                .toList();

        return new AgendaDia(fecha, aforo, franjas);
    }

    /** Si una franja concreta admite una reserva más. Lo usa la Fase 4 al crear. */
    @Transactional(readOnly = true)
    public boolean hayCupo(Long mypeId, LocalDate fecha, LocalTime hora) {
        return ordenes.ocupacionEnFranja(mypeId, fecha, hora) < aforoDe(mypeId);
    }

    public long aforoDe(Long mypeId) {
        // Un taller sin técnicos disponibles no puede comprometerse a nada.
        return tecnicos.countByMypeIdAndDisponibleTrue(mypeId);
    }

    private List<LocalTime> franjasLibres(Long mypeId, LocalDate fecha) {
        long aforo = aforoDe(mypeId);
        if (aforo == 0) {
            return List.of();
        }
        Map<LocalTime, Long> ocupacion = ocupacionDe(mypeId, fecha);
        return FRANJAS.stream()
                .filter(h -> ocupacion.getOrDefault(h, 0L) < aforo)
                .filter(h -> !(fecha.isEqual(LocalDate.now()) && h.isBefore(LocalTime.now())))
                .toList();
    }

    private Map<LocalTime, Long> ocupacionDe(Long mypeId, LocalDate fecha) {
        return ordenes.ocupacionDelDia(mypeId, fecha).stream()
                .collect(java.util.stream.Collectors.toMap(
                        OrdenServicioRepository.FranjaOcupada::getHora,
                        OrdenServicioRepository.FranjaOcupada::getOcupadas,
                        Long::sum));
    }

    private static Double redondear(Double valor) {
        if (valor == null) {
            return 0.0;
        }
        return BigDecimal.valueOf(valor).setScale(1, RoundingMode.HALF_UP).doubleValue();
    }

    public record AgendaDia(LocalDate fecha, long aforo, List<Franja> franjas) {}

    public record Franja(LocalTime hora, boolean disponible, long cuposLibres) {}

    /** Atajo para las pruebas y para el servicio de reservas. */
    public static final Function<LocalTime, Boolean> ES_FRANJA_VALIDA = FRANJAS::contains;
}
