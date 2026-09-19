package pe.techserv.panel;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import pe.techserv.comun.Especialidad;
import pe.techserv.panel.dto.*;
import pe.techserv.seguridad.UsuarioAutenticado;

import java.util.List;

/**
 * Rutas de administración para el panel del taller: técnicos, tarifas y repuestos.
 *
 * El mypeId NUNCA llega por la URL ni por el cuerpo: se obtiene exclusivamente de
 * usuario.mypeIdObligatorio(), garantizando el aislamiento entre talleres.
 */
@RestController
@RequestMapping("/api/panel")
public class ControladorAdministracion {

    private final ServicioAdministracion admin;

    public ControladorAdministracion(ServicioAdministracion admin) {
        this.admin = admin;
    }

    // ───────────────────────────── Técnicos ─────────────────────────────

    @PostMapping("/tecnicos")
    @ResponseStatus(HttpStatus.CREATED)
    public DetalleTecnico crearTecnico(@AuthenticationPrincipal UsuarioAutenticado usuario,
                                       @Valid @RequestBody NuevoTecnico datos) {
        return admin.crearTecnico(usuario.mypeIdObligatorio(), datos);
    }

    @PatchMapping("/tecnicos/{id}")
    public DetalleTecnico actualizarTecnico(@AuthenticationPrincipal UsuarioAutenticado usuario,
                                            @PathVariable Long id,
                                            @Valid @RequestBody ActualizarTecnico datos) {
        return admin.actualizarTecnico(usuario.mypeIdObligatorio(), id, datos);
    }

    @DeleteMapping("/tecnicos/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void darDeBajaTecnico(@AuthenticationPrincipal UsuarioAutenticado usuario,
                                 @PathVariable Long id) {
        admin.darDeBajaTecnico(usuario.mypeIdObligatorio(), id);
    }

    // ───────────────────────────── Tarifas ─────────────────────────────

    @GetMapping("/tarifas")
    public List<TarifaResumen> listarTarifas(@AuthenticationPrincipal UsuarioAutenticado usuario) {
        return admin.listarTarifas(usuario.mypeIdObligatorio());
    }

    @PutMapping("/tarifas/{especialidad}")
    public TarifaResumen fijarTarifa(@AuthenticationPrincipal UsuarioAutenticado usuario,
                                     @PathVariable Especialidad especialidad,
                                     @Valid @RequestBody ActualizarTarifa datos) {
        return admin.fijarTarifa(usuario.mypeIdObligatorio(), especialidad, datos.tarifaBase());
    }

    @DeleteMapping("/tarifas/{especialidad}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminarTarifa(@AuthenticationPrincipal UsuarioAutenticado usuario,
                               @PathVariable Especialidad especialidad) {
        admin.eliminarTarifa(usuario.mypeIdObligatorio(), especialidad);
    }

    // ───────────────────────────── Repuestos ─────────────────────────────

    @GetMapping("/repuestos")
    public List<RepuestoResumen> listarRepuestos(@AuthenticationPrincipal UsuarioAutenticado usuario) {
        return admin.listarRepuestos(usuario.mypeIdObligatorio());
    }

    @PostMapping("/repuestos")
    @ResponseStatus(HttpStatus.CREATED)
    public RepuestoResumen crearRepuesto(@AuthenticationPrincipal UsuarioAutenticado usuario,
                                         @Valid @RequestBody NuevoRepuesto datos) {
        return admin.crearRepuesto(usuario.mypeIdObligatorio(), datos);
    }

    @PutMapping("/repuestos/{id}")
    public RepuestoResumen actualizarRepuesto(@AuthenticationPrincipal UsuarioAutenticado usuario,
                                              @PathVariable Long id,
                                              @Valid @RequestBody ActualizarRepuesto datos) {
        return admin.actualizarRepuesto(usuario.mypeIdObligatorio(), id, datos);
    }

    @DeleteMapping("/repuestos/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void darDeBajaRepuesto(@AuthenticationPrincipal UsuarioAutenticado usuario,
                                  @PathVariable Long id) {
        admin.darDeBajaRepuesto(usuario.mypeIdObligatorio(), id);
    }
}
