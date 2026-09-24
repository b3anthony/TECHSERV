package pe.techserv.visita;

import jakarta.persistence.*;
import pe.techserv.mype.Tecnico;
import pe.techserv.orden.OrdenServicio;

import java.time.OffsetDateTime;

/**
 * El enlace personal del tecnico a una orden: su pagina de trabajo.
 *
 * A diferencia de los botones de un solo uso del correo antiguo, este enlace se
 * usa muchas veces (confirmar, salir, empezar, cerrar, cobrar, subir fotos). Su
 * seguridad no es "usarse una vez" sino que es largo, aleatorio, caduca, y deja
 * de valer si la orden cambia de tecnico o si el tecnico se da de baja.
 *
 * Solo se guarda el SHA-256 del token, nunca el token.
 */
@Entity
@Table(name = "enlace_tecnico")
public class EnlaceTecnico {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "hash_token", nullable = false, unique = true, length = 64)
    private String hashToken;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "orden_id", nullable = false)
    private OrdenServicio orden;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tecnico_id", nullable = false)
    private Tecnico tecnico;

    @Column(name = "expira_en", nullable = false)
    private OffsetDateTime expiraEn;

    @Column(name = "creado_en", nullable = false)
    private OffsetDateTime creadoEn = OffsetDateTime.now();

    public boolean estaVencido() {
        return expiraEn.isBefore(OffsetDateTime.now());
    }

    public Long getId() { return id; }
    public String getHashToken() { return hashToken; }
    public void setHashToken(String hashToken) { this.hashToken = hashToken; }
    public OrdenServicio getOrden() { return orden; }
    public void setOrden(OrdenServicio orden) { this.orden = orden; }
    public Tecnico getTecnico() { return tecnico; }
    public void setTecnico(Tecnico tecnico) { this.tecnico = tecnico; }
    public OffsetDateTime getExpiraEn() { return expiraEn; }
    public void setExpiraEn(OffsetDateTime expiraEn) { this.expiraEn = expiraEn; }
    public OffsetDateTime getCreadoEn() { return creadoEn; }
}
