package pe.techserv.seguridad;

import pe.techserv.orden.EstadoOrden;

/**
 * Las acciones que un tecnico puede disparar desde un boton del correo, sin
 * iniciar sesion. Cada una declara desde que estado sale y a cual lleva, asi que
 * un token valido para CONFIRMAR no sirve para cerrar la orden.
 */
public enum AccionTecnico {

    CONFIRMAR ("Confirmar recepción", EstadoOrden.ASIGNADA,    EstadoOrden.CONFIRMADA),
    EN_CAMINO ("Voy en camino",       EstadoOrden.CONFIRMADA,  EstadoOrden.EN_CAMINO),
    COMPLETAR ("Trabajo completado",  EstadoOrden.EN_PROCESO,  EstadoOrden.COMPLETADA);

    private final String etiqueta;
    private final EstadoOrden desde;
    private final EstadoOrden hasta;

    AccionTecnico(String etiqueta, EstadoOrden desde, EstadoOrden hasta) {
        this.etiqueta = etiqueta;
        this.desde = desde;
        this.hasta = hasta;
    }

    public String getEtiqueta()  { return etiqueta; }
    public EstadoOrden getDesde() { return desde; }
    public EstadoOrden getHasta() { return hasta; }

    public boolean aplicableDesde(EstadoOrden estadoActual) {
        return this.desde == estadoActual;
    }
}
