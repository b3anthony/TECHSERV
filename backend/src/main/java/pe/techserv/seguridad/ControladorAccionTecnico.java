package pe.techserv.seguridad;

import io.jsonwebtoken.Claims;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Controller;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import pe.techserv.orden.ActorHistorial;
import pe.techserv.orden.EstadoOrden;
import pe.techserv.orden.OrdenHistorial;
import pe.techserv.orden.OrdenHistorialRepository;
import pe.techserv.orden.OrdenServicio;
import pe.techserv.orden.OrdenServicioRepository;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

@Controller
public class ControladorAccionTecnico {

    private final ServicioJwt servicioJwt;
    private final AccionTokenRepository tokenRepository;
    private final OrdenServicioRepository ordenRepository;
    private final OrdenHistorialRepository historialRepository;

    public ControladorAccionTecnico(ServicioJwt servicioJwt,
                                    AccionTokenRepository tokenRepository,
                                    OrdenServicioRepository ordenRepository,
                                    OrdenHistorialRepository historialRepository) {
        this.servicioJwt = servicioJwt;
        this.tokenRepository = tokenRepository;
        this.ordenRepository = ordenRepository;
        this.historialRepository = historialRepository;
    }

    @GetMapping("/t/accion")
    @Transactional
    public String ejecutarAccion(@RequestParam(name = "token", required = false) String token,
                                 Model model,
                                 HttpServletResponse response) {
        // 1. servicioJwt.leerAccion(token) devuelve algo (firma válida, no expirado en JWT, tipo accion)
        if (token == null || token.isBlank()) {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            return "tecnico/accion-invalida";
        }
        Optional<Claims> claimsOpt = servicioJwt.leerAccion(token);
        if (claimsOpt.isEmpty()) {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            return "tecnico/accion-invalida";
        }
        Claims claims = claimsOpt.get();

        // 2. El jti del JWT es un UUID y existe esa fila en accion_token
        String idStr = claims.getId();
        if (idStr == null) {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            return "tecnico/accion-invalida";
        }
        UUID jti;
        try {
            jti = UUID.fromString(idStr);
        } catch (IllegalArgumentException e) {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            return "tecnico/accion-invalida";
        }
        Optional<AccionToken> filaOpt = tokenRepository.findById(jti);
        if (filaOpt.isEmpty()) {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            return "tecnico/accion-invalida";
        }
        AccionToken fila = filaOpt.get();
        OrdenServicio orden = fila.getOrden();
        if (orden != null) {
            orden.getCodigo();
            orden.getEstado();
        }

        // 3. Los claims cuadran con la fila:
        //    el claim orden es el id de fila.getOrden()
        //    el subject es el id de fila.getTecnico()
        //    el claim accion es fila.getAccion()
        Number ordenClaim = claims.get("orden", Number.class);
        if (ordenClaim == null || orden == null || ordenClaim.longValue() != orden.getId().longValue()) {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            return "tecnico/accion-invalida";
        }

        String subClaim = claims.getSubject();
        if (subClaim == null || fila.getTecnico() == null || !subClaim.equals(String.valueOf(fila.getTecnico().getId()))) {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            return "tecnico/accion-invalida";
        }

        String accionClaim = claims.get("accion", String.class);
        if (accionClaim == null || fila.getAccion() == null || !accionClaim.equals(fila.getAccion().name())) {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            return "tecnico/accion-invalida";
        }

        // 4. fila.estaVencido() es falso
        if (fila.estaVencido()) {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            return "tecnico/accion-invalida";
        }

        // 5. fila.estaUsado() es falso
        if (fila.estaUsado()) {
            model.addAttribute("orden", orden);
            model.addAttribute("accion", fila.getAccion());
            response.setStatus(HttpServletResponse.SC_OK);
            return "tecnico/accion-ya-registrada";
        }

        // 6. fila.getAccion().aplicableDesde(orden.getEstado()) es verdadero
        if (!fila.getAccion().aplicableDesde(orden.getEstado())) {
            model.addAttribute("orden", orden);
            model.addAttribute("accion", fila.getAccion());
            response.setStatus(HttpServletResponse.SC_CONFLICT);
            return "tecnico/accion-no-aplicable";
        }

        int reclamado = tokenRepository.marcarUsado(jti, OffsetDateTime.now());
        if (reclamado == 0) {
            model.addAttribute("orden", orden);
            model.addAttribute("accion", fila.getAccion());
            response.setStatus(HttpServletResponse.SC_OK);
            return "tecnico/accion-ya-registrada";
        }

        // Si pasa las seis: cambiar estado, registrar fecha de uso y guardar historial
        EstadoOrden estadoAnterior = orden.getEstado();
        EstadoOrden estadoNuevo = fila.getAccion().getHasta();
        orden.setEstado(estadoNuevo);
        ordenRepository.save(orden);

        OrdenHistorial paso = new OrdenHistorial();
        paso.setOrden(orden);
        paso.setEstadoAnterior(estadoAnterior);
        paso.setEstadoNuevo(estadoNuevo);
        paso.setActor(ActorHistorial.TECNICO);
        paso.setNota("El técnico pulsó «" + fila.getAccion().getEtiqueta() + "» desde el correo");
        historialRepository.save(paso);
        orden.getHistorial().add(paso);

        model.addAttribute("orden", orden);
        model.addAttribute("accion", fila.getAccion());
        response.setStatus(HttpServletResponse.SC_OK);
        return "tecnico/accion-confirmada";
    }
}
