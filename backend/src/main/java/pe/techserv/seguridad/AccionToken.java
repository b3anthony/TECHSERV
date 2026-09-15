package pe.techserv.seguridad;

import jakarta.persistence.*;
import pe.techserv.mype.Tecnico;
import pe.techserv.orden.OrdenServicio;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * El registro de un boton firmado del correo del tecnico.
 *
 * El JWT lleva la firma y la caducidad; esta tabla aporta lo que un JWT no puede
 * dar por si solo: que el enlace se pueda usar UNA sola vez. Al pulsarlo se
 * marca {@code usadoEn}, y reenviar el correo viejo ya no reabre la accion.
 */
@Entity
@Table(name = "accion_token")
public class AccionToken {

    /** El mismo identificador que viaja como claim "jti" dentro del JWT. */
    @Id
    private UUID jti;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "orden_id", nullable = false)
    private OrdenServicio orden;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tecnico_id", nullable = false)
    private Tecnico tecnico;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AccionTecnico accion;

    @Column(name = "expira_en", nullable = false)
    private OffsetDateTime expiraEn;

    @Column(name = "usado_en")
    private OffsetDateTime usadoEn;

    @Column(name = "creado_en", nullable = false)
    private OffsetDateTime creadoEn = OffsetDateTime.now();

    public boolean estaUsado() {
        return usadoEn != null;
    }

    public boolean estaVencido() {
        return expiraEn.isBefore(OffsetDateTime.now());
    }

    public UUID getJti() { return jti; }
    public void setJti(UUID jti) { this.jti = jti; }
    public OrdenServicio getOrden() { return orden; }
    public void setOrden(OrdenServicio orden) { this.orden = orden; }
    public Tecnico getTecnico() { return tecnico; }
    public void setTecnico(Tecnico tecnico) { this.tecnico = tecnico; }
    public AccionTecnico getAccion() { return accion; }
    public void setAccion(AccionTecnico accion) { this.accion = accion; }
    public OffsetDateTime getExpiraEn() { return expiraEn; }
    public void setExpiraEn(OffsetDateTime expiraEn) { this.expiraEn = expiraEn; }
    public OffsetDateTime getUsadoEn() { return usadoEn; }
    public void setUsadoEn(OffsetDateTime usadoEn) { this.usadoEn = usadoEn; }
    public OffsetDateTime getCreadoEn() { return creadoEn; }
    public void setCreadoEn(OffsetDateTime creadoEn) { this.creadoEn = creadoEn; }
}
