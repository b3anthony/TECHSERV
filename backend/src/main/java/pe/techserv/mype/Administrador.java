package pe.techserv.mype;

import jakarta.persistence.*;
import pe.techserv.usuario.Usuario;

/** Ata un usuario con rol ADMIN_MYPE a su taller. */
@Entity
@Table(name = "administrador")
public class Administrador {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false, unique = true)
    private Usuario usuario;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "mype_id", nullable = false)
    private Mype mype;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Usuario getUsuario() { return usuario; }
    public void setUsuario(Usuario usuario) { this.usuario = usuario; }
    public Mype getMype() { return mype; }
    public void setMype(Mype mype) { this.mype = mype; }
}
