package pe.techserv.panel;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.techserv.comun.ConflictoEstado;
import pe.techserv.comun.RecursoNoEncontrado;
import pe.techserv.comun.SolicitudInvalida;
import pe.techserv.mype.*;
import pe.techserv.notificacion.AvisoCuenta;
import pe.techserv.orden.*;
import pe.techserv.panel.dto.*;
import pe.techserv.seguridad.UsuarioAutenticado;
import pe.techserv.usuario.Usuario;
import pe.techserv.usuario.UsuarioRepository;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.UUID;

/**
 * Los ajustes del administrador: su cuenta, los datos del taller, el horario,
 * los métodos de pago y cerrar la cuenta.
 *
 * Como el resto del panel, el taller sale SIEMPRE del usuario autenticado
 * ({@link UsuarioAutenticado#mypeIdObligatorio()}), nunca de la petición.
 */
@Service
public class ServicioAjustes {

    /** Lo que hay que escribir, tal cual, para cerrar la cuenta. */
    public static final String PALABRA_CONFIRMACION = "ELIMINAR";

    /** Visitas que ya no se pueden cancelar: el técnico está en la calle o trabajando. */
    private static final EnumSet<EstadoOrden> EN_CURSO = EnumSet.of(EstadoOrden.EN_CAMINO, EstadoOrden.EN_PROCESO);

    private final UsuarioRepository usuarios;
    private final MypeRepository mypes;
    private final MypeEspecialidadRepository especialidades;
    private final AdministradorRepository administradores;
    private final TecnicoRepository tecnicos;
    private final OrdenServicioRepository ordenes;
    private final OrdenHistorialRepository historial;
    private final PasswordEncoder claves;
    private final ApplicationEventPublisher avisos;

    public ServicioAjustes(UsuarioRepository usuarios, MypeRepository mypes,
                           MypeEspecialidadRepository especialidades,
                           AdministradorRepository administradores, TecnicoRepository tecnicos,
                           OrdenServicioRepository ordenes, OrdenHistorialRepository historial,
                           PasswordEncoder claves, ApplicationEventPublisher avisos) {
        this.usuarios = usuarios;
        this.mypes = mypes;
        this.especialidades = especialidades;
        this.administradores = administradores;
        this.tecnicos = tecnicos;
        this.ordenes = ordenes;
        this.historial = historial;
        this.claves = claves;
        this.avisos = avisos;
    }

    @Transactional(readOnly = true)
    public AjustesTaller ver(UsuarioAutenticado quien) {
        Usuario admin = usuario(quien);
        Mype taller = taller(quien.mypeIdObligatorio());

        TarifaResumen especialidad = especialidades.findByMypeId(taller.getId()).stream()
                .findFirst().map(TarifaResumen::de).orElse(null);

        return new AjustesTaller(
                new AjustesTaller.Cuenta(admin.getNombres(), admin.getApellidos(),
                                         admin.getEmail(), admin.getTelefono()),
                new AjustesTaller.Negocio(taller.getRazonSocial(), taller.getRuc(),
                                          taller.getDescripcion(), taller.getTelefono(),
                                          taller.getDireccion(), taller.getDistrito()),
                especialidad,
                taller.getHorarios().stream().map(HorarioDia::de).toList(),
                taller.getMetodosPago().stream().sorted().toList());
    }

    @Transactional
    public AjustesTaller actualizarCuenta(UsuarioAutenticado quien, ActualizarCuenta datos) {
        Usuario admin = usuario(quien);
        admin.setNombres(datos.nombres().trim());
        admin.setApellidos(datos.apellidos().trim());
        admin.setTelefono(datos.telefono().trim());
        return ver(quien);
    }

    @Transactional
    public AjustesTaller actualizarNegocio(UsuarioAutenticado quien, ActualizarNegocio datos) {
        Mype taller = taller(quien.mypeIdObligatorio());
        taller.setDescripcion(vacioANulo(datos.descripcion()));
        taller.setTelefono(vacioANulo(datos.telefono()));
        taller.setDireccion(datos.direccion().trim());
        taller.setDistrito(datos.distrito().trim());
        return ver(quien);
    }

    @Transactional
    public void cambiarClave(UsuarioAutenticado quien, CambioClave datos) {
        Usuario admin = usuario(quien);
        if (!claves.matches(datos.claveActual(), admin.getClaveHash())) {
            throw new SolicitudInvalida("La contraseña actual no es correcta");
        }
        if (datos.claveActual().equals(datos.claveNueva())) {
            throw new SolicitudInvalida("La contraseña nueva tiene que ser distinta de la actual");
        }
        admin.setClaveHash(claves.encode(datos.claveNueva()));
    }

    /**
     * Cambia el horario de las reservas futuras. Las visitas ya reservadas fuera
     * del horario nuevo se quedan como están: el taller las aceptó con el anterior.
     */
    @Transactional
    public AjustesTaller actualizarHorario(UsuarioAutenticado quien, ActualizarHorario datos) {
        List<HorarioAtencion> tramos = HorarioDia.validar(datos.horarios());
        Mype taller = taller(quien.mypeIdObligatorio());
        taller.getHorarios().clear();
        taller.getHorarios().addAll(tramos);
        return ver(quien);
    }

    @Transactional
    public AjustesTaller actualizarMetodosPago(UsuarioAutenticado quien, ActualizarMetodosPago datos) {
        if (datos.metodos().stream().anyMatch(java.util.Objects::isNull)) {
            throw new SolicitudInvalida("Hay un método de pago que no existe");
        }
        Mype taller = taller(quien.mypeIdObligatorio());
        taller.getMetodosPago().clear();
        taller.getMetodosPago().addAll(EnumSet.copyOf(datos.metodos()));
        return ver(quien);
    }

    /**
     * Cierra la cuenta del taller. Es una baja lógica, no un borrado: las órdenes
     * son también del cliente —su historial, sus pagos, sus calificaciones— y no
     * pueden desaparecer porque el taller se vaya.
     *
     * <ul>
     *   <li>Se niega si hay visitas en curso (técnico en camino o trabajando).</li>
     *   <li>Cancela las que aún no empezaron, dejando constancia en su historial.</li>
     *   <li>Saca al taller del catálogo.</li>
     *   <li>Desactiva a administradores y técnicos y libera sus correos y
     *       teléfonos: el correo es único en la plataforma, y sin liberarlo nadie
     *       del equipo podría volver a registrarse ni trabajar para otro taller.
     *       Los nombres se quedan: aparecen en el historial de órdenes ajenas.</li>
     * </ul>
     *
     * La sesión de quien la cierra deja de valer en la siguiente petición:
     * {@code ServicioPrincipal} solo resuelve usuarios activos.
     */
    @Transactional
    public void eliminarCuenta(UsuarioAutenticado quien, EliminarCuenta datos) {
        Usuario admin = usuario(quien);
        if (!claves.matches(datos.clave(), admin.getClaveHash())) {
            throw new SolicitudInvalida("La contraseña no es correcta");
        }
        if (!PALABRA_CONFIRMACION.equalsIgnoreCase(datos.confirmacion().trim())) {
            throw new SolicitudInvalida("Escribe " + PALABRA_CONFIRMACION + " para confirmar");
        }

        Long mypeId = quien.mypeIdObligatorio();
        // El taller bloqueado: mientras se cierra, nadie da de alta técnicos en él.
        Mype taller = mypes.bloquear(mypeId)
                .orElseThrow(() -> new RecursoNoEncontrado("No se encontró el taller"));

        List<EstadoOrden> abiertas = EnumSet.allOf(EstadoOrden.class).stream()
                .filter(e -> !e.estaCerrada()).toList();

        // Cada orden se bloquea y se relee antes de decidir: el técnico puede
        // estar pulsando "Voy en camino" en este mismo instante.
        List<String> enCurso = new ArrayList<>();
        int canceladas = 0;
        for (Long id : ordenes.idsPorEstado(mypeId, abiertas)) {
            OrdenServicio orden = ordenes.bloquear(id, mypeId).orElseThrow();
            if (EN_CURSO.contains(orden.getEstado())) {
                enCurso.add(orden.getCodigo());
            } else if (orden.getEstado().permite(EstadoOrden.CANCELADA)) {
                EstadoOrden anterior = orden.getEstado();
                orden.setEstado(EstadoOrden.CANCELADA);
                anotar(orden, anterior, admin);
                canceladas++;
            }
        }
        if (!enCurso.isEmpty()) {
            // La excepción deshace también las cancelaciones de arriba.
            throw new ConflictoEstado("Hay visitas en curso (" + String.join(", ", enCurso)
                    + "). Espera a que terminen para cerrar la cuenta");
        }

        avisos.publishEvent(new AvisoCuenta.TallerEliminado(admin.getEmail(), admin.getNombreCompleto(),
                taller.getRazonSocial(), OffsetDateTime.now(), canceladas));
        taller.setActivo(false);
        for (Tecnico t : tecnicos.findByMypeIdOrderByIdAsc(mypeId)) {
            t.setDisponible(false);
            darDeBaja(t.getUsuario());
        }
        for (Administrador a : administradores.findByMypeId(mypeId)) {
            darDeBaja(a.getUsuario());
        }
    }

    // ───────────────────────────── Auxiliares ─────────────────────────────

    private void darDeBaja(Usuario u) {
        u.setActivo(false);
        u.setEmail("baja-" + u.getId() + "@techserv.invalid");
        u.setTelefono(null);
        u.setClaveHash(claves.encode(UUID.randomUUID().toString()));
    }

    private void anotar(OrdenServicio orden, EstadoOrden anterior, Usuario admin) {
        OrdenHistorial paso = new OrdenHistorial();
        paso.setOrden(orden);
        paso.setEstadoAnterior(anterior);
        paso.setEstadoNuevo(EstadoOrden.CANCELADA);
        paso.setActor(ActorHistorial.ADMIN_MYPE);
        paso.setActorUsuario(admin);
        paso.setNota("El taller cerró su cuenta en TechServ");
        historial.save(paso);
        orden.getHistorial().add(paso);
    }

    private Usuario usuario(UsuarioAutenticado quien) {
        return usuarios.findById(quien.id())
                .orElseThrow(() -> new RecursoNoEncontrado("No se encontró tu cuenta"));
    }

    private Mype taller(Long mypeId) {
        return mypes.findById(mypeId)
                .orElseThrow(() -> new RecursoNoEncontrado("No se encontró el taller"));
    }

    private static String vacioANulo(String texto) {
        return (texto == null || texto.isBlank()) ? null : texto.trim();
    }
}
