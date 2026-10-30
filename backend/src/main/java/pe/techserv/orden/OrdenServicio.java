package pe.techserv.orden;

import jakarta.persistence.*;
import pe.techserv.comun.Especialidad;
import pe.techserv.mype.Mype;
import pe.techserv.mype.Tecnico;
import pe.techserv.pago.MetodoPago;
import pe.techserv.usuario.Cliente;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * La orden de servicio: lo que el cliente pidio, quien lo atiende y en que punto
 * va. La direccion y la especialidad se copian aqui al crearla en vez de leerse
 * del cliente: si manana el cliente se muda, la orden de hace un ano sigue
 * diciendo a donde fue el tecnico.
 */
@Entity
@Table(name = "orden_servicio")
public class OrdenServicio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Legible para el cliente y el taller: ORD-0142. */
    @Column(nullable = false, length = 16, unique = true)
    private String codigo;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cliente_id", nullable = false)
    private Cliente cliente;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "mype_id", nullable = false)
    private Mype mype;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tecnico_id")
    private Tecnico tecnico;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private Especialidad especialidad;

    @Column(name = "descripcion_falla", nullable = false, columnDefinition = "text")
    private String descripcionFalla;

    @Column(nullable = false, length = 200)
    private String direccion;

    @Column(length = 200)
    private String referencia;

    @Column(nullable = false, length = 60)
    private String distrito;

    @Column(precision = 10, scale = 7)
    private BigDecimal latitud;

    @Column(precision = 10, scale = 7)
    private BigDecimal longitud;

    @Column(name = "fecha_programada", nullable = false)
    private LocalDate fechaProgramada;

    @Column(name = "hora_programada", nullable = false)
    private LocalTime horaProgramada;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoOrden estado = EstadoOrden.PENDIENTE;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoOrden tipo = TipoOrden.NORMAL;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "garantia_de_id")
    private OrdenServicio garantiaDe;

    /** Cómo dijo el cliente que pagaría. NULL en las órdenes de antes de poder elegirlo. */
    @Enumerated(EnumType.STRING)
    @Column(name = "metodo_pago", length = 20)
    private MetodoPago metodoPago;

    @Column(columnDefinition = "text")
    private String diagnostico;

    @Column(name = "precio_mano_obra", precision = 10, scale = 2)
    private BigDecimal precioManoObra;

    @Column(precision = 10, scale = 2)
    private BigDecimal total;

    @Column(name = "creada_en", nullable = false)
    private OffsetDateTime creadaEn = OffsetDateTime.now();

    @Column(name = "actualizada_en", nullable = false)
    private OffsetDateTime actualizadaEn = OffsetDateTime.now();

    @OneToMany(mappedBy = "orden", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrdenFoto> fotos = new ArrayList<>();

    @OneToMany(mappedBy = "orden", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("ocurridoEn ASC")
    private List<OrdenHistorial> historial = new ArrayList<>();

    @OneToMany(mappedBy = "orden", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrdenRepuesto> repuestos = new ArrayList<>();

    /** Enlace al mapa. Sin clave de API: es la URL publica de busqueda. */
    public String urlMapa() {
        if (latitud != null && longitud != null) {
            return "https://www.google.com/maps/search/?api=1&query=" + latitud + "," + longitud;
        }
        return "https://www.google.com/maps/search/?api=1&query="
                + java.net.URLEncoder.encode(direccion + ", " + distrito + ", Perú",
                                             java.nio.charset.StandardCharsets.UTF_8);
    }

    @PreUpdate
    void alActualizar() {
        this.actualizadaEn = OffsetDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getCodigo() { return codigo; }
    public void setCodigo(String codigo) { this.codigo = codigo; }
    public Cliente getCliente() { return cliente; }
    public void setCliente(Cliente cliente) { this.cliente = cliente; }
    public Mype getMype() { return mype; }
    public void setMype(Mype mype) { this.mype = mype; }
    public Tecnico getTecnico() { return tecnico; }
    public void setTecnico(Tecnico tecnico) { this.tecnico = tecnico; }
    public Especialidad getEspecialidad() { return especialidad; }
    public void setEspecialidad(Especialidad especialidad) { this.especialidad = especialidad; }
    public String getDescripcionFalla() { return descripcionFalla; }
    public void setDescripcionFalla(String descripcionFalla) { this.descripcionFalla = descripcionFalla; }
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
    public LocalDate getFechaProgramada() { return fechaProgramada; }
    public void setFechaProgramada(LocalDate fechaProgramada) { this.fechaProgramada = fechaProgramada; }
    public LocalTime getHoraProgramada() { return horaProgramada; }
    public void setHoraProgramada(LocalTime horaProgramada) { this.horaProgramada = horaProgramada; }
    public EstadoOrden getEstado() { return estado; }
    public void setEstado(EstadoOrden estado) { this.estado = estado; }
    public TipoOrden getTipo() { return tipo; }
    public void setTipo(TipoOrden tipo) { this.tipo = tipo; }
    public OrdenServicio getGarantiaDe() { return garantiaDe; }
    public void setGarantiaDe(OrdenServicio garantiaDe) { this.garantiaDe = garantiaDe; }
    public MetodoPago getMetodoPago() { return metodoPago; }
    public void setMetodoPago(MetodoPago metodoPago) { this.metodoPago = metodoPago; }
    public String getDiagnostico() { return diagnostico; }
    public void setDiagnostico(String diagnostico) { this.diagnostico = diagnostico; }
    public BigDecimal getPrecioManoObra() { return precioManoObra; }
    public void setPrecioManoObra(BigDecimal precioManoObra) { this.precioManoObra = precioManoObra; }
    public BigDecimal getTotal() { return total; }
    public void setTotal(BigDecimal total) { this.total = total; }
    public OffsetDateTime getCreadaEn() { return creadaEn; }
    public void setCreadaEn(OffsetDateTime creadaEn) { this.creadaEn = creadaEn; }
    public OffsetDateTime getActualizadaEn() { return actualizadaEn; }
    public void setActualizadaEn(OffsetDateTime actualizadaEn) { this.actualizadaEn = actualizadaEn; }
    public List<OrdenFoto> getFotos() { return fotos; }
    public List<OrdenHistorial> getHistorial() { return historial; }
    public List<OrdenRepuesto> getRepuestos() { return repuestos; }
}
