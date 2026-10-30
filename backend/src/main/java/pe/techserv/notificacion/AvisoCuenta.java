package pe.techserv.notificacion;

import java.time.OffsetDateTime;

/** Datos capturados antes de anonimizar; los avisos se atienden tras el commit. */
public sealed interface AvisoCuenta {

    record Recuperacion(String email, String nombre, String token) implements AvisoCuenta {}

    record ClaveRestablecida(String email, String nombre, OffsetDateTime fecha) implements AvisoCuenta {}

    record ClienteDesactivado(String email, String nombre,
                              OffsetDateTime reactivableHasta) implements AvisoCuenta {}

    record ClienteEliminado(String email, String nombre) implements AvisoCuenta {}

    record TallerEliminado(String email, String nombre, String razonSocial,
                           OffsetDateTime fecha, int ordenesCanceladas) implements AvisoCuenta {}
}
