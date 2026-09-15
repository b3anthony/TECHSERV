package pe.techserv.panel;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.techserv.comun.RecursoNoEncontrado;
import pe.techserv.orden.EstadoOrden;
import pe.techserv.orden.OrdenServicioRepository;
import pe.techserv.orden.dto.OrdenDetalle;
import pe.techserv.orden.dto.OrdenResumen;

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

    private final OrdenServicioRepository ordenes;

    public ServicioPanel(OrdenServicioRepository ordenes) {
        this.ordenes = ordenes;
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

    /** Los cuatro números de la fila de arriba del panel. Todos calculados. */
    public record Indicadores(long pendientes, long asignadas, long enCamino, long completadasHoy) {}
}
