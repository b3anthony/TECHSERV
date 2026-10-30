package pe.techserv.garantia.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.time.LocalTime;

public record NuevaAtencionGarantia(
        @NotBlank(message = "Cuéntanos qué está fallando")
        @Size(min = 10, max = 2000, message = "Describe la falla con un poco más de detalle")
        String descripcionFalla,
        @JsonFormat(pattern = "yyyy-MM-dd")
        @NotNull(message = "Elige la fecha")
        @FutureOrPresent(message = "La fecha no puede ser anterior a hoy") LocalDate fecha,
        @JsonFormat(pattern = "HH:mm")
        @NotNull(message = "Elige la hora") LocalTime hora) {}
