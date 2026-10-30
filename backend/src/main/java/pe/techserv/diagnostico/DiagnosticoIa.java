package pe.techserv.diagnostico;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

/** El diagnostico de la IA de una orden. Una fila por orden. */
@Entity
@Table(name = "orden_diagnostico_ia")
public class DiagnosticoIa {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "orden_id", nullable = false, unique = true)
    private Long ordenId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoDiagnostico estado;

    @Column(length = 36)
    private String intento;

    @Column(length = 80)
    private String modelo;

    @Column(columnDefinition = "TEXT")
    private String resultado;

    @Column(length = 300)
    private String error;

    @Column(name = "fotos_analizadas", nullable = false)
    private int fotosAnalizadas;

    @Column(name = "fotos_omitidas", nullable = false)
    private int fotosOmitidas;

    @Column(name = "solicitado_en")
    private OffsetDateTime solicitadoEn;

    @Column(name = "generado_en")
    private OffsetDateTime generadoEn;

    public Long getId() { return id; }
    public Long getOrdenId() { return ordenId; }
    public void setOrdenId(Long ordenId) { this.ordenId = ordenId; }
    public EstadoDiagnostico getEstado() { return estado; }
    public void setEstado(EstadoDiagnostico estado) { this.estado = estado; }
    public String getIntento() { return intento; }
    public void setIntento(String intento) { this.intento = intento; }
    public String getModelo() { return modelo; }
    public void setModelo(String modelo) { this.modelo = modelo; }
    public String getResultado() { return resultado; }
    public void setResultado(String resultado) { this.resultado = resultado; }
    public String getError() { return error; }
    public void setError(String error) { this.error = error; }
    public int getFotosAnalizadas() { return fotosAnalizadas; }
    public void setFotosAnalizadas(int fotosAnalizadas) { this.fotosAnalizadas = fotosAnalizadas; }
    public int getFotosOmitidas() { return fotosOmitidas; }
    public void setFotosOmitidas(int fotosOmitidas) { this.fotosOmitidas = fotosOmitidas; }
    public OffsetDateTime getSolicitadoEn() { return solicitadoEn; }
    public void setSolicitadoEn(OffsetDateTime solicitadoEn) { this.solicitadoEn = solicitadoEn; }
    public OffsetDateTime getGeneradoEn() { return generadoEn; }
    public void setGeneradoEn(OffsetDateTime generadoEn) { this.generadoEn = generadoEn; }
}
