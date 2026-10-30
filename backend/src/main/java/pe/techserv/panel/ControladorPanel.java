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

import java.time.LocalDate;
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
                                      @RequestParam(required = false) String q,
                                      @RequestParam(required = false) Long tecnicoId,
                                      @RequestParam(defaultValue = "false") boolean sinTecnico,
                                      @RequestParam(required = false) LocalDate desde,
                                      @RequestParam(required = false) LocalDate hasta,
                                      @RequestParam(required = false) BusquedaOrdenes.Orden orden,
                                      @RequestParam(defaultValue = "0") int pagina,
                                      @RequestParam(defaultValue = "20") int tamano) {
        var filtro = new BusquedaOrdenes.Filtro(q, tecnicoId, sinTecnico, desde, hasta, orden);
        return panel.bandeja(usuario.mypeIdObligatorio(), estado, filtro,
                             Math.max(pagina, 0), Math.clamp(tamano, 1, 100));
    }

    /** Los números de las pestañas: los mismos filtros que la lista, sin la etapa. */
    @GetMapping("/ordenes/conteos")
    public ServicioPanel.ConteosBandeja conteos(@AuthenticationPrincipal UsuarioAutenticado usuario,
                                                @RequestParam(required = false) String q,
                                                @RequestParam(required = false) Long tecnicoId,
                                                @RequestParam(defaultValue = "false") boolean sinTecnico,
                                                @RequestParam(required = false) LocalDate desde,
                                                @RequestParam(required = false) LocalDate hasta) {
        var filtro = new BusquedaOrdenes.Filtro(q, tecnicoId, sinTecnico, desde, hasta, null);
        return panel.conteos(usuario.mypeIdObligatorio(), filtro);
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
