package pe.techserv.panel.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record RepuestoUsado(
        @NotNull(message = "El repuesto es obligatorio")
        Long repuestoId,

        @NotNull(message = "La cantidad es obligatoria")
        @Min(value = 1, message = "La cantidad debe ser mayor o igual a 1")
        Integer cantidad
) {}
