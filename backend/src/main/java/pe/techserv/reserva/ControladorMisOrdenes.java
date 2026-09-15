package pe.techserv.reserva;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import pe.techserv.orden.dto.OrdenDetalle;
import pe.techserv.orden.dto.OrdenResumen;
import pe.techserv.reserva.dto.NuevaReserva;
import pe.techserv.seguridad.UsuarioAutenticado;

import java.util.List;

/**
 * Las rutas del cliente.
 *
 * Igual que en el panel, el clienteId sale del usuario autenticado: si viniera
 * en la URL, cambiar un número dejaría ver las órdenes de otra persona.
 */
@RestController
@RequestMapping("/api/mis-ordenes")
public class ControladorMisOrdenes {

    private final ServicioReserva reservas;

    public ControladorMisOrdenes(ServicioReserva reservas) {
        this.reservas = reservas;
    }

    @PostMapping
    public ResponseEntity<OrdenDetalle> reservar(
            @AuthenticationPrincipal UsuarioAutenticado usuario,
            @Valid @RequestBody NuevaReserva datos) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(reservas.reservar(usuario.clienteIdObligatorio(), datos));
    }

    /** Las fotos van aparte para poder subirlas con barra de progreso. */
    @PostMapping(value = "/{id}/fotos", consumes = "multipart/form-data")
    public OrdenDetalle adjuntarFotos(@AuthenticationPrincipal UsuarioAutenticado usuario,
                                      @PathVariable Long id,
                                      @RequestPart("fotos") List<MultipartFile> fotos) {
        return reservas.adjuntarFotos(usuario.clienteIdObligatorio(), id, fotos);
    }

    @GetMapping
    public List<OrdenResumen> mias(@AuthenticationPrincipal UsuarioAutenticado usuario) {
        return reservas.misOrdenes(usuario.clienteIdObligatorio());
    }

    @GetMapping("/{id}")
    public OrdenDetalle detalle(@AuthenticationPrincipal UsuarioAutenticado usuario,
                                @PathVariable Long id) {
        return reservas.miOrden(usuario.clienteIdObligatorio(), id);
    }

    @PostMapping("/{id}/cancelar")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cancelar(@AuthenticationPrincipal UsuarioAutenticado usuario,
                         @PathVariable Long id,
                         @RequestBody(required = false) MotivoCancelacion motivo) {
        reservas.cancelar(usuario.clienteIdObligatorio(), id,
                          motivo == null ? null : motivo.motivo());
    }

    public record MotivoCancelacion(String motivo) {}
}
