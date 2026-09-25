package pe.techserv.cliente;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import pe.techserv.cliente.dto.ActualizarCuentaCliente;
import pe.techserv.cliente.dto.CuentaCliente;
import pe.techserv.cliente.dto.CuentaDesactivada;
import pe.techserv.cliente.dto.DesactivarCuenta;
import pe.techserv.panel.dto.CambioClave;
import pe.techserv.seguridad.UsuarioAutenticado;

/**
 * Los ajustes del cliente. Solo entra un CLIENTE, y la cuenta sale de su
 * sesión, nunca de la URL.
 */
@RestController
@RequestMapping("/api/mi-cuenta")
public class ControladorMiCuenta {

    private final ServicioCuentaCliente cuentas;

    public ControladorMiCuenta(ServicioCuentaCliente cuentas) {
        this.cuentas = cuentas;
    }

    @GetMapping
    public CuentaCliente ver(@AuthenticationPrincipal UsuarioAutenticado usuario) {
        return cuentas.ver(usuario);
    }

    @PutMapping
    public CuentaCliente actualizar(@AuthenticationPrincipal UsuarioAutenticado usuario,
                                    @Valid @RequestBody ActualizarCuentaCliente datos) {
        return cuentas.actualizar(usuario, datos);
    }

    @PutMapping("/clave")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void clave(@AuthenticationPrincipal UsuarioAutenticado usuario,
                      @Valid @RequestBody CambioClave datos) {
        cuentas.cambiarClave(usuario, datos);
    }

    @PostMapping("/desactivar")
    public CuentaDesactivada desactivar(@AuthenticationPrincipal UsuarioAutenticado usuario,
                                        @Valid @RequestBody DesactivarCuenta datos) {
        return cuentas.desactivar(usuario, datos);
    }
}
