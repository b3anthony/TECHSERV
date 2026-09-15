package pe.techserv.seguridad;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.techserv.mype.AdministradorRepository;
import pe.techserv.mype.TecnicoRepository;
import pe.techserv.usuario.ClienteRepository;
import pe.techserv.usuario.Usuario;
import pe.techserv.usuario.UsuarioRepository;

import java.util.Optional;

/**
 * Convierte un usuario de la base en el {@link UsuarioAutenticado} que usa el
 * resto de la aplicacion, resolviendo a que MYPE pertenece.
 *
 * Esto se hace consultando la base en CADA peticion, en vez de meter el mypeId
 * dentro del token. Cuesta una consulta y evita el problema que tendria la otra
 * opcion: si manana el administrador cambia de taller o se le retira el acceso,
 * su token viejo seguiria abriendo las ordenes del taller anterior hasta que
 * caducase. La pertenencia se lee siempre del dato vivo.
 */
@Service
public class ServicioPrincipal {

    private final UsuarioRepository usuarios;
    private final AdministradorRepository administradores;
    private final TecnicoRepository tecnicos;
    private final ClienteRepository clientes;

    public ServicioPrincipal(UsuarioRepository usuarios,
                             AdministradorRepository administradores,
                             TecnicoRepository tecnicos,
                             ClienteRepository clientes) {
        this.usuarios = usuarios;
        this.administradores = administradores;
        this.tecnicos = tecnicos;
        this.clientes = clientes;
    }

    @Transactional(readOnly = true)
    public Optional<UsuarioAutenticado> porId(Long usuarioId) {
        return usuarios.findById(usuarioId)
                       .filter(Usuario::isActivo)
                       .map(this::construir);
    }

    @Transactional(readOnly = true)
    public Optional<UsuarioAutenticado> porEmail(String email) {
        return usuarios.findByEmailIgnoreCase(email)
                       .filter(Usuario::isActivo)
                       .map(this::construir);
    }

    private UsuarioAutenticado construir(Usuario u) {
        Long mypeId = null;
        Long clienteId = null;
        Long tecnicoId = null;

        switch (u.getRol()) {
            case ADMIN_MYPE -> mypeId = administradores.findByUsuarioId(u.getId())
                    .map(a -> a.getMype().getId()).orElse(null);
            case TECNICO -> {
                var tecnico = tecnicos.findByUsuarioEmailIgnoreCase(u.getEmail()).orElse(null);
                if (tecnico != null) {
                    tecnicoId = tecnico.getId();
                    mypeId = tecnico.getMype().getId();
                }
            }
            case CLIENTE -> clienteId = clientes.findByUsuarioId(u.getId())
                    .map(c -> c.getId()).orElse(null);
        }

        return new UsuarioAutenticado(u.getId(), u.getEmail(), u.getNombreCompleto(),
                                      u.getRol(), mypeId, clienteId, tecnicoId);
    }
}
