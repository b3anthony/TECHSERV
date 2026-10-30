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
    private final ServicioRecuperacionClave recuperacion;

    public ControladorAutenticacion(ServicioAutenticacion autenticacion, ServicioRecuperacionClave recuperacion) {
        this.autenticacion = autenticacion;
        this.recuperacion = recuperacion;
    }

    /** El botón principal: un solo formulario para los tres roles. */
    @PostMapping("/login")
    public RespuestaSesion entrar(@Valid @RequestBody PeticionLogin peticion) {
        return autenticacion.entrar(peticion);
    }

    @PostMapping("/recuperar-clave")
    public ResponseEntity<Void> recuperarClave(@Valid @RequestBody RecuperarClave datos) {
        recuperacion.recuperar(datos);
        return ResponseEntity.accepted().build();
    }

    @PostMapping("/restablecer-clave")
    public ResponseEntity<Void> restablecerClave(@Valid @RequestBody RestablecerClave datos) {
        recuperacion.restablecer(datos);
        return ResponseEntity.noContent().build();
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
