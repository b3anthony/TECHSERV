package pe.techserv.panel.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import pe.techserv.mype.HorarioDia;

import java.util.List;

public record ActualizarHorario(
        @NotEmpty(message = "Marca al menos un día de atención")
        @Valid List<HorarioDia> horarios
) {}
