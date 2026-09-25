package pe.techserv.seguridad;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.techserv.cliente.ServicioCuentaCliente;
import pe.techserv.comun.PropiedadesTechServ;
import pe.techserv.comun.SolicitudInvalida;
import pe.techserv.mype.*;
import pe.techserv.pago.MetodoPago;
import pe.techserv.seguridad.dto.*;
import pe.techserv.usuario.*;

import java.time.OffsetDateTime;
import java.util.EnumSet;
import java.util.List;

/** Entrar y registrarse. Los dos caminos de registro acaban en un usuario y un rol. */
@Service
public class ServicioAutenticacion {

    private final UsuarioRepository usuarios;
    private final ClienteRepository clientes;
    private final MypeRepository mypes;
    private final AdministradorRepository administradores;
    private final MypeEspecialidadRepository especialidades;
    private final PasswordEncoder claves;
    private final ServicioJwt jwt;
    private final ServicioPrincipal principales;
    private final PropiedadesTechServ props;
    private final ServicioCuentaCliente cuentasCliente;

    public ServicioAutenticacion(UsuarioRepository usuarios, ClienteRepository clientes,
                                 MypeRepository mypes, AdministradorRepository administradores,
                                 MypeEspecialidadRepository especialidades,
                                 PasswordEncoder claves, ServicioJwt jwt,
                                 ServicioPrincipal principales, PropiedadesTechServ props,
                                 ServicioCuentaCliente cuentasCliente) {
        this.usuarios = usuarios;
        this.clientes = clientes;
        this.mypes = mypes;
        this.administradores = administradores;
        this.especialidades = especialidades;
        this.claves = claves;
        this.jwt = jwt;
        this.principales = principales;
        this.props = props;
        this.cuentasCliente = cuentasCliente;
    }

    /**
     * El mensaje de error es el mismo si el correo no existe que si la clave
     * esta mal. Distinguirlos convierte el formulario en una lista de quien
     * tiene cuenta aqui.
     */
    @Transactional
    public RespuestaSesion entrar(PeticionLogin peticion) {
        Usuario usuario = usuarios.findByEmailIgnoreCase(peticion.email())
                .filter(u -> claves.matches(peticion.clave(), u.getClaveHash()))
                .orElseThrow(ServicioAutenticacion::credencialesIncorrectas);

        // Un cliente que desactivó su cuenta la recupera entrando antes de que
        // venza el plazo. Cualquier otra cuenta inactiva responde lo mismo que
        // una clave mal escrita.
        boolean reactivada = false;
        if (!usuario.isActivo()) {
            reactivada = usuario.getRol() == Rol.CLIENTE && cuentasCliente.reactivarSiPuede(usuario);
            if (!reactivada) {
                throw credencialesIncorrectas();
            }
        }

        return sesionDe(usuario, reactivada);
    }

    private static SolicitudInvalida credencialesIncorrectas() {
        return new SolicitudInvalida("Correo o contraseña incorrectos");
    }

    @Transactional
    public RespuestaSesion registrarCliente(RegistroCliente datos) {
        exigirCorreoLibre(datos.email());

        Usuario usuario = nuevoUsuario(datos.nombres(), datos.apellidos(), datos.email(),
                                       datos.clave(), datos.telefono(), Rol.CLIENTE);
        usuarios.save(usuario);

        Cliente cliente = new Cliente();
        cliente.setUsuario(usuario);
        cliente.setDireccion(vacioANulo(datos.direccion()));
        cliente.setReferencia(vacioANulo(datos.referencia()));
        cliente.setDistrito(vacioANulo(datos.distrito()));
        clientes.save(cliente);

        return sesionDe(usuario);
    }

    @Transactional
    public RespuestaSesion registrarNegocio(RegistroNegocio datos) {
        exigirCorreoLibre(datos.email());
        if (mypes.findAll().stream().anyMatch(m -> m.getRuc().equals(datos.ruc()))) {
            throw new SolicitudInvalida("Ya hay un negocio registrado con ese RUC");
        }

        // Antes de crear nada: si el horario no vale, que no quede un usuario a medias.
        List<HorarioAtencion> horario = HorarioDia.validar(datos.horarios());

        Usuario usuario = nuevoUsuario(datos.nombres(), datos.apellidos(), datos.email(),
                                       datos.clave(), datos.telefono(), Rol.ADMIN_MYPE);
        usuarios.save(usuario);

        Mype mype = new Mype();
        mype.setRazonSocial(datos.razonSocial());
        mype.setRuc(datos.ruc());
        mype.setDescripcion(vacioANulo(datos.descripcion()));
        mype.setTelefono(vacioANulo(datos.telefono()));
        mype.setDireccion(datos.direccion());
        mype.setDistrito(datos.distrito());
        mype.getHorarios().addAll(horario);
        // Acepta los cuatro métodos de entrada; los ajusta en el panel.
        mype.getMetodosPago().addAll(EnumSet.allOf(MetodoPago.class));
        mypes.save(mype);

        MypeEspecialidad me = new MypeEspecialidad();
        me.setMype(mype);
        me.setEspecialidad(datos.especialidad());
        me.setTarifaBase(datos.tarifaBase());
        especialidades.save(me);

        Administrador admin = new Administrador();
        admin.setUsuario(usuario);
        admin.setMype(mype);
        administradores.save(admin);

        return sesionDe(usuario);
    }

    private RespuestaSesion sesionDe(Usuario usuario) {
        return sesionDe(usuario, false);
    }

    private RespuestaSesion sesionDe(Usuario usuario, boolean reactivada) {
        String token = jwt.paraSesion(usuario);
        UsuarioActual actual = principales.porId(usuario.getId())
                .map(this::aUsuarioActual)
                .orElseThrow(() -> new IllegalStateException(
                        "No se pudo resolver el perfil de " + usuario.getEmail()));

        return new RespuestaSesion(token,
                OffsetDateTime.now().plusHours(props.jwt().horas()),
                actual, reactivada);
    }

    public UsuarioActual aUsuarioActual(UsuarioAutenticado autenticado) {
        String razonSocial = autenticado.mypeId() == null ? null
                : mypes.findById(autenticado.mypeId()).map(Mype::getRazonSocial).orElse(null);

        return new UsuarioActual(autenticado.id(), autenticado.nombreCompleto(),
                                 autenticado.email(), autenticado.rol(),
                                 autenticado.mypeId(), razonSocial);
    }

    private void exigirCorreoLibre(String email) {
        if (usuarios.existsByEmailIgnoreCase(email)) {
            throw new SolicitudInvalida("Ese correo ya tiene una cuenta");
        }
    }

    private Usuario nuevoUsuario(String nombres, String apellidos, String email,
                                 String clave, String telefono, Rol rol) {
        Usuario u = new Usuario();
        u.setNombres(nombres.trim());
        u.setApellidos(apellidos.trim());
        u.setEmail(email.trim().toLowerCase());
        u.setClaveHash(claves.encode(clave));
        u.setTelefono(vacioANulo(telefono));
        u.setRol(rol);
        return u;
    }

    private static String vacioANulo(String texto) {
        return (texto == null || texto.isBlank()) ? null : texto.trim();
    }
}
