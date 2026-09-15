package pe.techserv.seguridad.dto;

import java.time.OffsetDateTime;

public record RespuestaSesion(String token,
                              OffsetDateTime expiraEn,
                              UsuarioActual usuario) {
}
