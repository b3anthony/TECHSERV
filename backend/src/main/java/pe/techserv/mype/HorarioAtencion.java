package pe.techserv.mype;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import java.time.DayOfWeek;
import java.time.LocalTime;

/**
 * Un dia de atencion del taller: de {@code abre} a {@code cierra}. Un dia sin
 * tramo es un dia cerrado.
 *
 * El dia va como numero ISO (1 = lunes ... 7 = domingo), el mismo que
 * {@link DayOfWeek#getValue()}: asi la consulta a mano en psql y el codigo
 * hablan igual.
 */
@Embeddable
public class HorarioAtencion {

    @Column(name = "dia_semana", nullable = false)
    private int diaSemana;

    @Column(nullable = false)
    private LocalTime abre;

    @Column(nullable = false)
    private LocalTime cierra;

    protected HorarioAtencion() {}

    public HorarioAtencion(int diaSemana, LocalTime abre, LocalTime cierra) {
        this.diaSemana = diaSemana;
        this.abre = abre;
        this.cierra = cierra;
    }

    /** Una visita cabe si EMPIEZA dentro del tramo: de abre incluido a cierra excluido. */
    public boolean admite(LocalTime hora) {
        return !hora.isBefore(abre) && hora.isBefore(cierra);
    }

    public int getDiaSemana() { return diaSemana; }
    public LocalTime getAbre() { return abre; }
    public LocalTime getCierra() { return cierra; }
}
