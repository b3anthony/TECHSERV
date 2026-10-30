package pe.techserv.panel;

import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import pe.techserv.panel.dto.ActualizarDatosCobro;
import pe.techserv.panel.dto.DatosCobro;
import pe.techserv.seguridad.UsuarioAutenticado;

/** ADMIN_MYPE por /api/panel/**; no recibe un mypeId en la URL ni en el cuerpo. */
@RestController
@RequestMapping("/api/panel/ajustes/cobro")
public class ControladorDatosCobro {

    private final ServicioDatosCobro cobro;

    public ControladorDatosCobro(ServicioDatosCobro cobro) {
        this.cobro = cobro;
    }

    @GetMapping
    public DatosCobro ver(@AuthenticationPrincipal UsuarioAutenticado usuario) {
        return cobro.ver(usuario);
    }

    @PutMapping
    public DatosCobro actualizar(@AuthenticationPrincipal UsuarioAutenticado usuario,
                                 @Valid @RequestBody ActualizarDatosCobro datos) {
        return cobro.actualizar(usuario, datos);
    }

    @PostMapping(value = "/qr/{metodo}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public DatosCobro subirQr(@AuthenticationPrincipal UsuarioAutenticado usuario,
                             @PathVariable String metodo,
                             @RequestPart(value = "imagen", required = false) MultipartFile imagen) {
        return cobro.subirQr(usuario, metodo, imagen);
    }

    @DeleteMapping("/qr/{metodo}")
    public DatosCobro quitarQr(@AuthenticationPrincipal UsuarioAutenticado usuario,
                              @PathVariable String metodo) {
        return cobro.quitarQr(usuario, metodo);
    }
}
