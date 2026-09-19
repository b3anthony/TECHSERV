package pe.techserv.reporte;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.techserv.seguridad.UsuarioAutenticado;

import java.time.LocalDate;

import static org.springframework.format.annotation.DateTimeFormat.ISO.DATE;

/**
 * Endpoints del panel para la consulta de reportes y KPIs de la MYPE.
 */
@RestController
@RequestMapping("/api/panel/reportes")
public class ControladorReportes {

    private final ServicioReportes reportes;

    public ControladorReportes(ServicioReportes reportes) {
        this.reportes = reportes;
    }

    @GetMapping
    public ReportePanel reporte(@AuthenticationPrincipal UsuarioAutenticado usuario,
                                @RequestParam(required = false) @DateTimeFormat(iso = DATE) LocalDate desde,
                                @RequestParam(required = false) @DateTimeFormat(iso = DATE) LocalDate hasta) {
        return reportes.generar(usuario.mypeIdObligatorio(), desde, hasta);
    }
}
