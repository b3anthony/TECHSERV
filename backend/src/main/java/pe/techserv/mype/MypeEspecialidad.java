package pe.techserv.mype;

import jakarta.persistence.*;
import pe.techserv.comun.Especialidad;
import java.math.BigDecimal;

/** Que atiende un taller y cuanto cobra por la visita. */
@Entity
@Table(name = "mype_especialidad")
public class MypeEspecialidad {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "mype_id", nullable = false)
    private Mype mype;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private Especialidad especialidad;

    @Column(name = "tarifa_base", nullable = false, precision = 10, scale = 2)
    private BigDecimal tarifaBase;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Mype getMype() { return mype; }
    public void setMype(Mype mype) { this.mype = mype; }
    public Especialidad getEspecialidad() { return especialidad; }
    public void setEspecialidad(Especialidad especialidad) { this.especialidad = especialidad; }
    public BigDecimal getTarifaBase() { return tarifaBase; }
    public void setTarifaBase(BigDecimal tarifaBase) { this.tarifaBase = tarifaBase; }
}
