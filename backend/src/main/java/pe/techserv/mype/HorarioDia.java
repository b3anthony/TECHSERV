package pe.techserv.mype;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import pe.techserv.catalogo.ServicioCatalogo;
import pe.techserv.comun.SolicitudInvalida;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.time.format.TextStyle;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Un dia del horario tal como llega del formulario: el registro del negocio y
 * los ajustes del panel usan el mismo, y la misma validacion.
 */
public record HorarioDia(
        @NotNull(message = "Falta el día")
        @Min(value = 1, message = "El día va de 1 (lunes) a 7 (domingo)")
        @Max(value = 7, message = "El día va de 1 (lunes) a 7 (domingo)")
        Integer dia,

        @NotNull(message = "Falta la hora de apertura")
        @JsonFormat(pattern = "HH:mm")
        LocalTime abre,

        @NotNull(message = "Falta la hora de cierre")
        @JsonFormat(pattern = "HH:mm")
        LocalTime cierra) {

    private static final Locale ES = Locale.forLanguageTag("es-PE");

    public static HorarioDia de(HorarioAtencion h) {
        return new HorarioDia(h.getDiaSemana(), h.getAbre(), h.getCierra());
    }

    /**
     * Comprueba el horario entero y lo convierte en tramos. Falla si viene
     * vacio, si repite un dia, si algun dia cierra antes de abrir, o si no deja
     * ni una franja de visita: un taller asi aparece en el catalogo y nadie
     * puede reservarle nunca.
     */
    public static List<HorarioAtencion> validar(List<HorarioDia> dias) {
        if (dias == null || dias.isEmpty()) {
            throw new SolicitudInvalida("Marca al menos un día de atención");
        }
        Set<Integer> vistos = new HashSet<>();
        for (HorarioDia d : dias) {
            String nombre = DayOfWeek.of(d.dia()).getDisplayName(TextStyle.FULL, ES);
            if (!vistos.add(d.dia())) {
                throw new SolicitudInvalida("El " + nombre + " aparece dos veces en el horario");
            }
            if (!d.abre().isBefore(d.cierra())) {
                throw new SolicitudInvalida("El " + nombre + " la hora de cierre tiene que ser posterior a la de apertura");
            }
        }

        List<HorarioAtencion> tramos = dias.stream()
                .sorted(java.util.Comparator.comparing(HorarioDia::dia))
                .map(d -> new HorarioAtencion(d.dia(), d.abre(), d.cierra()))
                .toList();

        boolean algunaFranja = tramos.stream()
                .anyMatch(t -> ServicioCatalogo.FRANJAS.stream().anyMatch(t::admite));
        if (!algunaFranja) {
            throw new SolicitudInvalida("Con ese horario no cabe ninguna visita. "
                    + "Las visitas empiezan entre las 8:00 y las 11:00, o entre las 14:00 y las 16:00");
        }
        return tramos;
    }
}
