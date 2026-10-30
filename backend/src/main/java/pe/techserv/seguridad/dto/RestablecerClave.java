package pe.techserv.seguridad.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RestablecerClave(
        String token,

        // Las mismas reglas que RegistroCliente.clave.
        @NotBlank(message = "Escribe una contraseña")
        @Size(min = 8, message = "La contraseña debe tener al menos 8 caracteres")
        String claveNueva) {
}
