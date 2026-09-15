package pe.techserv.comun;

/** Las tres areas que atiende la plataforma. */
public enum Especialidad {
    SERVICIOS_HOGAR("Servicios del Hogar", "Gasfitería, electricidad, aire acondicionado"),
    SOPORTE_INFORMATICO("Soporte Técnico e Informático", "Laptops, PC, cámaras de seguridad"),
    REPARACION_ELECTRODOMESTICOS("Reparación de Electrodomésticos", "Lavadoras, refrigeradoras, secadoras");

    private final String titulo;
    private final String detalle;

    Especialidad(String titulo, String detalle) {
        this.titulo = titulo;
        this.detalle = detalle;
    }

    public String getTitulo()  { return titulo; }
    public String getDetalle() { return detalle; }
}
