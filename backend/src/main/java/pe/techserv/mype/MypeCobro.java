package pe.techserv.mype;

import jakarta.persistence.*;

import java.time.OffsetDateTime;

/** Los datos para recibir pagos de un único taller. La clave es también su FK. */
@Entity
@Table(name = "mype_cobro")
public class MypeCobro {

    @Id
    @Column(name = "mype_id")
    private Long mypeId;

    @MapsId
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "mype_id", nullable = false)
    private Mype mype;

    @Column(name = "yape_numero", length = 9)
    private String yapeNumero;

    @Column(name = "yape_qr", length = 300)
    private String yapeQr;

    @Column(name = "plin_numero", length = 9)
    private String plinNumero;

    @Column(name = "plin_qr", length = 300)
    private String plinQr;

    @Column(length = 60)
    private String banco;

    @Column(length = 120)
    private String titular;

    @Column(name = "numero_cuenta", length = 30)
    private String numeroCuenta;

    @Column(length = 20)
    private String cci;

    @Column(name = "actualizado_en", nullable = false)
    private OffsetDateTime actualizadoEn = OffsetDateTime.now();

    protected MypeCobro() {}

    public MypeCobro(Mype mype) {
        this.mype = mype;
    }

    @PrePersist
    @PreUpdate
    private void actualizarFecha() {
        actualizadoEn = OffsetDateTime.now();
    }

    public Long getMypeId() { return mypeId; }
    public String getYapeNumero() { return yapeNumero; }
    public void setYapeNumero(String yapeNumero) { this.yapeNumero = yapeNumero; }
    public String getYapeQr() { return yapeQr; }
    public void setYapeQr(String yapeQr) { this.yapeQr = yapeQr; }
    public String getPlinNumero() { return plinNumero; }
    public void setPlinNumero(String plinNumero) { this.plinNumero = plinNumero; }
    public String getPlinQr() { return plinQr; }
    public void setPlinQr(String plinQr) { this.plinQr = plinQr; }
    public String getBanco() { return banco; }
    public void setBanco(String banco) { this.banco = banco; }
    public String getTitular() { return titular; }
    public void setTitular(String titular) { this.titular = titular; }
    public String getNumeroCuenta() { return numeroCuenta; }
    public void setNumeroCuenta(String numeroCuenta) { this.numeroCuenta = numeroCuenta; }
    public String getCci() { return cci; }
    public void setCci(String cci) { this.cci = cci; }
}
