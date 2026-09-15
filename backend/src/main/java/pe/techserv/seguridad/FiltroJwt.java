package pe.techserv.seguridad;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Lee la cabecera Authorization, valida el token de sesion y deja al usuario
 * puesto en el contexto.
 *
 * Si algo falla, NO responde con un error: se limita a no autenticar y deja
 * seguir la cadena. Quien decide si la ruta necesitaba sesion es la
 * configuracion de seguridad, en un solo sitio.
 */
@Component
public class FiltroJwt extends OncePerRequestFilter {

    private static final String CABECERA = "Authorization";
    private static final String PREFIJO = "Bearer ";

    private final ServicioJwt jwt;
    private final ServicioPrincipal principales;

    public FiltroJwt(ServicioJwt jwt, ServicioPrincipal principales) {
        this.jwt = jwt;
        this.principales = principales;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest peticion,
                                    @NonNull HttpServletResponse respuesta,
                                    @NonNull FilterChain cadena)
            throws ServletException, IOException {

        String cabecera = peticion.getHeader(CABECERA);
        if (cabecera != null && cabecera.startsWith(PREFIJO)
                && SecurityContextHolder.getContext().getAuthentication() == null) {

            String token = cabecera.substring(PREFIJO.length()).trim();
            jwt.leerSesion(token)
               .map(claims -> claims.get("uid", Number.class))
               .map(Number::longValue)
               .flatMap(principales::porId)
               .ifPresent(usuario -> {
                   var auth = new UsernamePasswordAuthenticationToken(
                           usuario, null, usuario.getAuthorities());
                   auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(peticion));
                   SecurityContextHolder.getContext().setAuthentication(auth);
               });
        }

        cadena.doFilter(peticion, respuesta);
    }
}
