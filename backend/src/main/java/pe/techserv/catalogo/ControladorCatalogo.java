package pe.techserv.catalogo;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;
import pe.techserv.comun.Especialidad;

import java.time.LocalDate;
import java.util.List;

/**
 * Lo que se puede mirar sin tener cuenta. Es a propósito: obligar a registrarse
 * antes de ver precios es la forma más rápida de perder al cliente que tiene la
 * lavadora rota y prisa.
 */
@RestController
@RequestMapping("/api/catalogo")
public class ControladorCatalogo {

    private final ServicioCatalogo catalogo;

    public ControladorCatalogo(ServicioCatalogo catalogo) {
        this.catalogo = catalogo;
    }

    @GetMapping("/especialidades")
    public List<EspecialidadResumen> especialidades() {
        return catalogo.especialidades();
    }

    @GetMapping("/mypes")
    public List<MypeCatalogo> talleres(@RequestParam Especialidad especialidad,
                                       @RequestParam(required = false) String distrito) {
        return catalogo.talleres(especialidad, distrito);
    }

    @GetMapping("/mypes/{id}/agenda")
    public ServicioCatalogo.AgendaDia agenda(
            @PathVariable Long id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fecha) {
        return catalogo.agenda(id, fecha);
    }
}
