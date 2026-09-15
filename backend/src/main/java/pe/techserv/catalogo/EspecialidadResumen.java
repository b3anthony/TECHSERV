package pe.techserv.catalogo;

import pe.techserv.comun.Especialidad;

/** Una de las tres áreas, tal como se pinta en el selector del cliente. */
public record EspecialidadResumen(Especialidad clave, String titulo, String detalle) {

    public static EspecialidadResumen de(Especialidad e) {
        return new EspecialidadResumen(e, e.getTitulo(), e.getDetalle());
    }
}
