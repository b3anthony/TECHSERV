package pe.techserv.visita.dto;

import pe.techserv.orden.EstadoOrden;

/**
 * Los pasos simples que el tecnico da desde su pagina: los que solo mueven el
 * estado. Cerrar y cobrar llevan datos y van por su propia ruta.
 */
public enum AccionVisita {

    CONFIRMAR(EstadoOrden.ASIGNADA,   EstadoOrden.CONFIRMADA, "confirmó la visita"),
    EN_CAMINO(EstadoOrden.CONFIRMADA, EstadoOrden.EN_CAMINO,  "salió hacia el domicilio"),
    LLEGUE   (EstadoOrden.EN_CAMINO,  EstadoOrden.EN_PROCESO, "llegó y empezó el trabajo");

    private final EstadoOrden desde;
    private final EstadoOrden hasta;
    private final String frase;

    AccionVisita(EstadoOrden desde, EstadoOrden hasta, String frase) {
        this.desde = desde;
        this.hasta = hasta;
        this.frase = frase;
    }

    public EstadoOrden getDesde() { return desde; }
    public EstadoOrden getHasta() { return hasta; }
    public String getFrase() { return frase; }
}
