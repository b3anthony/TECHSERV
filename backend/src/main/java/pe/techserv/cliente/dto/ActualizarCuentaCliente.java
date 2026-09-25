package pe.techserv.cliente.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** El celular y la dirección son opcionales, como en el registro. */
public record ActualizarCuentaCliente(
        @NotBlank(message = "Escribe tus nombres")
        @Size(max = 80, message = "Los nombres no pueden tener más de 80 caracteres")
        String nombres,

        @NotBlank(message = "Escribe tus apellidos")
        @Size(max = 80, message = "Los apellidos no pueden tener más de 80 caracteres")
        String apellidos,

        @Pattern(regexp = "^$|^9[0-9]{8}$", message = "El celular tiene 9 dígitos y empieza por 9")
        String telefono,

        @Size(max = 200, message = "La dirección no puede tener más de 200 caracteres")
        String direccion,

        @Size(max = 200, message = "La referencia no puede tener más de 200 caracteres")
        String referencia,

        @Size(max = 60, message = "El distrito no puede tener más de 60 caracteres")
        String distrito
) {}
