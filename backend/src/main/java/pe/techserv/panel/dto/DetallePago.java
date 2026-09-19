package pe.techserv.panel.dto;

import pe.techserv.pago.EstadoPago;
import pe.techserv.pago.MetodoPago;
import pe.techserv.pago.Pago;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record DetallePago(
        Long id,
        Long ordenId,
        MetodoPago metodo,
        BigDecimal monto,
        EstadoPago estado,
        OffsetDateTime pagadoEn
) {
    public static DetallePago de(Pago p) {
        return new DetallePago(
                p.getId(),
                p.getOrden().getId(),
                p.getMetodo(),
                p.getMonto(),
                p.getEstado(),
                p.getPagadoEn()
        );
    }
}
