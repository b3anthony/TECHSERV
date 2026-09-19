package pe.techserv.panel.dto;

import pe.techserv.comun.Especialidad;
import pe.techserv.mype.Tecnico;

import java.util.Set;

public record DetalleTecnico(
        Long id,
        String nombres,
        String apellidos,
        String email,
        String telefono,
        boolean disponible,
        Set<Especialidad> especialidades
) {
    public static DetalleTecnico de(Tecnico t) {
        return new DetalleTecnico(
                t.getId(),
                t.getUsuario().getNombres(),
                t.getUsuario().getApellidos(),
                t.getUsuario().getEmail(),
                t.getUsuario().getTelefono(),
                t.isDisponible(),
                t.getEspecialidades()
        );
    }
}
