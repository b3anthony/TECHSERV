package pe.techserv.diagnostico;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import pe.techserv.diagnostico.dto.DiagnosticoIaVista;
import pe.techserv.seguridad.UsuarioAutenticado;

/**
 * El diagnostico de la IA, solo para el taller. Cuelga de /api/panel, asi que
 * hereda la regla de seguridad del panel; y el mypeId sale del usuario
 * autenticado, como en el resto de rutas del panel.
 */
@RestController
@RequestMapping("/api/panel/ordenes/{id}/diagnostico-ia")
public class ControladorDiagnosticoIa {

    private final ServicioDiagnosticoIa diagnosticos;

    public ControladorDiagnosticoIa(ServicioDiagnosticoIa diagnosticos) {
        this.diagnosticos = diagnosticos;
    }

    @GetMapping
    public DiagnosticoIaVista obtener(@AuthenticationPrincipal UsuarioAutenticado usuario,
                                      @PathVariable Long id) {
        return diagnosticos.obtener(usuario.mypeIdObligatorio(), id);
    }

    /** Volver a analizar. 202: el resultado llega despues; el panel lo vuelve a pedir. */
    @PostMapping
    @ResponseStatus(HttpStatus.ACCEPTED)
    public DiagnosticoIaVista rehacer(@AuthenticationPrincipal UsuarioAutenticado usuario,
                                      @PathVariable Long id) {
        return diagnosticos.rehacer(usuario.mypeIdObligatorio(), id);
    }
}
