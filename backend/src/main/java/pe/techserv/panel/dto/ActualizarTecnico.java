package pe.techserv.panel.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import pe.techserv.comun.Especialidad;

import java.util.List;

public record ActualizarTecnico(
        @NotBlank(message = "Escribe los nombres")
        @Size(max = 80, message = "Los nombres no pueden tener más de 80 caracteres")
        String nombres,

        @NotBlank(message = "Escribe los apellidos")
        @Size(max = 80, message = "Los apellidos no pueden tener más de 80 caracteres")
        String apellidos,

        @Size(max = 20, message = "El teléfono no puede tener más de 20 caracteres")
        String telefono,

        @NotNull(message = "Indica si el técnico está disponible")
        Boolean disponible,

        /** Opcional: si no llega, el técnico atiende la especialidad del taller. */
        List<Especialidad> especialidades
) {}
