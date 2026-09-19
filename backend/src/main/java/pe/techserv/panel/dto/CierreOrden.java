package pe.techserv.panel.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;

public record CierreOrden(
        @NotBlank(message = "El diagnóstico es obligatorio")
        @Size(max = 2000, message = "El diagnóstico no puede superar los 2000 caracteres")
        String diagnostico,

        @NotNull(message = "El precio de mano de obra es obligatorio")
        @DecimalMin(value = "0.00", message = "El precio de mano de obra debe ser mayor o igual a 0")
        @Digits(integer = 8, fraction = 2, message = "El precio de mano de obra debe tener como máximo 8 enteros y 2 decimales")
        BigDecimal precioManoObra,

        @Valid
        List<RepuestoUsado> repuestos
) {}
