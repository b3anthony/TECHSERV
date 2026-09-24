package pe.techserv.panel;

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

    public ServicioPanel(OrdenServicioRepository ordenes,
                         TecnicoRepository tecnicos,
                         OrdenHistorialRepository historial,
                         Optional<AvisoTecnico> avisos) {
        this.ordenes = ordenes;
        this.tecnicos = tecnicos;
        this.historial = historial;
        this.avisos = avisos;
    }

    @Transactional(readOnly = true)
    public Page<OrdenResumen> bandeja(Long mypeId, EstadoOrden estado, int pagina, int tamano) {
        var peticion = PageRequest.of(pagina, tamano);
        var resultado = (estado == null)
                ? ordenes.findByMypeIdOrderByFechaProgramadaDescHoraProgramadaDesc(mypeId, peticion)
                : ordenes.findByMypeIdAndEstadoOrderByFechaProgramadaDescHoraProgramadaDesc(
                        mypeId, estado, peticion);
        return resultado.map(OrdenResumen::de);
    }

    /**
     * Devuelve 404 —no 403— cuando la orden es de otro taller: quien pregunta no
     * debe poder distinguir "no existe" de "no es tuya".
     */
    @Transactional(readOnly = true)
    public OrdenDetalle detalle(Long mypeId, Long ordenId) {
        return ordenes.findByIdAndMypeId(ordenId, mypeId)
                      .map(OrdenDetalle::de)
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

        if (!tecnico.atiende(orden.getEspecialidad())) {
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

        return OrdenDetalle.de(orden);
    }

    @Transactional(readOnly = true)
    public List<TecnicoDisponible> tecnicos(Long mypeId) {
        Map<Long, Long> carga = tecnicos.cargaDeHoy(mypeId).stream()
                .filter(c -> c.getTecnicoId() != null)
                .collect(Collectors.toMap(
                        TecnicoRepository.CargaTecnico::getTecnicoId,
                        c -> c.getAbiertas() == null ? 0L : c.getAbiertas(),
                        (existente, reemplazo) -> existente));

        return tecnicos.findByMypeIdOrderByIdAsc(mypeId).stream()
                .map(t -> new TecnicoDisponible(
                        t.getId(),
                        t.getUsuario().getNombreCompleto(),
                        t.getUsuario().getEmail(),
                        t.getUsuario().getTelefono(),
                        t.isDisponible(),
                        Set.copyOf(t.getEspecialidades()),
                        carga.getOrDefault(t.getId(), 0L)))
                .toList();
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
