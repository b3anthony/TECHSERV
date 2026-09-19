package pe.techserv.panel;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.techserv.comun.ConflictoEstado;
import pe.techserv.comun.Especialidad;
import pe.techserv.comun.RecursoNoEncontrado;
import pe.techserv.comun.SolicitudInvalida;
import pe.techserv.mype.*;
import pe.techserv.orden.EstadoOrden;
import pe.techserv.orden.OrdenServicioRepository;
import pe.techserv.panel.dto.*;
import pe.techserv.usuario.Rol;
import pe.techserv.usuario.Usuario;
import pe.techserv.usuario.UsuarioRepository;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Lógica de administración para el panel del taller: técnicos, tarifas y repuestos.
 *
 * Todos los métodos reciben {@code mypeId} como primer parámetro para garantizar
 * el aislamiento multi-inquilino.
 */
@Service
public class ServicioAdministracion {

    private final UsuarioRepository usuarios;
    private final TecnicoRepository tecnicos;
    private final MypeRepository mypes;
    private final MypeEspecialidadRepository especialidades;
    private final OrdenServicioRepository ordenes;
    private final RepuestoRepository repuestos;
    private final PasswordEncoder claves;

    public ServicioAdministracion(UsuarioRepository usuarios,
                                  TecnicoRepository tecnicos,
                                  MypeRepository mypes,
                                  MypeEspecialidadRepository especialidades,
                                  OrdenServicioRepository ordenes,
                                  RepuestoRepository repuestos,
                                  PasswordEncoder claves) {
        this.usuarios = usuarios;
        this.tecnicos = tecnicos;
        this.mypes = mypes;
        this.especialidades = especialidades;
        this.ordenes = ordenes;
        this.repuestos = repuestos;
        this.claves = claves;
    }

    // ───────────────────────────── Técnicos ─────────────────────────────

    @Transactional
    public DetalleTecnico crearTecnico(Long mypeId, NuevoTecnico datos) {
        if (usuarios.existsByEmailIgnoreCase(datos.email().trim())) {
            throw new SolicitudInvalida("Ya hay una cuenta con ese correo");
        }

        Mype taller = mypes.findById(mypeId)
                .orElseThrow(() -> new RecursoNoEncontrado("No se encontró el taller"));

        validarEspecialidadesPermitidas(mypeId, datos.especialidades());

        Usuario usuario = new Usuario();
        usuario.setNombres(datos.nombres().trim());
        usuario.setApellidos(datos.apellidos().trim());
        usuario.setEmail(datos.email().trim().toLowerCase());
        usuario.setClaveHash(claves.encode(UUID.randomUUID().toString()));
        usuario.setTelefono(vacioANulo(datos.telefono()));
        usuario.setRol(Rol.TECNICO);
        usuario.setActivo(true);
        usuarios.save(usuario);

        Tecnico tecnico = new Tecnico();
        tecnico.setUsuario(usuario);
        tecnico.setMype(taller);
        tecnico.setDisponible(true);
        tecnico.getEspecialidades().addAll(datos.especialidades());
        tecnicos.save(tecnico);

        return DetalleTecnico.de(tecnico);
    }

    @Transactional
    public DetalleTecnico actualizarTecnico(Long mypeId, Long id, ActualizarTecnico datos) {
        Tecnico tecnico = tecnicos.findByIdAndMypeId(id, mypeId)
                .orElseThrow(() -> new RecursoNoEncontrado("No se encontró el técnico"));

        validarEspecialidadesPermitidas(mypeId, datos.especialidades());

        Usuario usuario = tecnico.getUsuario();
        usuario.setNombres(datos.nombres().trim());
        usuario.setApellidos(datos.apellidos().trim());
        usuario.setTelefono(vacioANulo(datos.telefono()));

        tecnico.setDisponible(datos.disponible());
        tecnico.getEspecialidades().clear();
        tecnico.getEspecialidades().addAll(datos.especialidades());

        return DetalleTecnico.de(tecnico);
    }

    @Transactional
    public void darDeBajaTecnico(Long mypeId, Long id) {
        Tecnico tecnico = tecnicos.findByIdAndMypeId(id, mypeId)
                .orElseThrow(() -> new RecursoNoEncontrado("No se encontró el técnico"));

        List<EstadoOrden> abiertas = ordenesAbiertas();
        if (ordenes.existsByMypeIdAndTecnicoIdAndEstadoIn(mypeId, id, abiertas)) {
            throw new ConflictoEstado("Reasigna sus órdenes abiertas antes de darlo de baja");
        }

        tecnico.setDisponible(false);
        tecnico.getUsuario().setActivo(false);
    }

    // ───────────────────────────── Tarifas ─────────────────────────────

    @Transactional(readOnly = true)
    public List<TarifaResumen> listarTarifas(Long mypeId) {
        return especialidades.findByMypeId(mypeId).stream()
                .sorted(Comparator.comparing(me -> me.getEspecialidad().name()))
                .map(TarifaResumen::de)
                .toList();
    }

    @Transactional
    public TarifaResumen fijarTarifa(Long mypeId, Especialidad especialidad, BigDecimal tarifaBase) {
        validarRangoTarifa(tarifaBase);

        Mype taller = mypes.findById(mypeId)
                .orElseThrow(() -> new RecursoNoEncontrado("No se encontró el taller"));

        MypeEspecialidad me = especialidades.findByMypeIdAndEspecialidad(mypeId, especialidad)
                .orElseGet(() -> {
                    MypeEspecialidad nueva = new MypeEspecialidad();
                    nueva.setMype(taller);
                    nueva.setEspecialidad(especialidad);
                    return nueva;
                });

        me.setTarifaBase(tarifaBase);
        especialidades.save(me);

        return TarifaResumen.de(me);
    }

    @Transactional
    public void eliminarTarifa(Long mypeId, Especialidad especialidad) {
        MypeEspecialidad me = especialidades.findByMypeIdAndEspecialidad(mypeId, especialidad)
                .orElseThrow(() -> new RecursoNoEncontrado("Tu taller no atiende esa especialidad"));

        List<MypeEspecialidad> todas = especialidades.findByMypeId(mypeId);
        if (todas.size() <= 1) {
            throw new ConflictoEstado("Tu taller tiene que atender al menos una especialidad");
        }

        List<EstadoOrden> abiertas = ordenesAbiertas();
        if (ordenes.existsByMypeIdAndEspecialidadAndEstadoIn(mypeId, especialidad, abiertas)) {
            throw new ConflictoEstado("Hay órdenes en curso de esa especialidad");
        }

        especialidades.delete(me);
    }

    // ───────────────────────────── Repuestos ─────────────────────────────

    @Transactional(readOnly = true)
    public List<RepuestoResumen> listarRepuestos(Long mypeId) {
        return repuestos.findByMypeIdAndActivoTrueOrderByNombreAsc(mypeId).stream()
                .map(RepuestoResumen::de)
                .toList();
    }

    @Transactional
    public RepuestoResumen crearRepuesto(Long mypeId, NuevoRepuesto datos) {
        Mype taller = mypes.findById(mypeId)
                .orElseThrow(() -> new RecursoNoEncontrado("No se encontró el taller"));

        Repuesto repuesto = new Repuesto();
        repuesto.setMype(taller);
        repuesto.setNombre(datos.nombre().trim());
        repuesto.setDescripcion(vacioANulo(datos.descripcion()));
        repuesto.setPrecio(datos.precio());
        repuesto.setStock(datos.stock());
        repuesto.setActivo(true);
        repuestos.save(repuesto);

        return RepuestoResumen.de(repuesto);
    }

    @Transactional
    public RepuestoResumen actualizarRepuesto(Long mypeId, Long id, ActualizarRepuesto datos) {
        Repuesto repuesto = repuestos.findByIdAndMypeId(id, mypeId)
                .orElseThrow(() -> new RecursoNoEncontrado("No se encontró el repuesto"));

        repuesto.setNombre(datos.nombre().trim());
        repuesto.setDescripcion(vacioANulo(datos.descripcion()));
        repuesto.setPrecio(datos.precio());
        repuesto.setStock(datos.stock());

        return RepuestoResumen.de(repuesto);
    }

    @Transactional
    public void darDeBajaRepuesto(Long mypeId, Long id) {
        Repuesto repuesto = repuestos.findByIdAndMypeId(id, mypeId)
                .orElseThrow(() -> new RecursoNoEncontrado("No se encontró el repuesto"));

        repuesto.setActivo(false);
    }

    // ───────────────────────────── Auxiliares ─────────────────────────────

    private void validarEspecialidadesPermitidas(Long mypeId, List<Especialidad> solicitadas) {
        Set<Especialidad> atendidas = especialidades.findByMypeId(mypeId).stream()
                .map(MypeEspecialidad::getEspecialidad)
                .collect(Collectors.toSet());

        for (Especialidad esp : solicitadas) {
            if (!atendidas.contains(esp)) {
                throw new SolicitudInvalida("Tu taller no atiende " + esp.getTitulo());
            }
        }
    }

    private void validarRangoTarifa(BigDecimal tarifaBase) {
        if (tarifaBase == null
                || tarifaBase.compareTo(BigDecimal.ZERO) <= 0
                || tarifaBase.compareTo(new BigDecimal("9999.99")) > 0
                || tarifaBase.scale() > 2) {
            throw new SolicitudInvalida("La tarifa base debe ser mayor que 0 y como máximo 9999.99 con hasta 2 decimales");
        }
    }

    private List<EstadoOrden> ordenesAbiertas() {
        return Arrays.stream(EstadoOrden.values())
                .filter(e -> !e.estaCerrada())
                .toList();
    }

    private static String vacioANulo(String texto) {
        return (texto == null || texto.isBlank()) ? null : texto.trim();
    }
}
