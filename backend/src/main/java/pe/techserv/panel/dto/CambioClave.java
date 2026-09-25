package pe.techserv.panel.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CambioClave(
        @NotBlank(message = "Escribe tu contraseña actual")
        String claveActual,

        @NotBlank(message = "Escribe la contraseña nueva")
        @Size(min = 8, message = "La contraseña debe tener al menos 8 caracteres")
        String claveNueva
) {}
