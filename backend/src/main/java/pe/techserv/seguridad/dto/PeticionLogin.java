package pe.techserv.seguridad.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/** El formulario unico de entrada: el mismo para los tres roles. */
public record PeticionLogin(
        @NotBlank(message = "Escribe tu correo")
        @Email(message = "El correo no tiene un formato válido")
        String email,

        @NotBlank(message = "Escribe tu contraseña")
        String clave) {
}
