package pe.techserv.panel.dto;

import jakarta.validation.constraints.NotEmpty;
import pe.techserv.pago.MetodoPago;

import java.util.List;

public record ActualizarMetodosPago(
        @NotEmpty(message = "Acepta al menos un método de pago")
        List<MetodoPago> metodos
) {}
