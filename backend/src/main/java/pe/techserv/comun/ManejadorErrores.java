package pe.techserv.comun;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.util.LinkedHashMap;
import java.util.Map;

/** Traduce las excepciones del dominio a respuestas HTTP, en un solo sitio. */
@RestControllerAdvice
public class ManejadorErrores {

    private static final Logger log = LoggerFactory.getLogger(ManejadorErrores.class);

    @ExceptionHandler(RecursoNoEncontrado.class)
    public ResponseEntity<ErrorApi> noEncontrado(RecursoNoEncontrado e, HttpServletRequest req) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ErrorApi.de(404, e.getMessage(), req.getRequestURI()));
    }

    @ExceptionHandler(SolicitudInvalida.class)
    public ResponseEntity<ErrorApi> invalida(SolicitudInvalida e, HttpServletRequest req) {
        return ResponseEntity.badRequest()
                .body(ErrorApi.de(400, e.getMessage(), req.getRequestURI()));
    }

    @ExceptionHandler(ConflictoEstado.class)
    public ResponseEntity<ErrorApi> conflicto(ConflictoEstado e, HttpServletRequest req) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ErrorApi.de(409, e.getMessage(), req.getRequestURI()));
    }

    /** Errores de @Valid: se devuelven por campo para poder pintarlos al lado. */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorApi> validacion(MethodArgumentNotValidException e,
                                               HttpServletRequest req) {
        Map<String, String> campos = new LinkedHashMap<>();
        e.getBindingResult().getFieldErrors()
         .forEach(f -> campos.putIfAbsent(f.getField(), f.getDefaultMessage()));
        return ResponseEntity.badRequest()
                .body(ErrorApi.deCampos("Revisa los datos del formulario",
                                        req.getRequestURI(), campos));
    }

    /** Un parámetro de la URL que no se puede leer (?estado=FOO, ?desde=ayer): es culpa de la petición, no un 500. */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorApi> parametroInvalido(MethodArgumentTypeMismatchException e,
                                                      HttpServletRequest req) {
        return ResponseEntity.badRequest()
                .body(ErrorApi.de(400, "El parámetro «" + e.getName() + "» no es válido",
                                  req.getRequestURI()));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ErrorApi> subidaGrande(HttpServletRequest req) {
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
                .body(ErrorApi.de(413, "Cada foto debe pesar como máximo 5 MB",
                                  req.getRequestURI()));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorApi> sinPermiso(HttpServletRequest req) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ErrorApi.de(403, "No tienes permiso para esta acción",
                                  req.getRequestURI()));
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ErrorApi> sinIdentificar(HttpServletRequest req) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ErrorApi.de(401, "Inicia sesión para continuar", req.getRequestURI()));
    }

    /**
     * El resto. Se registra entero en el log y al cliente se le da un mensaje
     * generico: un stack trace en la respuesta le cuenta a cualquiera como esta
     * hecha la aplicacion por dentro.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorApi> inesperado(Exception e, HttpServletRequest req) {
        log.error("Error no controlado en {} {}", req.getMethod(), req.getRequestURI(), e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ErrorApi.de(500, "Ocurrió un error inesperado", req.getRequestURI()));
    }
}
