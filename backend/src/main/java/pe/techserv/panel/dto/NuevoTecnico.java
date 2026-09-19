package pe.techserv.panel.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import pe.techserv.comun.Especialidad;

import java.util.List;

public record NuevoTecnico(
        @NotBlank(message = "Escribe los nombres")
        @Size(max = 80, message = "Los nombres no pueden tener más de 80 caracteres")
        String nombres,

        @NotBlank(message = "Escribe los apellidos")
        @Size(max = 80, message = "Los apellidos no pueden tener más de 80 caracteres")
        String apellidos,

        @NotBlank(message = "Escribe el correo")
        @Email(message = "El correo no tiene un formato válido")
        @Size(max = 160, message = "El correo no puede tener más de 160 caracteres")
        String email,

        @Size(max = 20, message = "El teléfono no puede tener más de 20 caracteres")
        String telefono,

        @NotEmpty(message = "Elige al menos una especialidad")
        List<Especialidad> especialidades
) {}
