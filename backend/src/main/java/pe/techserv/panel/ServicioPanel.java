package pe.techserv.panel;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.techserv.comun.ConflictoEstado;
import pe.techserv.comun.RecursoNoEncontrado;
import pe.techserv.comun.SolicitudInvalida;
import pe.techserv.mype.Tecnico;
import pe.techserv.mype.TecnicoRepository;
import pe.techserv.notificacion.AvisoTecnico;
import pe.techserv.orden.ActorHistorial;
import pe.techserv.orden.EstadoOrden;
import pe.techserv.orden.OrdenHistorial;
import pe.techserv.orden.OrdenHistorialRepository;
import pe.techserv.orden.OrdenServicio;
import pe.techserv.orden.OrdenServicioRepository;
import pe.techserv.orden.dto.OrdenDetalle;
import pe.techserv.orden.dto.OrdenResumen;
import pe.techserv.panel.dto.TecnicoDisponible;
import pe.techserv.visita.ServicioEnlaces;
import pe.techserv.garantia.ServicioGarantia;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * El panel del taller.
 *
 * Todos los metodos reciben el mypeId como PRIMER parametro y se lo pasan a
 * consultas que lo llevan en el WHERE. No hay ni un findById suelto: ese es el
 * unico motivo por el que un administrador no puede leer las ordenes de la
 * competencia, asi que la regla se sostiene aqui o no se sostiene.
 */
@Service
public class ServicioPanel {

    private static final Logger log = LoggerFactory.getLogger(ServicioPanel.class);

    private final OrdenServicioRepository ordenes;
    private final TecnicoRepository tecnicos;
    private final OrdenHistorialRepository historial;
    private final Optional<AvisoTecnico> avisos;
    private final ServicioEnlaces enlaces;
    private final ServicioGarantia garantias;

    @PersistenceContext
    private EntityManager em;

    public ServicioPanel(OrdenServicioRepository ordenes,
                         TecnicoRepository tecnicos,
                         OrdenHistorialRepository historial,
                         Optional<AvisoTecnico> avisos,
                         ServicioEnlaces enlaces, ServicioGarantia garantias) {
        this.ordenes = ordenes;
        this.tecnicos = tecnicos;
        this.historial = historial;
        this.avisos = avisos;
        this.enlaces = enlaces;
        this.garantias = garantias;
    }

    @Transactional(readOnly = true)
    public Page<OrdenResumen> bandeja(Long mypeId, EstadoOrden estado, BusquedaOrdenes.Filtro filtro,
                                      int pagina, int tamano) {
        exigirTecnicoDelTaller(mypeId, filtro);
        var peticion = PageRequest.of(pagina, tamano, BusquedaOrdenes.orden(filtro.orden()));
        return ordenes.findAll(BusquedaOrdenes.filtrar(mypeId, filtro, estado), peticion)
                      .map(OrdenResumen::paraTaller);
    }

    /**
     * Cuántas órdenes de cada etapa cumplen el filtro: los números de las
     * pestañas. Sale del MISMO predicado que la lista, agrupado por estado.
     */
    @Transactional(readOnly = true)
    public ConteosBandeja conteos(Long mypeId, BusquedaOrdenes.Filtro filtro) {
        exigirTecnicoDelTaller(mypeId, filtro);
        var cb = em.getCriteriaBuilder();
        var consulta = cb.createQuery(Object[].class);
        var raiz = consulta.from(OrdenServicio.class);
        consulta.multiselect(raiz.get("estado"), cb.count(raiz))
                .where(BusquedaOrdenes.filtrar(mypeId, filtro, null).toPredicate(raiz, consulta, cb))
                .groupBy(raiz.get("estado"));

        Map<EstadoOrden, Long> porEstado = new EnumMap<>(EstadoOrden.class);
        for (EstadoOrden e : EstadoOrden.values()) {
            porEstado.put(e, 0L);
        }
        long total = 0;
        for (Object[] fila : em.createQuery(consulta).getResultList()) {
            long n = (Long) fila[1];
            porEstado.put((EstadoOrden) fila[0], n);
            total += n;
        }
        return new ConteosBandeja(total, porEstado);
    }

    public record ConteosBandeja(long total, Map<EstadoOrden, Long> porEstado) {}

    /** Filtrar por un técnico de otro taller responde como si no existiera. */
    private void exigirTecnicoDelTaller(Long mypeId, BusquedaOrdenes.Filtro filtro) {
        if (filtro.tecnicoId() != null && tecnicos.findByIdAndMypeId(filtro.tecnicoId(), mypeId).isEmpty()) {
            throw new RecursoNoEncontrado("No se encontró el técnico " + filtro.tecnicoId());
        }
    }

    /**
     * Devuelve 404 —no 403— cuando la orden es de otro taller: quien pregunta no
     * debe poder distinguir "no existe" de "no es tuya".
     */
    @Transactional(readOnly = true)
    public OrdenDetalle detalle(Long mypeId, Long ordenId) {
        return ordenes.findByIdAndMypeId(ordenId, mypeId)
                      .map(garantias::detalleTaller)
                      .orElseThrow(() -> RecursoNoEncontrado.orden(ordenId));
    }

    @Transactional(readOnly = true)
    public Indicadores indicadores(Long mypeId) {
        return new Indicadores(
                ordenes.contarPorEstado(mypeId, EstadoOrden.PENDIENTE),
                ordenes.contarPorEstado(mypeId, EstadoOrden.ASIGNADA)
                        + ordenes.contarPorEstado(mypeId, EstadoOrden.CONFIRMADA),
                ordenes.contarPorEstado(mypeId, EstadoOrden.EN_CAMINO)
                        + ordenes.contarPorEstado(mypeId, EstadoOrden.EN_PROCESO),
                ordenes.completadasHoy(mypeId));
    }

    @Transactional
    public OrdenDetalle asignar(Long mypeId, Long ordenId, Long tecnicoId) {
        OrdenServicio orden = ordenes.findByIdAndMypeId(ordenId, mypeId)
                .orElseThrow(() -> RecursoNoEncontrado.orden(ordenId));

        Tecnico tecnico = tecnicos.findByIdAndMypeId(tecnicoId, mypeId)
                .orElseThrow(() -> new RecursoNoEncontrado("No se encontró el técnico " + tecnicoId));

        // Las órdenes de una especialidad que el taller ya no ofrece (anteriores a
        // "un taller, una especialidad") no tienen técnico que la atienda: esas
        // se pueden dar a cualquiera del equipo, para que no se queden huérfanas.
        boolean especialidadVigente = tecnico.getMype().getEspecialidades().stream()
                .anyMatch(me -> me.getEspecialidad() == orden.getEspecialidad());
        if (especialidadVigente && !tecnico.atiende(orden.getEspecialidad())) {
            throw new SolicitudInvalida(tecnico.getUsuario().getNombreCompleto()
                    + " no atiende " + orden.getEspecialidad().getTitulo());
        }

        if (!tecnico.isDisponible()) {
            throw new SolicitudInvalida("Ese técnico está marcado como no disponible");
        }

        if (!orden.getEstado().permite(EstadoOrden.ASIGNADA)) {
            throw new ConflictoEstado("Una orden "
                    + orden.getEstado().getEtiqueta().toLowerCase()
                    + " ya no se puede asignar");
        }

        EstadoOrden anterior = orden.getEstado();
        orden.setTecnico(tecnico);
        orden.setEstado(EstadoOrden.ASIGNADA);
        ordenes.save(orden);

        anotar(orden, anterior, EstadoOrden.ASIGNADA, ActorHistorial.ADMIN_MYPE,
                "Se asignó a " + tecnico.getUsuario().getNombreCompleto());

        // El correo lo escribe otra persona; aquí solo se dispara. Si falla el envío,
        // la asignación NO se deshace: la orden ya está asignada en la base.
        //
        // Este catch solo cumple esa promesa mientras `avisarAsignacion` NO sea
        // @Transactional. Si alguien se la vuelve a poner, la excepción marca
        // esta transacción como rollback-only antes de llegar aquí, y tragársela
        // no sirve de nada: el commit revienta igual con un 500. Está medido
        // (19 sep 2026) y hay una prueba que lo vigila:
        // AsignacionTest.asignarSigueEnPieAunqueElCorreoFalle.
        avisos.ifPresent(a -> {
            try {
                a.avisarAsignacion(orden);
            } catch (RuntimeException e) {
                log.error("No se pudo avisar al técnico de la orden {}", orden.getCodigo(), e);
            }
        });

        return garantias.detalleTaller(orden);
    }

    /**
     * Un enlace nuevo a la pagina del tecnico, para mandarselo por otro medio
     * (WhatsApp, o si el correo no le llego). Los anteriores siguen valiendo.
     */
    @Transactional
    public String enlaceTecnico(Long mypeId, Long ordenId) {
        OrdenServicio orden = ordenes.findByIdAndMypeId(ordenId, mypeId)
                .orElseThrow(() -> RecursoNoEncontrado.orden(ordenId));
        if (orden.getTecnico() == null) {
            throw new ConflictoEstado("Asigna un técnico antes de pedir su enlace");
        }
        if (orden.getEstado() == EstadoOrden.CANCELADA) {
            throw new ConflictoEstado("La orden está cancelada");
        }
        return enlaces.crear(orden);
    }

    @Transactional(readOnly = true)
    public List<TecnicoDisponible> tecnicos(Long mypeId) {
        Map<Long, Long> carga = tecnicos.cargaDeHoy(mypeId).stream()
                .filter(c -> c.getTecnicoId() != null)
                .collect(Collectors.toMap(
                        TecnicoRepository.CargaTecnico::getTecnicoId,
                        c -> c.getAbiertas() == null ? 0L : c.getAbiertas(),
                        (existente, reemplazo) -> existente));

        Map<Long, TecnicoRepository.CalificacionTecnico> notas = tecnicos.calificaciones(mypeId).stream()
                .collect(Collectors.toMap(TecnicoRepository.CalificacionTecnico::getTecnicoId, c -> c));

        // Los dados de baja no vuelven a aparecer: ni en el equipo ni para asignar.
        return tecnicos.findByMypeIdOrderByIdAsc(mypeId).stream()
                .filter(t -> t.getUsuario().isActivo())
                .map(t -> new TecnicoDisponible(
                        t.getId(),
                        t.getUsuario().getNombreCompleto(),
                        t.getUsuario().getNombres(),
                        t.getUsuario().getApellidos(),
                        t.getUsuario().getEmail(),
                        t.getUsuario().getTelefono(),
                        t.isDisponible(),
                        Set.copyOf(t.getEspecialidades()),
                        carga.getOrDefault(t.getId(), 0L),
                        Optional.ofNullable(notas.get(t.getId()))
                                .map(n -> unDecimal(n.getPromedio())).orElse(null),
                        Optional.ofNullable(notas.get(t.getId()))
                                .map(TecnicoRepository.CalificacionTecnico::getCalificaciones).orElse(0L)))
                .toList();
    }

    private static Double unDecimal(Double valor) {
        return valor == null ? null
                : java.math.BigDecimal.valueOf(valor).setScale(1, java.math.RoundingMode.HALF_UP).doubleValue();
    }

    private void anotar(OrdenServicio orden, EstadoOrden desde, EstadoOrden hasta,
                        ActorHistorial actor, String nota) {
        OrdenHistorial paso = new OrdenHistorial();
        paso.setOrden(orden);
        paso.setEstadoAnterior(desde);
        paso.setEstadoNuevo(hasta);
        paso.setActor(actor);
        paso.setNota(nota);
        historial.save(paso);
        orden.getHistorial().add(paso);
    }

    /** Los cuatro números de la fila de arriba del panel. Todos calculados. */
    public record Indicadores(long pendientes, long asignadas, long enCamino, long completadasHoy) {}
}
