package pe.techserv.comun;

/**
 * Lo que se pide choca con el estado actual: una franja que acaba de llenarse,
 * una orden que ya fue calificada, un salto que la maquina de estados no admite.
 * Devuelve 409.
 */
public class ConflictoEstado extends RuntimeException {

    public ConflictoEstado(String mensaje) {
        super(mensaje);
    }
}
