package pe.techserv.seguridad;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.techserv.cliente.ServicioCuentaCliente;
import pe.techserv.comun.SolicitudInvalida;
import pe.techserv.mype.AdministradorRepository;
import pe.techserv.mype.TecnicoRepository;
import pe.techserv.notificacion.AvisoCuenta;
import pe.techserv.seguridad.dto.RecuperarClave;
import pe.techserv.seguridad.dto.RestablecerClave;
import pe.techserv.usuario.Usuario;
import pe.techserv.usuario.UsuarioRepository;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.HexFormat;

@Service
public class ServicioRecuperacionClave {

    private static final SecureRandom AZAR = new SecureRandom();
    private static final int MINUTOS_VIGENCIA = 30;
    private static final int SEGUNDOS_ENTRE_PEDIDOS = 60;

    private final UsuarioRepository usuarios;
    private final RecuperacionClaveRepository recuperaciones;
    private final ServicioCuentaCliente cuentasCliente;
    private final AdministradorRepository administradores;
    private final TecnicoRepository tecnicos;
    private final PasswordEncoder claves;
    private final ApplicationEventPublisher avisos;

    public ServicioRecuperacionClave(UsuarioRepository usuarios,
                                     RecuperacionClaveRepository recuperaciones,
                                     ServicioCuentaCliente cuentasCliente,
                                     AdministradorRepository administradores,
                                     TecnicoRepository tecnicos, PasswordEncoder claves,
                                     ApplicationEventPublisher avisos) {
        this.usuarios = usuarios;
        this.recuperaciones = recuperaciones;
        this.cuentasCliente = cuentasCliente;
        this.administradores = administradores;
        this.tecnicos = tecnicos;
        this.claves = claves;
        this.avisos = avisos;
    }

    /** No devuelve ningún dato sobre la existencia o el estado de la cuenta. */
    @Transactional
    public void recuperar(RecuperarClave datos) {
        // Una fila de usuario arbitra tanto el freno como la sustitución del
        // enlace: dos pedidos simultáneos no pueden enviar dos correos.
        Usuario u = usuarios.bloquearPorEmail(datos.email().trim()).orElse(null);
        if (u == null || !puedeEntrar(u)) {
            return;
        }
        OffsetDateTime ahora = OffsetDateTime.now();
        boolean muyPronto = recuperaciones.findFirstByUsuarioIdOrderByCreadoEnDesc(u.getId())
                .map(r -> r.getCreadoEn().plusSeconds(SEGUNDOS_ENTRE_PEDIDOS).isAfter(ahora))
                .orElse(false);
        if (muyPronto) {
            return;
        }

        byte[] bytes = new byte[32];
        AZAR.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

        recuperaciones.invalidarDelUsuario(u.getId(), ahora);
        RecuperacionClave r = new RecuperacionClave();
        r.setUsuario(u);
        r.setHashToken(hash(token));
        r.setCreadoEn(ahora);
        r.setExpiraEn(ahora.plusMinutes(MINUTOS_VIGENCIA));
        recuperaciones.save(r);
        avisos.publishEvent(new AvisoCuenta.Recuperacion(u.getEmail(), u.getNombreCompleto(), token));
    }

    @Transactional
    public void restablecer(RestablecerClave datos) {
        if (datos.token() == null || !datos.token().matches("[A-Za-z0-9_-]{43}")) {
            throw enlaceInvalido();
        }
        String hashToken = hash(datos.token());
        RecuperacionClave r = recuperaciones.findByHashToken(hashToken)
                .orElseThrow(ServicioRecuperacionClave::enlaceInvalido);

        // Mismo orden de bloqueos que recuperar: primero usuario, luego tokens.
        Usuario u = usuarios.bloquearPorId(r.getUsuario().getId())
                .orElseThrow(ServicioRecuperacionClave::enlaceInvalido);
        OffsetDateTime ahora = OffsetDateTime.now();
        if (!puedeEntrar(u) || recuperaciones.marcarUsado(hashToken, ahora) != 1) {
            throw enlaceInvalido();
        }

        u.setClaveHash(claves.encode(datos.claveNueva()));
        u.setClaveCambiadaEn(ahora);
        recuperaciones.invalidarDelUsuario(u.getId(), ahora);
        avisos.publishEvent(new AvisoCuenta.ClaveRestablecida(u.getEmail(), u.getNombreCompleto(), ahora));
    }

    private boolean puedeEntrar(Usuario u) {
        return switch (u.getRol()) {
            case CLIENTE -> cuentasCliente.puedeEntrar(u);
            case ADMIN_MYPE -> u.isActivo() && administradores.findByUsuarioId(u.getId())
                    .map(a -> a.getMype().isActivo()).orElse(false);
            case TECNICO -> u.isActivo() && tecnicos.findByUsuarioEmailIgnoreCase(u.getEmail())
                    .map(t -> t.getMype().isActivo()).orElse(false);
        };
    }

    private static SolicitudInvalida enlaceInvalido() {
        return new SolicitudInvalida("El enlace no es válido o ya caducó. Pide uno nuevo.");
    }

    static String hash(String token) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 no disponible", e);
        }
    }
}
