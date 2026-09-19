package pe.techserv.panel.dto;

import jakarta.validation.constraints.NotNull;
import pe.techserv.pago.MetodoPago;

public record RegistroPago(
        @NotNull(message = "El método de pago es obligatorio")
        MetodoPago metodo
) {}
