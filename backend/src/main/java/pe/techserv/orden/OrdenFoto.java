package pe.techserv.orden;

import jakarta.persistence.*;
import java.time.OffsetDateTime;

/** Una foto de la averia. Lo que evita que el tecnico llegue sin la pieza. */
@Entity
@Table(name = "orden_foto")
public class OrdenFoto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "orden_id", nullable = false)
    private OrdenServicio orden;

    @Column(name = "nombre_archivo", nullable = false, length = 160)
    private String nombreArchivo;

    /** Ruta publica servida por el backend, no la ruta del disco. */
    @Column(nullable = false, length = 300)
    private String ruta;

    @Column(name = "tipo_mime", nullable = false, length = 60)
    private String tipoMime;

    @Column(name = "tamano_bytes", nullable = false)
    private long tamanoBytes;

    @Column(name = "subida_en", nullable = false)
    private OffsetDateTime subidaEn = OffsetDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public OrdenServicio getOrden() { return orden; }
    public void setOrden(OrdenServicio orden) { this.orden = orden; }
    public String getNombreArchivo() { return nombreArchivo; }
    public void setNombreArchivo(String nombreArchivo) { this.nombreArchivo = nombreArchivo; }
    public String getRuta() { return ruta; }
    public void setRuta(String ruta) { this.ruta = ruta; }
    public String getTipoMime() { return tipoMime; }
    public void setTipoMime(String tipoMime) { this.tipoMime = tipoMime; }
    public long getTamanoBytes() { return tamanoBytes; }
    public void setTamanoBytes(long tamanoBytes) { this.tamanoBytes = tamanoBytes; }
    public OffsetDateTime getSubidaEn() { return subidaEn; }
    public void setSubidaEn(OffsetDateTime subidaEn) { this.subidaEn = subidaEn; }
}
