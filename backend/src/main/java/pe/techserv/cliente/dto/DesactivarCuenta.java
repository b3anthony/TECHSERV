package pe.techserv.cliente.dto;

import jakarta.validation.constraints.NotBlank;

public record DesactivarCuenta(
        @NotBlank(message = "Escribe tu contraseña")
        String clave
) {}
