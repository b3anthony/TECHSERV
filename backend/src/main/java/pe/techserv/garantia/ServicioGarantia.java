package pe.techserv.garantia;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.techserv.comun.RecursoNoEncontrado;
import pe.techserv.garantia.dto.*;
import pe.techserv.orden.*;
import pe.techserv.orden.dto.OrdenDetalle;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional(readOnly = true)
public class ServicioGarantia {
    public static final List<EstadoOrden> CERRADAS =
            List.of(EstadoOrden.COMPLETADA, EstadoOrden.CALIFICADA, EstadoOrden.CANCELADA);

    private final GarantiaRepository garantias;
    private final OrdenServicioRepository ordenes;

    public ServicioGarantia(GarantiaRepository garantias, OrdenServicioRepository ordenes) {
        this.garantias = garantias;
        this.ordenes = ordenes;
    }

    /** Se une a la transacción del cierre, que ya tiene bloqueada la orden. */
    @Transactional
    public void sellar(OrdenServicio orden) {
        if (orden.getTipo() != TipoOrden.NORMAL
                || garantias.findByOrdenIdAndMypeId(orden.getId(), orden.getMype().getId()).isPresent()) {
            return;
        }
        OffsetDateTime inicio = orden.getHistorial().stream()
                .filter(h -> h.getEstadoNuevo() == EstadoOrden.COMPLETADA)
                .map(OrdenHistorial::getOcurridoEn).min(OffsetDateTime::compareTo)
                .orElse(orden.getActualizadaEn());
        Garantia garantia = new Garantia();
        garantia.setOrden(orden);
        garantia.setMype(orden.getMype());
        garantia.setDias(orden.getMype().getGarantiaDias());
        garantia.setIniciaEn(inicio);
        garantia.setVenceEn(inicio.plusDays(garantia.getDias()));
        garantias.save(garantia);
    }

    public GarantiaResumen resumenCliente(OrdenServicio orden) {
        return resumen(originalCliente(orden));
    }

    public OrdenDetalle detalleCliente(OrdenServicio orden) {
        OrdenServicio original = originalCliente(orden);
        return OrdenDetalle.paraCliente(orden, resumen(original),
                orden.getTipo() == TipoOrden.GARANTIA ? antecedente(original) : null);
    }

    public OrdenDetalle detalleTaller(OrdenServicio orden) {
        OrdenServicio original = originalDelTaller(orden);
        return OrdenDetalle.de(orden, resumen(original),
                orden.getTipo() == TipoOrden.GARANTIA ? antecedente(original) : null);
    }

    public AntecedenteGarantia antecedenteCliente(OrdenServicio orden) {
        return orden.getTipo() == TipoOrden.GARANTIA ? antecedente(originalCliente(orden)) : null;
    }

    public AntecedenteGarantia antecedenteTaller(OrdenServicio orden) {
        return orden.getTipo() == TipoOrden.GARANTIA ? antecedente(originalDelTaller(orden)) : null;
    }

    /** La relación da solo el id; los datos se releen filtrando por el taller. */
    public OrdenServicio originalDelTaller(OrdenServicio orden) {
        if (orden.getTipo() == TipoOrden.NORMAL) return orden;
        Long id = orden.getGarantiaDe().getId();
        return ordenes.findByIdAndMypeId(id, orden.getMype().getId())
                .filter(o -> o.getCliente().getId().equals(orden.getCliente().getId()))
                .orElseThrow(() -> RecursoNoEncontrado.orden(id));
    }

    public Map<Long, Integer> cantidadesCubiertas(OrdenServicio orden) {
        Map<Long, Integer> cantidades = new LinkedHashMap<>();
        if (orden.getTipo() == TipoOrden.GARANTIA) {
            for (OrdenRepuesto r : originalDelTaller(orden).getRepuestos()) {
                cantidades.merge(r.getRepuesto().getId(), r.getCantidad(), Integer::sum);
            }
        }
        return cantidades;
    }

    private OrdenServicio originalCliente(OrdenServicio orden) {
        if (orden.getTipo() == TipoOrden.NORMAL) return orden;
        Long id = orden.getGarantiaDe().getId();
        return ordenes.findByIdAndClienteId(id, orden.getCliente().getId())
                .filter(o -> o.getMype().getId().equals(orden.getMype().getId()))
                .orElseThrow(() -> RecursoNoEncontrado.orden(id));
    }

    private GarantiaResumen resumen(OrdenServicio original) {
        return garantias.findByOrdenIdAndMypeId(original.getId(), original.getMype().getId())
                .map(g -> new GarantiaResumen(g.getVenceEn(), OffsetDateTime.now().isBefore(g.getVenceEn()),
                        g.getDias(), original.getRepuestos().stream()
                            .map(r -> new GarantiaResumen.RepuestoCubierto(r.getRepuesto().getNombre(), r.getCantidad()))
                            .toList(),
                        ordenes.atencionGarantiaAbierta(original.getId(), original.getMype().getId(),
                                original.getCliente().getId(), CERRADAS)
                            .map(o -> new GarantiaResumen.AtencionAbierta(o.getId(), o.getCodigo())).orElse(null)))
                .orElse(null);
    }

    private AntecedenteGarantia antecedente(OrdenServicio original) {
        Garantia g = garantias.findByOrdenIdAndMypeId(original.getId(), original.getMype().getId())
                .orElseThrow(() -> new RecursoNoEncontrado("No se encontró la garantía de " + original.getCodigo()));
        return new AntecedenteGarantia(original.getId(), original.getCodigo(), g.getIniciaEn(), g.getVenceEn(),
                original.getDiagnostico(), original.getRepuestos().stream()
                    .map(r -> new AntecedenteGarantia.RepuestoInstalado(
                            r.getRepuesto().getId(), r.getRepuesto().getNombre(), r.getCantidad())).toList(),
                OrdenDetalle.rutas(original, OrigenFoto.TECNICO));
    }
}
