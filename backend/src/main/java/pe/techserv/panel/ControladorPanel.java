package pe.techserv.panel;

import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import pe.techserv.orden.EstadoOrden;
import pe.techserv.orden.dto.OrdenDetalle;
import pe.techserv.orden.dto.OrdenResumen;
import pe.techserv.panel.dto.PeticionAsignar;
import pe.techserv.panel.dto.TecnicoDisponible;
import pe.techserv.seguridad.UsuarioAutenticado;

import java.util.List;

/**
 * Las rutas del administrador de la MYPE.
 *
 * El mypeId NUNCA llega por la URL ni por el cuerpo: sale del usuario
 * autenticado. Si viniera del cliente, cambiar un numero en la barra del
 * navegador abriria el taller de al lado.
 */
@RestController
@RequestMapping("/api/panel")
public class ControladorPanel {

    private final ServicioPanel panel;

    public ControladorPanel(ServicioPanel panel) {
        this.panel = panel;
    }

    @GetMapping("/ordenes")
    public Page<OrdenResumen> bandeja(@AuthenticationPrincipal UsuarioAutenticado usuario,
                                      @RequestParam(required = false) EstadoOrden estado,
                                      @RequestParam(defaultValue = "0") int pagina,
                                      @RequestParam(defaultValue = "20") int tamano) {
        return panel.bandeja(usuario.mypeIdObligatorio(), estado, pagina, Math.min(tamano, 100));
    }

    @GetMapping("/ordenes/{id}")
    public OrdenDetalle detalle(@AuthenticationPrincipal UsuarioAutenticado usuario,
                                @PathVariable Long id) {
        return panel.detalle(usuario.mypeIdObligatorio(), id);
    }

    @PostMapping("/ordenes/{id}/asignar")
    public OrdenDetalle asignar(@AuthenticationPrincipal UsuarioAutenticado usuario,
                                @PathVariable Long id,
                                @Valid @RequestBody PeticionAsignar peticion) {
        return panel.asignar(usuario.mypeIdObligatorio(), id, peticion.tecnicoId());
    }

    /** Un enlace a la pagina del tecnico de esa orden, para compartirlo a mano. */
    @PostMapping("/ordenes/{id}/enlace-tecnico")
    public EnlaceTecnicoUrl enlaceTecnico(@AuthenticationPrincipal UsuarioAutenticado usuario,
                                          @PathVariable Long id) {
        return new EnlaceTecnicoUrl(panel.enlaceTecnico(usuario.mypeIdObligatorio(), id));
    }

    public record EnlaceTecnicoUrl(String url) {}

    @GetMapping("/tecnicos")
    public List<TecnicoDisponible> tecnicos(@AuthenticationPrincipal UsuarioAutenticado usuario) {
        return panel.tecnicos(usuario.mypeIdObligatorio());
    }

    @GetMapping("/indicadores")
    public ServicioPanel.Indicadores indicadores(@AuthenticationPrincipal UsuarioAutenticado usuario) {
        return panel.indicadores(usuario.mypeIdObligatorio());
    }
}
