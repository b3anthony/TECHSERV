package pe.techserv.seguridad;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import pe.techserv.usuario.Rol;

import java.util.Collection;
import java.util.List;

/**
 * Quien esta haciendo la peticion, ya resuelto.
 *
 * Lleva el {@code mypeId} porque es la llave del multi-inquilino: los servicios
 * lo piden con {@link #mypeIdObligatorio()} y se lo pasan a consultas que SIEMPRE
 * filtran por el. Asi el aislamiento no depende de que alguien se acuerde de
 * comprobarlo en cada metodo.
 */
public record UsuarioAutenticado(Long id,
                                 String email,
                                 String nombreCompleto,
                                 Rol rol,
                                 Long mypeId,
                                 Long clienteId,
                                 Long tecnicoId) implements UserDetails {

    public Long mypeIdObligatorio() {
        if (mypeId == null) {
            throw new IllegalStateException(
                    "El usuario " + email + " no está asociado a ninguna MYPE");
        }
        return mypeId;
    }

    public Long clienteIdObligatorio() {
        if (clienteId == null) {
            throw new IllegalStateException(
                    "El usuario " + email + " no tiene perfil de cliente");
        }
        return clienteId;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + rol.name()));
    }

    /** No se usa: la clave ya se comprobo al emitir el token. */
    @Override public String getPassword() { return null; }
    @Override public String getUsername() { return email; }
}
