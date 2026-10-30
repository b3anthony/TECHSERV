package pe.techserv.garantia.dto;

import jakarta.validation.constraints.NotNull;

/** Independiente de AjustesTaller para no alterar su contrato. */
public record AjusteGarantia(@NotNull(message = "Elige la duración de la garantía") Integer dias) {}
