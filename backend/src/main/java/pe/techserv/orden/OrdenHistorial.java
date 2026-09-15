package pe.techserv.orden;

import jakarta.persistence.*;
import pe.techserv.usuario.Usuario;
import java.time.OffsetDateTime;

/**
 * Una fila por cambio de estado. Es lo que convierte "el tecnico dice que llego
 * a las tres" en un dato que se puede consultar.
 */
@Entity
@Table(name = "orden_historial")
public class OrdenHistorial {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "orden_id", nullable = false)
    private OrdenServicio orden;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_anterior", length = 20)
    private EstadoOrden estadoAnterior;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_nuevo", nullable = false, length = 20)
    private EstadoOrden estadoNuevo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ActorHistorial actor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_usuario_id")
    private Usuario actorUsuario;

    @Column(length = 300)
    private String nota;

    @Column(name = "ocurrido_en", nullable = false)
    private OffsetDateTime ocurridoEn = OffsetDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public OrdenServicio getOrden() { return orden; }
    public void setOrden(OrdenServicio orden) { this.orden = orden; }
    public EstadoOrden getEstadoAnterior() { return estadoAnterior; }
    public void setEstadoAnterior(EstadoOrden estadoAnterior) { this.estadoAnterior = estadoAnterior; }
    public EstadoOrden getEstadoNuevo() { return estadoNuevo; }
    public void setEstadoNuevo(EstadoOrden estadoNuevo) { this.estadoNuevo = estadoNuevo; }
    public ActorHistorial getActor() { return actor; }
    public void setActor(ActorHistorial actor) { this.actor = actor; }
    public Usuario getActorUsuario() { return actorUsuario; }
    public void setActorUsuario(Usuario actorUsuario) { this.actorUsuario = actorUsuario; }
    public String getNota() { return nota; }
    public void setNota(String nota) { this.nota = nota; }
    public OffsetDateTime getOcurridoEn() { return ocurridoEn; }
    public void setOcurridoEn(OffsetDateTime ocurridoEn) { this.ocurridoEn = ocurridoEn; }
}
