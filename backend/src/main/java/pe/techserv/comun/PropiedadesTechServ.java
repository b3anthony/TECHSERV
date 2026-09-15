package pe.techserv.comun;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * La configuracion propia de la aplicacion, tipada. Nada de @Value sueltos
 * repartidos: si falta una propiedad, falla al arrancar y no a medianoche.
 */
@ConfigurationProperties(prefix = "techserv")
public record PropiedadesTechServ(Jwt jwt,
                                  TokenAccion tokenAccion,
                                  String urlPublica,
                                  String urlFrontend,
                                  Subidas subidas) {

    /** La sesion del cliente y del administrador. */
    public record Jwt(String secreto, int horas) {}

    /** Los botones firmados del correo del tecnico. Viven mas: 72 h. */
    public record TokenAccion(int horas) {}

    public record Subidas(String directorio) {}
}
