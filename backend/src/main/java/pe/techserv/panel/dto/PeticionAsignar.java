package pe.techserv.panel.dto;

import jakarta.validation.constraints.NotNull;

public record PeticionAsignar(@NotNull(message = "Elige un técnico") Long tecnicoId) {}
