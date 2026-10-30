package pe.techserv.seguridad.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RecuperarClave(
        @NotBlank(message = "Escribe tu correo")
        @Email(message = "El correo no tiene un formato válido")
        @Size(max = 160) String email) {
}
