package pe.techserv.panel.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ActualizarCuenta(
        @NotBlank(message = "Escribe tus nombres")
        @Size(max = 80, message = "Los nombres no pueden tener más de 80 caracteres")
        String nombres,

        @NotBlank(message = "Escribe tus apellidos")
        @Size(max = 80, message = "Los apellidos no pueden tener más de 80 caracteres")
        String apellidos,

        @NotBlank(message = "Escribe tu número de celular")
        @Pattern(regexp = "^9[0-9]{8}$", message = "El celular tiene 9 dígitos y empieza por 9")
        String telefono
) {}
