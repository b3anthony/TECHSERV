package pe.techserv.notificacion;

import pe.techserv.orden.OrdenServicio;

/**
 * El aviso que recibe el tecnico cuando le asignan una orden.
 *
 * Es la costura entre el panel (quien asigna) y el correo (quien avisa): el
 * panel depende de esta interfaz y no de como se manda el correo, asi que
 * asignar se puede probar sin levantar un servidor SMTP.
 *
 * Se inyecta como Optional: si todavia no hay implementacion, asignar sigue
 * funcionando y simplemente no sale ningun correo.
 */
public interface AvisoTecnico {

    /** La orden ya tiene tecnico y estado ASIGNADA cuando se llama a esto. */
    void avisarAsignacion(OrdenServicio orden);
}
