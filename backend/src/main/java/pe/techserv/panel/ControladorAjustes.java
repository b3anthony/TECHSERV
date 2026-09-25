package pe.techserv.panel;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import pe.techserv.panel.dto.*;
import pe.techserv.seguridad.UsuarioAutenticado;

/**
 * Los ajustes del administrador del taller. Cuelga de /api/panel, así que solo
 * entra un ADMIN_MYPE, y el taller sale de su sesión, no de la URL.
 */
@RestController
@RequestMapping("/api/panel/ajustes")
public class ControladorAjustes {

    private final ServicioAjustes ajustes;

    public ControladorAjustes(ServicioAjustes ajustes) {
        this.ajustes = ajustes;
    }

    @GetMapping
    public AjustesTaller ver(@AuthenticationPrincipal UsuarioAutenticado usuario) {
        return ajustes.ver(usuario);
    }

    @PutMapping("/cuenta")
    public AjustesTaller cuenta(@AuthenticationPrincipal UsuarioAutenticado usuario,
                                @Valid @RequestBody ActualizarCuenta datos) {
        return ajustes.actualizarCuenta(usuario, datos);
    }

    @PutMapping("/negocio")
    public AjustesTaller negocio(@AuthenticationPrincipal UsuarioAutenticado usuario,
                                 @Valid @RequestBody ActualizarNegocio datos) {
        return ajustes.actualizarNegocio(usuario, datos);
    }

    @PutMapping("/clave")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void clave(@AuthenticationPrincipal UsuarioAutenticado usuario,
                      @Valid @RequestBody CambioClave datos) {
        ajustes.cambiarClave(usuario, datos);
    }

    @PutMapping("/horario")
    public AjustesTaller horario(@AuthenticationPrincipal UsuarioAutenticado usuario,
                                 @Valid @RequestBody ActualizarHorario datos) {
        return ajustes.actualizarHorario(usuario, datos);
    }

    @PutMapping("/metodos-pago")
    public AjustesTaller metodosPago(@AuthenticationPrincipal UsuarioAutenticado usuario,
                                     @Valid @RequestBody ActualizarMetodosPago datos) {
        return ajustes.actualizarMetodosPago(usuario, datos);
    }

    /** POST y no DELETE: lleva cuerpo (la contraseña y la confirmación). */
    @PostMapping("/eliminar-cuenta")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminarCuenta(@AuthenticationPrincipal UsuarioAutenticado usuario,
                               @Valid @RequestBody EliminarCuenta datos) {
        ajustes.eliminarCuenta(usuario, datos);
    }
}
