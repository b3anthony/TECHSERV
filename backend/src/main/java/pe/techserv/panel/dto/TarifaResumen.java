package pe.techserv.panel.dto;

import pe.techserv.comun.Especialidad;
import pe.techserv.mype.MypeEspecialidad;

import java.math.BigDecimal;

public record TarifaResumen(
        Especialidad especialidad,
        String titulo,
        BigDecimal tarifaBase
) {
    public static TarifaResumen de(MypeEspecialidad me) {
        return new TarifaResumen(
                me.getEspecialidad(),
                me.getEspecialidad().getTitulo(),
                me.getTarifaBase()
        );
    }
}
