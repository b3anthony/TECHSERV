package pe.techserv.panel.dto;

import pe.techserv.mype.HorarioDia;
import pe.techserv.pago.MetodoPago;

import java.util.List;

/** Todo lo que se ve en la página de ajustes, de una vez. */
public record AjustesTaller(Cuenta cuenta,
                            Negocio negocio,
                            TarifaResumen especialidad,
                            List<HorarioDia> horarios,
                            List<MetodoPago> metodosPago) {

    /** La persona que administra. El correo es su usuario: no se cambia aquí. */
    public record Cuenta(String nombres, String apellidos, String email, String telefono) {}

    /** El taller. Razón social y RUC son su identidad legal: se ven, no se editan. */
    public record Negocio(String razonSocial, String ruc, String descripcion,
                          String telefono, String direccion, String distrito) {}
}
