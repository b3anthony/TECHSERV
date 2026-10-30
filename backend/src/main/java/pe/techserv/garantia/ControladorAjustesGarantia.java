package pe.techserv.garantia;

import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import pe.techserv.garantia.dto.AjusteGarantia;
import pe.techserv.seguridad.UsuarioAutenticado;

@RestController
@RequestMapping("/api/panel/ajustes/garantia")
public class ControladorAjustesGarantia {
    private final ServicioAjustesGarantia ajustes;

    public ControladorAjustesGarantia(ServicioAjustesGarantia ajustes) {
        this.ajustes = ajustes;
    }

    @GetMapping
    public AjusteGarantia ver(@AuthenticationPrincipal UsuarioAutenticado usuario) {
        return ajustes.ver(usuario.mypeIdObligatorio());
    }

    @PutMapping
    public AjusteGarantia actualizar(@AuthenticationPrincipal UsuarioAutenticado usuario,
                                     @Valid @RequestBody AjusteGarantia datos) {
        return ajustes.actualizar(usuario.mypeIdObligatorio(), datos);
    }
}
