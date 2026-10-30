package pe.techserv.diagnostico;

/**
 * El cliente subio fotos a su orden. Se publica dentro de la transaccion de la
 * subida y se atiende despues del commit: si la subida falla, no se lanza nada.
 */
public record FotosAdjuntadas(Long ordenId) {}
