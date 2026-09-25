package pe.techserv.orden;

import java.util.Set;

/**
 * Los ocho estados por los que pasa una orden, y —lo que importa— hacia cuales
 * puede saltar cada uno.
 *
 * La maquina de estados vive AQUI y en ningun otro sitio. El resto del codigo
 * pregunta {@link #permite(EstadoOrden)} en vez de escribir su propia condicion:
 * si manana se anade un estado, hay un solo archivo que tocar.
 */
public enum EstadoOrden {

    /** El cliente reservo. Nadie del taller la ha mirado todavia. */
    PENDIENTE("Pendiente"),
    /** La MYPE eligio tecnico y le mando el correo. Falta que el responda. */
    ASIGNADA("Asignada"),
    /** El tecnico pulso "Confirmar recepcion" en el correo. */
    CONFIRMADA("Confirmada"),
    /** El tecnico salio hacia el domicilio. */
    EN_CAMINO("En camino"),
    /** El tecnico llego y esta trabajando. */
    EN_PROCESO("En proceso"),
    /** Trabajo terminado, con diagnostico y total. */
    COMPLETADA("Completada"),
    /** El cliente ya califico. Estado final. */
    CALIFICADA("Calificada"),
    /** Se cayo antes de completarse. Estado final. */
    CANCELADA("Cancelada");

    private final String etiqueta;

    EstadoOrden(String etiqueta) {
        this.etiqueta = etiqueta;
    }

    public String getEtiqueta() {
        return etiqueta;
    }

    /** Los estados a los que se puede saltar desde este. Vacio = estado final. */
    public Set<EstadoOrden> siguientes() {
        return switch (this) {
            case PENDIENTE  -> Set.of(ASIGNADA, CANCELADA);
            // Vuelve a PENDIENTE si el técnico dice que no puede ir: la orden
            // regresa al taller para que la asigne a otro.
            case ASIGNADA   -> Set.of(PENDIENTE, CONFIRMADA, CANCELADA);
            case CONFIRMADA -> Set.of(EN_CAMINO, CANCELADA);
            case EN_CAMINO  -> Set.of(EN_PROCESO, CANCELADA);
            case EN_PROCESO -> Set.of(COMPLETADA, CANCELADA);
            case COMPLETADA -> Set.of(CALIFICADA);
            case CALIFICADA, CANCELADA -> Set.of();
        };
    }

    public boolean permite(EstadoOrden destino) {
        return siguientes().contains(destino);
    }

    public boolean esFinal() {
        return siguientes().isEmpty();
    }

    /** Si ya no tiene sentido que el taller la vea como trabajo por hacer. */
    public boolean estaCerrada() {
        return this == COMPLETADA || this == CALIFICADA || this == CANCELADA;
    }
}
