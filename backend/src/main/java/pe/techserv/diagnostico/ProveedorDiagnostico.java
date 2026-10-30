package pe.techserv.diagnostico;

import java.util.List;

/**
 * Quien hace el diagnostico. Hoy Gemini; las pruebas ponen uno falso y nunca
 * salen a la red.
 */
public interface ProveedorDiagnostico {

    /** Si hay clave. Sin ella no se llama a nada y el panel dice SIN_CONFIGURAR. */
    boolean configurado();

    /** El modelo que se usara, para dejarlo anotado junto al resultado. */
    String modelo();

    /**
     * @return la respuesta y el modelo que la dio de verdad (puede ser el de respaldo)
     * @throws FalloProveedorIa con un mensaje que se puede ensenar al admin
     */
    Diagnostico diagnosticar(Peticion peticion);

    record Diagnostico(RespuestaIa respuesta, String modelo) {}

    /** Lo que se le cuenta a la IA. Los repuestos son SOLO los del taller de la orden. */
    record Peticion(String especialidad,
                    String descripcionFalla,
                    List<Foto> fotos,
                    List<RepuestoCatalogo> repuestos) {}

    record Foto(String tipoMime, byte[] bytes) {}

    record RepuestoCatalogo(Long id, String nombre, String descripcion) {}
}
