package pe.techserv.cliente.dto;

import java.time.OffsetDateTime;

/** Hasta cuándo puede volver a entrar para recuperarla. Después se elimina. */
public record CuentaDesactivada(OffsetDateTime reactivableHasta) {}
