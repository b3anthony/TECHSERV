package pe.techserv.panel;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.techserv.orden.dto.OrdenDetalle;
import pe.techserv.panel.dto.CierreOrden;
import pe.techserv.panel.dto.DetallePago;
import pe.techserv.panel.dto.RegistroPago;
import pe.techserv.seguridad.UsuarioAutenticado;

/**
 * Rutas del panel para el tramo final de la orden:
 * inicio de trabajo en proceso, cierre técnico y registro de pago.
 */
@RestController
@RequestMapping("/api/panel")
public class ControladorCierre {

    private final ServicioCierre cierre;

    public ControladorCierre(ServicioCierre cierre) {
        this.cierre = cierre;
    }

    @PostMapping("/ordenes/{id}/en-proceso")
    public OrdenDetalle pasarAEnProceso(@AuthenticationPrincipal UsuarioAutenticado usuario,
                                        @PathVariable Long id) {
        return cierre.pasarAEnProceso(usuario.mypeIdObligatorio(), id);
    }

    @PostMapping("/ordenes/{id}/cerrar")
    public OrdenDetalle cerrar(@AuthenticationPrincipal UsuarioAutenticado usuario,
                               @PathVariable Long id,
                               @Valid @RequestBody CierreOrden peticion) {
        return cierre.cerrar(usuario.mypeIdObligatorio(), id, peticion);
    }

    @PostMapping("/ordenes/{id}/pago")
    public DetallePago registrarPago(@AuthenticationPrincipal UsuarioAutenticado usuario,
                                     @PathVariable Long id,
                                     @Valid @RequestBody RegistroPago peticion) {
        return cierre.registrarPago(usuario.mypeIdObligatorio(), id, peticion);
    }

    /** 200 con el pago si ya se cobró; 204 si todavía no. */
    @GetMapping("/ordenes/{id}/pago")
    public ResponseEntity<DetallePago> pago(@AuthenticationPrincipal UsuarioAutenticado usuario,
                                            @PathVariable Long id) {
        return cierre.pagoDe(usuario.mypeIdObligatorio(), id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }
}
