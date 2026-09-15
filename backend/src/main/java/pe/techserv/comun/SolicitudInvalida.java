package pe.techserv.comun;

/** La peticion es coherente pero el negocio no la admite. Devuelve 400. */
public class SolicitudInvalida extends RuntimeException {

    public SolicitudInvalida(String mensaje) {
        super(mensaje);
    }
}
