package pe.techserv.panel.dto;

import pe.techserv.mype.Repuesto;

import java.math.BigDecimal;

public record RepuestoResumen(
        Long id,
        String nombre,
        String descripcion,
        BigDecimal precio,
        int stock,
        boolean activo
) {
    public static RepuestoResumen de(Repuesto r) {
        return new RepuestoResumen(
                r.getId(),
                r.getNombre(),
                r.getDescripcion(),
                r.getPrecio(),
                r.getStock(),
                r.isActivo()
        );
    }
}
