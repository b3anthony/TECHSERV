package pe.techserv.reserva.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

public record NuevaCalificacion(
        @Min(1) @Max(5) int puntaje,
        @Size(max = 500) String comentario) {}
