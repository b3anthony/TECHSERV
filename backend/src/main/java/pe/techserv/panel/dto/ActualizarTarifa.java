package pe.techserv.panel.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record ActualizarTarifa(
        @NotNull(message = "La tarifa base es obligatoria")
        @DecimalMin(value = "0.01", message = "La tarifa base debe ser mayor que 0")
        @DecimalMax(value = "9999.99", message = "La tarifa base no puede ser mayor que 9999.99")
        @Digits(integer = 6, fraction = 2, message = "La tarifa base debe tener como máximo 6 enteros y 2 decimales")
        BigDecimal tarifaBase
) {}
