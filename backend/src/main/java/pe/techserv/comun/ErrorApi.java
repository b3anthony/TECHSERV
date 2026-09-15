package pe.techserv.comun;

import java.time.OffsetDateTime;
import java.util.Map;

/**
 * La forma unica de un error de la API. Se devuelve siempre igual para que el
 * frontend no tenga que adivinar.
 *
 * @param campos errores por campo en una validacion; nulo en los demas casos
 */
public record ErrorApi(int estado,
                       String mensaje,
                       String ruta,
                       Map<String, String> campos,
                       OffsetDateTime momento) {

    public static ErrorApi de(int estado, String mensaje, String ruta) {
        return new ErrorApi(estado, mensaje, ruta, null, OffsetDateTime.now());
    }

    public static ErrorApi deCampos(String mensaje, String ruta, Map<String, String> campos) {
        return new ErrorApi(400, mensaje, ruta, campos, OffsetDateTime.now());
    }
}
