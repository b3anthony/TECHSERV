package pe.techserv.diagnostico.dto;

import java.util.List;

/**
 * El diagnostico de la IA resumido para el tecnico: que llevar, que revisar
 * primero y con que cuidado. Sale de un diagnostico ya guardado; ensenarlo no
 * llama a la IA.
 *
 * Sin precios ni ids: el tecnico no los necesita para preparar la visita.
 */
public record GuiaTecnico(Equipo equipo,
                          List<RepuestoQueLlevar> repuestos,
                          List<String> herramientas,
                          List<String> quizaFalten,
                          List<Revision> revisar,
                          List<String> precauciones) {

    public record Equipo(String tipo, String marca, String modelo, String fuente) {}

    /** Del inventario del taller. {@code sinStock}: el taller no tiene ninguno ahora mismo. */
    public record RepuestoQueLlevar(String nombre, boolean sinStock) {}

    /** Una posible falla, de la mas a la menos probable, con lo que hay que hacer. */
    public record Revision(String falla, String probabilidad, String queHacer) {}
}
