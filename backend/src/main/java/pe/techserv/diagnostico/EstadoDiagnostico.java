package pe.techserv.diagnostico;

/**
 * En que va el diagnostico de una orden. {@code SIN_CONFIGURAR} no se guarda:
 * es lo que responde el panel cuando el servidor no tiene clave de Gemini.
 */
public enum EstadoDiagnostico {
    PENDIENTE,
    LISTO,
    ERROR,
    SIN_CONFIGURAR
}
