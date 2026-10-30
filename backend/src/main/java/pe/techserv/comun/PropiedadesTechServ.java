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
                                  Subidas subidas,
                                  Ia ia) {

    /** La sesion del cliente y del administrador. */
    public record Jwt(String secreto, int horas) {}

    /** Los botones firmados del correo del tecnico. Viven mas: 72 h. */
    public record TokenAccion(int horas) {}

    public record Subidas(String directorio) {}

    /**
     * El diagnostico con Gemini. Sin clave, la aplicacion arranca igual y el
     * panel dice que no esta activado. {@code maxBytesFotos} es lo que se manda
     * de fotos por peticion: Gemini admite 20 MB en total y el base64 engorda
     * un tercio. {@code modeloRespaldo} se usa cuando el principal esta
     * saturado (503); vacio, no hay respaldo.
     */
    public record Ia(String clave, String modelo, String modeloRespaldo, String urlBase, long maxBytesFotos) {}
}
