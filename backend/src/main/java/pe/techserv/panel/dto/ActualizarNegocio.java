package pe.techserv.panel.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ActualizarNegocio(
        @Size(max = 1000, message = "La descripción no puede tener más de 1000 caracteres")
        String descripcion,

        @Pattern(regexp = "^$|^[0-9]{9}$", message = "El teléfono debe tener 9 dígitos")
        String telefono,

        @NotBlank(message = "Escribe la dirección del negocio")
        @Size(max = 200, message = "La dirección no puede tener más de 200 caracteres")
        String direccion,

        @NotBlank(message = "Escribe el distrito")
        @Size(max = 60, message = "El distrito no puede tener más de 60 caracteres")
        String distrito
) {}
