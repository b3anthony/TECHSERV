package pe.techserv.panel;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.techserv.comun.ConflictoEstado;
import pe.techserv.comun.RecursoNoEncontrado;
import pe.techserv.comun.SolicitudInvalida;
import pe.techserv.mype.Repuesto;
import pe.techserv.mype.Tecnico;
import pe.techserv.mype.RepuestoRepository;
import pe.techserv.orden.ActorHistorial;
import pe.techserv.orden.EstadoOrden;
import pe.techserv.orden.OrdenHistorial;
import pe.techserv.orden.OrdenHistorialRepository;
import pe.techserv.orden.OrdenRepuesto;
import pe.techserv.orden.OrdenServicio;
import pe.techserv.orden.OrdenServicioRepository;
import pe.techserv.orden.dto.OrdenDetalle;
import pe.techserv.pago.EstadoPago;
import pe.techserv.pago.Pago;
import pe.techserv.pago.PagoRepository;
import pe.techserv.panel.dto.CierreOrden;
import pe.techserv.panel.dto.DetallePago;
import pe.techserv.panel.dto.RegistroPago;
import pe.techserv.panel.dto.RepuestoUsado;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Servicio encargado de avanzar la orden a proceso, cerrarla calculando repuestos
 * y registrar el cobro correspondiente.
 *
 * Sigue la regla multi-inquilino de pe.techserv.panel: mypeId como primer parámetro
 * y siempre presente en el WHERE de las consultas.
 */
@Service
public class ServicioCierre {

    private final OrdenServicioRepository ordenes;
    private final RepuestoRepository repuestos;
    private final OrdenHistorialRepository historial;
    private final PagoRepository pagos;

    public ServicioCierre(OrdenServicioRepository ordenes,
                          RepuestoRepository repuestos,
                          OrdenHistorialRepository historial,
                          PagoRepository pagos) {
        this.ordenes = ordenes;
        this.repuestos = repuestos;
        this.historial = historial;
        this.pagos = pagos;
    }

    @Transactional
    public OrdenDetalle pasarAEnProceso(Long mypeId, Long ordenId) {
        return pasarAEnProceso(mypeId, ordenId, ActorHistorial.ADMIN_MYPE, "El técnico empezó el trabajo");
    }

    /** Lo mismo, diciendo quien lo hizo: el taller desde el panel o el tecnico desde su pagina. */
    @Transactional
    public OrdenDetalle pasarAEnProceso(Long mypeId, Long ordenId, ActorHistorial actor, String nota) {
        OrdenServicio orden = ordenes.bloquear(ordenId, mypeId)
                .orElseThrow(() -> RecursoNoEncontrado.orden(ordenId));

        if (!orden.getEstado().permite(EstadoOrden.EN_PROCESO)) {
            throw new ConflictoEstado("Una orden "
                    + orden.getEstado().getEtiqueta().toLowerCase()
                    + " no puede pasar a en proceso");
        }

        EstadoOrden anterior = orden.getEstado();
        orden.setEstado(EstadoOrden.EN_PROCESO);
        ordenes.save(orden);

        anotar(orden, anterior, EstadoOrden.EN_PROCESO, actor, nota);

        return OrdenDetalle.de(orden);
    }

    @Transactional
    public OrdenDetalle cerrar(Long mypeId, Long ordenId, CierreOrden peticion) {
        return cerrar(mypeId, ordenId, peticion, ActorHistorial.ADMIN_MYPE, "El taller cerró la orden");
    }

    @Transactional
    public OrdenDetalle cerrar(Long mypeId, Long ordenId, CierreOrden peticion,
                               ActorHistorial actor, String nota) {
        OrdenServicio orden = ordenes.bloquear(ordenId, mypeId)
                .orElseThrow(() -> RecursoNoEncontrado.orden(ordenId));

        boolean puedeCerrar = (orden.getEstado() == EstadoOrden.EN_PROCESO)
                || (orden.getEstado() == EstadoOrden.COMPLETADA && orden.getTotal() == null);
        if (!puedeCerrar) {
            throw new ConflictoEstado("Una orden "
                    + orden.getEstado().getEtiqueta().toLowerCase()
                    + " no se puede cerrar");
        }

        Map<Long, Integer> repuestosAgrupados = new LinkedHashMap<>();
        if (peticion.repuestos() != null) {
            for (RepuestoUsado item : peticion.repuestos()) {
                if (item.cantidad() == null || item.cantidad() < 1) {
                    throw new SolicitudInvalida("La cantidad de repuesto debe ser mayor o igual a 1");
                }
                repuestosAgrupados.merge(item.repuestoId(), item.cantidad(), Integer::sum);
            }
        }

        BigDecimal totalRepuestos = BigDecimal.ZERO;
        for (Map.Entry<Long, Integer> entrada : repuestosAgrupados.entrySet()) {
            Long repuestoId = entrada.getKey();
            int cantidad = entrada.getValue();

            Repuesto repuesto = repuestos.findByIdAndMypeId(repuestoId, mypeId)
                    .orElseThrow(() -> new RecursoNoEncontrado("No se encontró el repuesto " + repuestoId));

            if (!repuesto.isActivo()) {
                throw new SolicitudInvalida("El repuesto " + repuesto.getNombre() + " no está activo");
            }

            if (cantidad > repuesto.getStock()) {
                throw new ConflictoEstado("No hay stock suficiente de " + repuesto.getNombre());
            }

            OrdenRepuesto linea = new OrdenRepuesto();
            linea.setOrden(orden);
            linea.setRepuesto(repuesto);
            linea.setCantidad(cantidad);
            linea.setPrecioUnitario(repuesto.getPrecio());
            orden.getRepuestos().add(linea);

            repuesto.setStock(repuesto.getStock() - cantidad);
            repuestos.save(repuesto);

            totalRepuestos = totalRepuestos.add(linea.subtotal());
        }

        BigDecimal total = peticion.precioManoObra().add(totalRepuestos);
        orden.setDiagnostico(peticion.diagnostico().trim());
        orden.setPrecioManoObra(peticion.precioManoObra());
        orden.setTotal(total);

        if (orden.getEstado() == EstadoOrden.EN_PROCESO) {
            orden.setEstado(EstadoOrden.COMPLETADA);
            ordenes.save(orden);
            anotar(orden, EstadoOrden.EN_PROCESO, EstadoOrden.COMPLETADA, actor, nota);
        } else {
            ordenes.save(orden);
        }

        return OrdenDetalle.de(orden);
    }

    /**
     * El pago de una orden, si ya se registró. Acotado por mype como todo lo
     * demás: la orden de otro taller responde 404, igual que una inexistente.
     */
    @Transactional(readOnly = true)
    public java.util.Optional<DetallePago> pagoDe(Long mypeId, Long ordenId) {
        OrdenServicio orden = ordenes.findByIdAndMypeId(ordenId, mypeId)
                .orElseThrow(() -> RecursoNoEncontrado.orden(ordenId));
        return pagos.findByOrdenId(orden.getId()).map(DetallePago::de);
    }

    @Transactional
    public DetallePago registrarPago(Long mypeId, Long ordenId, RegistroPago peticion) {
        return registrarPago(mypeId, ordenId, peticion, null);
    }

    /**
     * @param cobradoPor el tecnico que recibio el dinero en el domicilio, o null
     *                   si lo registra el taller desde el panel
     */
    @Transactional
    public DetallePago registrarPago(Long mypeId, Long ordenId, RegistroPago peticion, Tecnico cobradoPor) {
        OrdenServicio orden = ordenes.bloquear(ordenId, mypeId)
                .orElseThrow(() -> RecursoNoEncontrado.orden(ordenId));

        boolean valida = (orden.getEstado() == EstadoOrden.COMPLETADA || orden.getEstado() == EstadoOrden.CALIFICADA)
                && orden.getTotal() != null;
        if (!valida) {
            throw new ConflictoEstado("Cierra la orden antes de registrar el pago");
        }

        if (pagos.findByOrdenId(orden.getId()).isPresent()) {
            throw new ConflictoEstado("Esa orden ya tiene un pago registrado");
        }

        Pago pago = new Pago();
        pago.setOrden(orden);
        pago.setMetodo(peticion.metodo());
        pago.setMonto(orden.getTotal());
        pago.setEstado(EstadoPago.PAGADO);
        pago.setPagadoEn(OffsetDateTime.now());
        pago.setCobradoPor(cobradoPor);
        pagos.save(pago);

        return DetallePago.de(pago);
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
}
