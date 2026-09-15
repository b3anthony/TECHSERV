package pe.techserv.mype;

import jakarta.persistence.*;
import pe.techserv.comun.Especialidad;
import pe.techserv.usuario.Usuario;
import java.time.OffsetDateTime;
import java.util.LinkedHashSet;
import java.util.Set;

/**
 * Quien va al domicilio. No inicia sesion en la plataforma: trabaja desde el
 * correo con enlaces firmados, que es el flujo de la seccion 5 del plan.
 */
@Entity
@Table(name = "tecnico")
public class Tecnico {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false, unique = true)
    private Usuario usuario;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "mype_id", nullable = false)
    private Mype mype;

    @Column(nullable = false)
    private boolean disponible = true;

    @Column(name = "creado_en", nullable = false)
    private OffsetDateTime creadoEn = OffsetDateTime.now();

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "tecnico_especialidad",
                     joinColumns = @JoinColumn(name = "tecnico_id"))
    @Column(name = "especialidad", length = 40)
    @Enumerated(EnumType.STRING)
    private Set<Especialidad> especialidades = new LinkedHashSet<>();

    public boolean atiende(Especialidad especialidad) {
        return especialidades.contains(especialidad);
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Usuario getUsuario() { return usuario; }
    public void setUsuario(Usuario usuario) { this.usuario = usuario; }
    public Mype getMype() { return mype; }
    public void setMype(Mype mype) { this.mype = mype; }
    public boolean isDisponible() { return disponible; }
    public void setDisponible(boolean disponible) { this.disponible = disponible; }
    public OffsetDateTime getCreadoEn() { return creadoEn; }
    public void setCreadoEn(OffsetDateTime creadoEn) { this.creadoEn = creadoEn; }
    public Set<Especialidad> getEspecialidades() { return especialidades; }
}
