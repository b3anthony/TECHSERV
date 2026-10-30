package pe.techserv.seguridad;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;
import pe.techserv.comun.PropiedadesTechServ;
import pe.techserv.usuario.Usuario;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.Optional;
import java.util.UUID;

/**
 * Firma y verifica los dos tipos de token de la plataforma:
 *
 *  - el de SESION, que lleva el cliente o el administrador en la cabecera
 *    Authorization mientras usa la web;
 *  - el de ACCION, el que viaja dentro de un boton del correo del tecnico.
 *
 * Los dos se firman con la misma clave pero llevan un claim "tipo" distinto y se
 * verifican por separado: un token de sesion no sirve para cerrar una orden
 * desde el correo, ni al reves.
 */
@Service
public class ServicioJwt {

    private static final String TIPO_SESION = "sesion";
    private static final String TIPO_ACCION = "accion";

    private final SecretKey clave;
    private final int horasSesion;
    private final int horasAccion;

    public ServicioJwt(PropiedadesTechServ props) {
        byte[] secreto = props.jwt().secreto().getBytes(StandardCharsets.UTF_8);
        if (secreto.length < 32) {
            // HS256 pide 256 bits. Fallar aqui es mucho mejor que firmar flojo.
            throw new IllegalStateException(
                    "techserv.jwt.secreto debe tener al menos 32 caracteres");
        }
        this.clave = Keys.hmacShaKeyFor(secreto);
        this.horasSesion = props.jwt().horas();
        this.horasAccion = props.tokenAccion().horas();
    }

    /** Nombre del claim con el sello de la contraseña (ver {@link #selloClave}). */
    public static final String SELLO_CLAVE = "cc";

    /** Milisegundos del último restablecimiento de la contraseña; 0 si nunca se restableció. */
    public static long selloClave(Usuario usuario) {
        return usuario.getClaveCambiadaEn() == null ? 0L : usuario.getClaveCambiadaEn().toInstant().toEpochMilli();
    }

    public String paraSesion(Usuario usuario) {
        Instant ahora = Instant.now();
        return Jwts.builder()
                .subject(usuario.getEmail())
                .claim("tipo", TIPO_SESION)
                .claim("uid", usuario.getId())
                .claim("rol", usuario.getRol().name())
                // El sello de la contraseña con la que se entró: sale de la MISMA
                // fila que el hash comprobado. Si la clave cambia después, deja de
                // coincidir y la sesión cae, aunque se emitiera un instante más tarde.
                .claim(SELLO_CLAVE, selloClave(usuario))
                .issuedAt(Date.from(ahora))
                .expiration(Date.from(ahora.plus(horasSesion, ChronoUnit.HOURS)))
                .signWith(clave)
                .compact();
    }

    /**
     * El token de un boton del correo. El {@code jti} es la pieza clave: queda
     * anotado en la tabla accion_token y permite invalidar el enlace en cuanto
     * se usa, cosa que la firma por si sola no puede hacer.
     */
    public String paraAccion(UUID jti, Long ordenId, Long tecnicoId, AccionTecnico accion) {
        Instant ahora = Instant.now();
        return Jwts.builder()
                .id(jti.toString())
                .subject(String.valueOf(tecnicoId))
                .claim("tipo", TIPO_ACCION)
                .claim("orden", ordenId)
                .claim("accion", accion.name())
                .issuedAt(Date.from(ahora))
                .expiration(Date.from(ahora.plus(horasAccion, ChronoUnit.HOURS)))
                .signWith(clave)
                .compact();
    }

    public Instant expiracionDeAccion() {
        return Instant.now().plus(horasAccion, ChronoUnit.HOURS);
    }

    /** Devuelve vacio ante cualquier problema: firma, caducidad o formato. */
    public Optional<Claims> leerSesion(String token) {
        return leer(token, TIPO_SESION);
    }

    public Optional<Claims> leerAccion(String token) {
        return leer(token, TIPO_ACCION);
    }

    private Optional<Claims> leer(String token, String tipoEsperado) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(clave)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            if (!tipoEsperado.equals(claims.get("tipo", String.class))) {
                return Optional.empty();
            }
            return Optional.of(claims);
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }
}
