package pe.techserv.comun;

/**
 * Se lanza tanto cuando algo no existe como cuando existe pero no es de quien
 * pregunta.
 *
 * Es deliberado que las dos situaciones den 404 y no 403: un administrador que
 * pide la orden de otro taller no debe poder distinguir "no existe" de "existe y
 * no es tuya". Con 403 se podria ir probando ids para contar las ordenes de la
 * competencia.
 */
public class RecursoNoEncontrado extends RuntimeException {

    public RecursoNoEncontrado(String mensaje) {
        super(mensaje);
    }

    public static RecursoNoEncontrado orden(Object id) {
        return new RecursoNoEncontrado("No se encontró la orden " + id);
    }
}
