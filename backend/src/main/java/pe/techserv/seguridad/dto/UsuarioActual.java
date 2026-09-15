package pe.techserv.seguridad.dto;

import pe.techserv.usuario.Rol;

/** Lo que el frontend necesita saber de quien ha entrado. Sin clave, obviamente. */
public record UsuarioActual(Long id,
                            String nombreCompleto,
                            String email,
                            Rol rol,
                            Long mypeId,
                            String razonSocial) {
}
