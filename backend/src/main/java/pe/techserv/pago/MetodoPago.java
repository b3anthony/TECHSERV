package pe.techserv.pago;

/** Lo que se usa de verdad en Trujillo. Sin pasarela: el prototipo registra. */
public enum MetodoPago {
    EFECTIVO("Efectivo"),
    YAPE("Yape"),
    PLIN("Plin"),
    TRANSFERENCIA("Transferencia bancaria");

    private final String etiqueta;
    MetodoPago(String etiqueta) { this.etiqueta = etiqueta; }
    public String getEtiqueta() { return etiqueta; }
}
