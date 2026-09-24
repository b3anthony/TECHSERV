package pe.techserv.visita;

import org.springframework.stereotype.Service;
import pe.techserv.comun.PropiedadesTechServ;
import pe.techserv.comun.RecursoNoEncontrado;
import pe.techserv.orden.OrdenServicio;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.HexFormat;

/**
 * Crea y reconoce los enlaces de la pagina del tecnico.
 *
 * El token son 32 bytes de SecureRandom en base64url (43 caracteres): no se
 * puede adivinar. En la base va su SHA-256; basta un hash rapido porque el
 * token no es una contrasena elegida por una persona, no hay diccionario que
 * probar.
 */
@Service
public class ServicioEnlaces {

    /** Lo que vive un enlace: de sobra para una visita y su cobro. */
    public static final int DIAS_VIGENCIA = 30;

    private static final SecureRandom AZAR = new SecureRandom();

    private final EnlaceTecnicoRepository enlaces;
    private final PropiedadesTechServ props;

    public ServicioEnlaces(EnlaceTecnicoRepository enlaces, PropiedadesTechServ props) {
        this.enlaces = enlaces;
        this.props = props;
    }

    // SIN @Transactional, por lo mismo que ServicioCorreoTecnico.avisarAsignacion:
    // se llama dentro de la transaccion de asignar y no debe poder marcarla
    // como rollback-only. El save se une a la del llamante.
    /** Crea un enlace para el tecnico que tiene ahora la orden y devuelve la URL completa. */
    public String crear(OrdenServicio orden) {
        if (orden.getTecnico() == null) {
            throw new IllegalStateException("La orden " + orden.getCodigo() + " no tiene técnico");
        }
        byte[] bytes = new byte[32];
        AZAR.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

        EnlaceTecnico enlace = new EnlaceTecnico();
        enlace.setHashToken(hash(token));
        enlace.setOrden(orden);
        enlace.setTecnico(orden.getTecnico());
        enlace.setExpiraEn(OffsetDateTime.now().plusDays(DIAS_VIGENCIA));
        enlaces.save(enlace);

        return props.urlFrontend() + "/visita/" + token;
    }

    /**
     * El enlace, si todavia vale. Todo lo que no vale responde lo mismo —404 con
     * el mismo mensaje—: quien prueba tokens no aprende nada de la respuesta.
     */
    EnlaceTecnico vigente(String token) {
        if (token == null || token.length() < 40 || token.length() > 64) {
            throw noValido();
        }
        EnlaceTecnico enlace = enlaces.findByHashToken(hash(token)).orElseThrow(ServicioEnlaces::noValido);
        OrdenServicio orden = enlace.getOrden();
        boolean sigueSiendoSuya = orden.getTecnico() != null
                && orden.getTecnico().getId().equals(enlace.getTecnico().getId());
        if (enlace.estaVencido() || !sigueSiendoSuya || !enlace.getTecnico().getUsuario().isActivo()) {
            throw noValido();
        }
        return enlace;
    }

    static RecursoNoEncontrado noValido() {
        return new RecursoNoEncontrado("Este enlace ya no es válido. Pide al taller que te lo envíe de nuevo.");
    }

    static String hash(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 no disponible", e);
        }
    }
}
