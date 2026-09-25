package pe.techserv.seguridad.dto;

import java.time.OffsetDateTime;

public record RespuestaSesion(String token,
                              OffsetDateTime expiraEn,
                              UsuarioActual usuario,
                              /** El cliente había desactivado su cuenta y al entrar la recuperó. */
                              boolean cuentaReactivada) {
}
