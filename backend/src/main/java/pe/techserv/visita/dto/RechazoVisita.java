package pe.techserv.visita.dto;

import jakarta.validation.constraints.Size;

/** Por qué el técnico no puede ir. Opcional: lo lee solo el taller. */
public record RechazoVisita(
        @Size(max = 200, message = "Cuéntalo en menos de 200 caracteres")
        String motivo
) {}
