package pe.techserv.seguridad;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import pe.techserv.comun.ErrorApi;
import pe.techserv.comun.PropiedadesTechServ;

import java.util.List;

@Configuration
@EnableMethodSecurity
public class ConfiguracionSeguridad {

    private final FiltroJwt filtroJwt;
    private final PropiedadesTechServ props;
    private final ObjectMapper json;

    public ConfiguracionSeguridad(FiltroJwt filtroJwt, PropiedadesTechServ props, ObjectMapper json) {
        this.filtroJwt = filtroJwt;
        this.props = props;
        this.json = json;
    }

    @Bean
    public PasswordEncoder codificadorClaves() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain cadena(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())          // API sin cookies: el token va en la cabecera
            .cors(cors -> cors.configurationSource(origenesPermitidos()))
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(rutas -> rutas
                // públicas: entrar, registrarse y mirar el catálogo de talleres
                .requestMatchers("/api/auth/login", "/api/auth/registro/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/catalogo/**").permitAll()
                // el técnico llega desde el correo, sin sesión: su seguridad es
                // el token firmado de un solo uso, no una contraseña
                .requestMatchers("/t/**").permitAll()
                // su pagina de trabajo, igual: la llave es el token del enlace
                .requestMatchers("/api/visita/**").permitAll()
                .requestMatchers("/uploads/**").permitAll()
                .requestMatchers("/api-docs/**", "/v3/api-docs/**", "/swagger-ui/**").permitAll()
                .requestMatchers("/actuator/health").permitAll()
                // el resto, con sesión
                .requestMatchers("/api/panel/**").hasRole("ADMIN_MYPE")
                .requestMatchers("/api/mis-ordenes/**").hasRole("CLIENTE")
                .requestMatchers("/api/mi-cuenta/**").hasRole("CLIENTE")
                .anyRequest().authenticated())
            .exceptionHandling(e -> e
                .authenticationEntryPoint((peticion, respuesta, ex) ->
                    escribir(respuesta, 401, "Inicia sesión para continuar", peticion.getRequestURI()))
                .accessDeniedHandler((peticion, respuesta, ex) ->
                    escribir(respuesta, 403, "No tienes permiso para esta acción", peticion.getRequestURI())))
            .addFilterBefore(filtroJwt,
                org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    private void escribir(jakarta.servlet.http.HttpServletResponse respuesta,
                          int estado, String mensaje, String ruta) throws java.io.IOException {
        respuesta.setStatus(estado);
        respuesta.setContentType(MediaType.APPLICATION_JSON_VALUE);
        respuesta.setCharacterEncoding("UTF-8");
        json.writeValue(respuesta.getWriter(), ErrorApi.de(estado, mensaje, ruta));
    }

    /** En desarrollo el frontend va por el proxy de Vite; esto es el cinturón. */
    @Bean
    public CorsConfigurationSource origenesPermitidos() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(props.urlFrontend()));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource fuente = new UrlBasedCorsConfigurationSource();
        fuente.registerCorsConfiguration("/**", config);
        return fuente;
    }
}
