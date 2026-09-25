package pe.techserv.panel.dto;

import jakarta.validation.constraints.NotBlank;

/** Dos frenos: la contraseña, y escribir ELIMINAR a mano. */
public record EliminarCuenta(
        @NotBlank(message = "Escribe tu contraseña")
        String clave,

        @NotBlank(message = "Escribe ELIMINAR para confirmar")
        String confirmacion
) {}
