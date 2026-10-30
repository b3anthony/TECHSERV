package pe.techserv.reserva;

import org.springframework.stereotype.Component;
import pe.techserv.catalogo.ServicioCatalogo;
import pe.techserv.comun.ConflictoEstado;
import pe.techserv.comun.SolicitudInvalida;
import pe.techserv.mype.Mype;

import java.time.LocalDate;
import java.time.LocalTime;

/** La misma agenda para reservar una visita o pedir atención por garantía. */
@Component
public class ValidadorAgenda {
    private final ServicioCatalogo catalogo;

    public ValidadorAgenda(ServicioCatalogo catalogo) {
        this.catalogo = catalogo;
    }

    public void validar(Mype taller, LocalDate fecha, LocalTime hora) {
        if (!ServicioCatalogo.FRANJAS.contains(hora)) {
            throw new SolicitudInvalida("Esa hora no es una franja de atención");
        }
        if (!taller.atiende(fecha.getDayOfWeek(), hora)) {
            throw new SolicitudInvalida("El taller no atiende ese día a esa hora");
        }
        // Se comprueba al escribir: la agenda que vio el cliente puede haber cambiado.
        if (!catalogo.hayCupo(taller.getId(), fecha, hora)) {
            throw new ConflictoEstado("Esa hora acaba de ocuparse. Elige otra franja, por favor.");
        }
    }
}
