package pe.techserv.orden;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

/**
 * La nota que pone el cliente al cerrar. De aqui sale el promedio del taller:
 * no hay ninguna columna "calificacion" en mype que alguien pueda tocar a mano.
 */
@Entity
@Table(name = "calificacion")
public class Calificacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "orden_id", nullable = false, unique = true)
    private OrdenServicio orden;

    /** De 1 a 5. El rango lo garantiza tambien un CHECK en la base. */
    @Column(nullable = false)
    private int puntaje;

    @Column(length = 500)
    private String comentario;

    @Column(name = "creada_en", nullable = false)
    private OffsetDateTime creadaEn = OffsetDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public OrdenServicio getOrden() { return orden; }
    public void setOrden(OrdenServicio orden) { this.orden = orden; }
    public int getPuntaje() { return puntaje; }
    public void setPuntaje(int puntaje) { this.puntaje = puntaje; }
    public String getComentario() { return comentario; }
    public void setComentario(String comentario) { this.comentario = comentario; }
    public OffsetDateTime getCreadaEn() { return creadaEn; }
    public void setCreadaEn(OffsetDateTime creadaEn) { this.creadaEn = creadaEn; }
}
