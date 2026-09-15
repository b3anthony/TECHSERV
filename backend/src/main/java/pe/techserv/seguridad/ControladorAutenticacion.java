package pe.techserv.seguridad;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import pe.techserv.seguridad.dto.*;

@RestController
@RequestMapping("/api/auth")
public class ControladorAutenticacion {

    private final ServicioAutenticacion autenticacion;

    public ControladorAutenticacion(ServicioAutenticacion autenticacion) {
        this.autenticacion = autenticacion;
    }

    /** El botón principal: un solo formulario para los tres roles. */
    @PostMapping("/login")
    public RespuestaSesion entrar(@Valid @RequestBody PeticionLogin peticion) {
        return autenticacion.entrar(peticion);
    }

    /** "Quiero solicitar un servicio". */
    @PostMapping("/registro/cliente")
    public ResponseEntity<RespuestaSesion> registrarCliente(@Valid @RequestBody RegistroCliente datos) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(autenticacion.registrarCliente(datos));
    }

    /** "Quiero registrar mi negocio". */
    @PostMapping("/registro/negocio")
    public ResponseEntity<RespuestaSesion> registrarNegocio(@Valid @RequestBody RegistroNegocio datos) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(autenticacion.registrarNegocio(datos));
    }

    /** Para que el frontend recupere la sesión al recargar la página. */
    @GetMapping("/yo")
    public UsuarioActual yo(@AuthenticationPrincipal UsuarioAutenticado usuario) {
        return autenticacion.aUsuarioActual(usuario);
    }
}
