package pe.techserv.seguridad.dto;

import jakarta.validation.constraints.*;

/** "Quiero solicitar un servicio". Crea un usuario con rol CLIENTE. */
public record RegistroCliente(
        @NotBlank(message = "Escribe tus nombres")
        @Size(max = 80) String nombres,

        @NotBlank(message = "Escribe tus apellidos")
        @Size(max = 80) String apellidos,

        @NotBlank(message = "Escribe tu correo")
        @Email(message = "El correo no tiene un formato válido")
        @Size(max = 160) String email,

        @NotBlank(message = "Escribe una contraseña")
        @Size(min = 8, message = "La contraseña debe tener al menos 8 caracteres")
        String clave,

        @Pattern(regexp = "^$|^[0-9]{9}$", message = "El teléfono debe tener 9 dígitos")
        String telefono,

        @Size(max = 200) String direccion,
        @Size(max = 200) String referencia,
        @Size(max = 60)  String distrito) {
}
