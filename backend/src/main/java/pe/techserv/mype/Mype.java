package pe.techserv.mype;

import jakarta.persistence.*;
import pe.techserv.pago.MetodoPago;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

/**
 * El taller. Es la unidad de aislamiento del multi-inquilino: toda tabla de
 * negocio apunta aqui, y ninguna consulta de un administrador sale de su mype.
 */
@Entity
@Table(name = "mype")
public class Mype {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "razon_social", nullable = false, length = 160)
    private String razonSocial;

    @Column(nullable = false, length = 11, unique = true)
    private String ruc;

    @Column(columnDefinition = "text")
    private String descripcion;

    @Column(length = 20)
    private String telefono;

    @Column(nullable = false, length = 200)
    private String direccion;

    @Column(nullable = false, length = 60)
    private String distrito;

    @Column(precision = 10, scale = 7)
    private BigDecimal latitud;

    @Column(precision = 10, scale = 7)
    private BigDecimal longitud;

    @Column(nullable = false)
    private boolean activo = true;

    @Column(name = "garantia_dias", nullable = false)
    private int garantiaDias = 30;

    @Column(name = "creado_en", nullable = false)
    private OffsetDateTime creadoEn = OffsetDateTime.now();

    @OneToMany(mappedBy = "mype", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<MypeEspecialidad> especialidades = new ArrayList<>();

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "mype_horario", joinColumns = @JoinColumn(name = "mype_id"))
    @OrderBy("diaSemana ASC")
    private List<HorarioAtencion> horarios = new ArrayList<>();

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "mype_metodo_pago", joinColumns = @JoinColumn(name = "mype_id"))
    @Column(name = "metodo", length = 20)
    @Enumerated(EnumType.STRING)
    private Set<MetodoPago> metodosPago = new LinkedHashSet<>();

    /** El tramo de ese dia, o vacio si ese dia el taller no atiende. */
    public Optional<HorarioAtencion> horarioDe(DayOfWeek dia) {
        return horarios.stream().filter(h -> h.getDiaSemana() == dia.getValue()).findFirst();
    }

    /** Si una visita puede empezar a esa hora ese dia. */
    public boolean atiende(DayOfWeek dia, LocalTime hora) {
        return horarioDe(dia).map(h -> h.admite(hora)).orElse(false);
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getRazonSocial() { return razonSocial; }
    public void setRazonSocial(String razonSocial) { this.razonSocial = razonSocial; }
    public String getRuc() { return ruc; }
    public void setRuc(String ruc) { this.ruc = ruc; }
    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }
    public String getTelefono() { return telefono; }
    public void setTelefono(String telefono) { this.telefono = telefono; }
    public String getDireccion() { return direccion; }
    public void setDireccion(String direccion) { this.direccion = direccion; }
    public String getDistrito() { return distrito; }
    public void setDistrito(String distrito) { this.distrito = distrito; }
    public BigDecimal getLatitud() { return latitud; }
    public void setLatitud(BigDecimal latitud) { this.latitud = latitud; }
    public BigDecimal getLongitud() { return longitud; }
    public void setLongitud(BigDecimal longitud) { this.longitud = longitud; }
    public boolean isActivo() { return activo; }
    public void setActivo(boolean activo) { this.activo = activo; }
    public int getGarantiaDias() { return garantiaDias; }
    public void setGarantiaDias(int garantiaDias) { this.garantiaDias = garantiaDias; }
    public OffsetDateTime getCreadoEn() { return creadoEn; }
    public void setCreadoEn(OffsetDateTime creadoEn) { this.creadoEn = creadoEn; }
    public List<MypeEspecialidad> getEspecialidades() { return especialidades; }
    public List<HorarioAtencion> getHorarios() { return horarios; }
    public Set<MetodoPago> getMetodosPago() { return metodosPago; }
}
