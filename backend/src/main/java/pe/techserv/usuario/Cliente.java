package pe.techserv.usuario;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

/** Los datos de contacto y direccion por defecto de quien pide el servicio. */
@Entity
@Table(name = "cliente")
public class Cliente {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false, unique = true)
    private Usuario usuario;

    @Column(length = 200)
    private String direccion;

    @Column(length = 200)
    private String referencia;

    @Column(length = 60)
    private String distrito;

    @Column(precision = 10, scale = 7)
    private BigDecimal latitud;

    @Column(precision = 10, scale = 7)
    private BigDecimal longitud;

    /** Cuándo desactivó su cuenta. NULL si está activa, o si ya se eliminó. */
    @Column(name = "desactivada_en")
    private OffsetDateTime desactivadaEn;

    /** Cuándo se borraron sus datos personales, pasado el plazo sin reactivarla. */
    @Column(name = "eliminada_en")
    private OffsetDateTime eliminadaEn;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Usuario getUsuario() { return usuario; }
    public void setUsuario(Usuario usuario) { this.usuario = usuario; }
    public String getDireccion() { return direccion; }
    public void setDireccion(String direccion) { this.direccion = direccion; }
    public String getReferencia() { return referencia; }
    public void setReferencia(String referencia) { this.referencia = referencia; }
    public String getDistrito() { return distrito; }
    public void setDistrito(String distrito) { this.distrito = distrito; }
    public BigDecimal getLatitud() { return latitud; }
    public void setLatitud(BigDecimal latitud) { this.latitud = latitud; }
    public BigDecimal getLongitud() { return longitud; }
    public void setLongitud(BigDecimal longitud) { this.longitud = longitud; }
    public OffsetDateTime getDesactivadaEn() { return desactivadaEn; }
    public void setDesactivadaEn(OffsetDateTime desactivadaEn) { this.desactivadaEn = desactivadaEn; }
    public OffsetDateTime getEliminadaEn() { return eliminadaEn; }
    public void setEliminadaEn(OffsetDateTime eliminadaEn) { this.eliminadaEn = eliminadaEn; }
}
