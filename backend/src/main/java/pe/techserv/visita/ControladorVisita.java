package pe.techserv.visita;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import pe.techserv.panel.dto.CierreOrden;
import pe.techserv.panel.dto.RegistroPago;
import pe.techserv.visita.dto.AccionVisita;
import pe.techserv.visita.dto.VistaVisita;

import java.util.List;

/**
 * La pagina del tecnico. Sin sesion: la llave es el token del enlace, que
 * ServicioVisita resuelve en cada peticion. Todas devuelven la vista completa
 * para que la pagina se repinte con una sola respuesta.
 */
@RestController
@RequestMapping("/api/visita/{token}")
public class ControladorVisita {

    private final ServicioVisita visitas;

    public ControladorVisita(ServicioVisita visitas) {
        this.visitas = visitas;
    }

    @GetMapping
    public VistaVisita ver(@PathVariable String token) {
        return visitas.ver(token);
    }

    @PostMapping("/confirmar")
    public VistaVisita confirmar(@PathVariable String token) {
        return visitas.avanzar(token, AccionVisita.CONFIRMAR);
    }

    @PostMapping("/en-camino")
    public VistaVisita enCamino(@PathVariable String token) {
        return visitas.avanzar(token, AccionVisita.EN_CAMINO);
    }

    @PostMapping("/llegue")
    public VistaVisita llegue(@PathVariable String token) {
        return visitas.avanzar(token, AccionVisita.LLEGUE);
    }

    @PostMapping("/terminar")
    public VistaVisita terminar(@PathVariable String token, @Valid @RequestBody CierreOrden peticion) {
        return visitas.terminar(token, peticion);
    }

    @PostMapping("/cobro")
    public VistaVisita cobrar(@PathVariable String token, @Valid @RequestBody RegistroPago peticion) {
        return visitas.cobrar(token, peticion);
    }

    @PostMapping(value = "/fotos", consumes = "multipart/form-data")
    public VistaVisita fotos(@PathVariable String token, @RequestPart("fotos") List<MultipartFile> fotos) {
        return visitas.subirFotos(token, fotos);
    }
}
