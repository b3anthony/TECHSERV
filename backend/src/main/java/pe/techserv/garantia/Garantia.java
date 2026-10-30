package pe.techserv.garantia;

import jakarta.persistence.*;
import pe.techserv.mype.Mype;
import pe.techserv.orden.OrdenServicio;

import java.time.OffsetDateTime;

/** El plazo emitido para una reparación; no se recalcula al cambiar los ajustes. */
@Entity
@Table(name = "garantia")
public class Garantia {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "orden_id", nullable = false, unique = true)
    private OrdenServicio orden;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "mype_id", nullable = false)
    private Mype mype;

    @Column(nullable = false)
    private int dias;
    @Column(name = "inicia_en", nullable = false)
    private OffsetDateTime iniciaEn;
    @Column(name = "vence_en", nullable = false)
    private OffsetDateTime venceEn;
    @Column(name = "creada_en", nullable = false)
    private OffsetDateTime creadaEn = OffsetDateTime.now();

    public Long getId() { return id; }
    public OrdenServicio getOrden() { return orden; }
    public void setOrden(OrdenServicio orden) { this.orden = orden; }
    public Mype getMype() { return mype; }
    public void setMype(Mype mype) { this.mype = mype; }
    public int getDias() { return dias; }
    public void setDias(int dias) { this.dias = dias; }
    public OffsetDateTime getIniciaEn() { return iniciaEn; }
    public void setIniciaEn(OffsetDateTime iniciaEn) { this.iniciaEn = iniciaEn; }
    public OffsetDateTime getVenceEn() { return venceEn; }
    public void setVenceEn(OffsetDateTime venceEn) { this.venceEn = venceEn; }
    public OffsetDateTime getCreadaEn() { return creadaEn; }
}
