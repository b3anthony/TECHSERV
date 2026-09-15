package pe.techserv.usuario;

public enum Rol {
    /** Pide servicios. Se registra solo desde la web. */
    CLIENTE,
    /** Dueño o encargado de una MYPE. Se registra solo desde la web. */
    ADMIN_MYPE,
    /** Trabaja para una MYPE. Lo crea el administrador desde su panel. */
    TECNICO
}
