package pe.techserv.diagnostico;

/** La IA no dio un diagnostico. El mensaje es para el admin, en espanol. */
public class FalloProveedorIa extends RuntimeException {

    public FalloProveedorIa(String mensaje) {
        super(mensaje);
    }

    public FalloProveedorIa(String mensaje, Throwable causa) {
        super(mensaje, causa);
    }
}
