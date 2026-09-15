package pe.techserv.reserva.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.*;
import pe.techserv.comun.Especialidad;

import java.time.LocalDate;
import java.time.LocalTime;

/** Lo que el cliente rellena para pedir una visita. */
public record NuevaReserva(
        @NotNull(message = "Elige un taller") Long mypeId,

        @NotNull(message = "Elige la especialidad") Especialidad especialidad,

        @NotBlank(message = "Cuéntanos qué está fallando")
        @Size(min = 10, max = 2000,
              message = "Describe la falla con un poco más de detalle")
        String descripcionFalla,

        @NotBlank(message = "Escribe la dirección donde hay que ir")
        @Size(max = 200) String direccion,

        @Size(max = 200) String referencia,

        @NotBlank(message = "Elige el distrito")
        @Size(max = 60) String distrito,

        @JsonFormat(pattern = "yyyy-MM-dd")
        @NotNull(message = "Elige la fecha")
        @FutureOrPresent(message = "La fecha no puede ser anterior a hoy")
        LocalDate fecha,

        @JsonFormat(pattern = "HH:mm")
        @NotNull(message = "Elige la hora")
        LocalTime hora) {
}
