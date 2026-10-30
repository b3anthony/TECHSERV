package pe.techserv.diagnostico;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.task.TaskRejectedException;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.support.TransactionTemplate;
import pe.techserv.almacen.ServicioAlmacenamiento;
import pe.techserv.comun.PropiedadesTechServ;
import pe.techserv.comun.RecursoNoEncontrado;
import pe.techserv.diagnostico.dto.DiagnosticoIaVista;
import pe.techserv.diagnostico.dto.GuiaTecnico;
import pe.techserv.mype.Repuesto;
import pe.techserv.mype.RepuestoRepository;
import pe.techserv.orden.OrdenFoto;
import pe.techserv.orden.OrdenServicio;
import pe.techserv.orden.OrdenServicioRepository;
import pe.techserv.orden.OrigenFoto;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * El diagnostico de la IA de una orden: lanzarlo, guardarlo y ensenarselo al taller.
 *
 * Tres cosas que no se pueden romper:
 * <ul>
 *   <li><b>Multi-inquilino.</b> Desde el panel, la orden se carga SIEMPRE con
 *       {@code findByIdAndMypeId}. A la IA solo se le ensenan los repuestos del
 *       taller de la orden, y lo que devuelve se filtra otra vez contra ese
 *       inventario: un id inventado, de otro taller o inactivo se descarta.</li>
 *   <li><b>Ninguna transaccion abierta mientras se espera a Gemini.</b> Se lee
 *       en una transaccion corta, se llama fuera, y se guarda en otra.</li>
 *   <li><b>Una respuesta vieja no pisa a una nueva.</b> Cada lanzamiento lleva un
 *       intento; el resultado solo se guarda si su intento sigue vigente.</li>
 * </ul>
 */
@Service
public class ServicioDiagnosticoIa {

    private static final Logger log = LoggerFactory.getLogger(ServicioDiagnosticoIa.class);

    /** Un PENDIENTE mas viejo que esto se da por muerto (p. ej. el servidor se reinicio). */
    static final Duration PENDIENTE_CADUCA = Duration.ofMinutes(3);

    private static final int MAX_TEXTO = 600;

    /** Que hacer si ya hay un diagnostico. */
    enum Modo {
        /** Solo si no hay ninguno (o el PENDIENTE murio). Lo usa el GET del panel. */
        SI_FALTA,
        /** Rehacerlo, salvo que ya haya uno en marcha. Lo usa el boton del panel. */
        REHACER,
        /** Rehacerlo siempre: llegaron fotos nuevas y el que estuviera en marcha no las ve. */
        REEMPLAZAR
    }

    private final OrdenServicioRepository ordenes;
    private final RepuestoRepository repuestos;
    private final DiagnosticoIaRepository diagnosticos;
    private final ProveedorDiagnostico proveedor;
    private final ServicioAlmacenamiento almacen;
    private final ObjectMapper json;
    private final TransactionTemplate tx;
    private final TransactionTemplate txLectura;
    private final long maxBytesFotos;
    private final ThreadPoolTaskExecutor ejecutor;

    public ServicioDiagnosticoIa(OrdenServicioRepository ordenes,
                                 RepuestoRepository repuestos,
                                 DiagnosticoIaRepository diagnosticos,
                                 ProveedorDiagnostico proveedor,
                                 ServicioAlmacenamiento almacen,
                                 ObjectMapper json,
                                 PlatformTransactionManager transacciones,
                                 PropiedadesTechServ props) {
        this.ordenes = ordenes;
        this.repuestos = repuestos;
        this.diagnosticos = diagnosticos;
        this.proveedor = proveedor;
        this.almacen = almacen;
        this.json = json;
        this.maxBytesFotos = props.ia().maxBytesFotos();

        // REQUIRES_NEW: el disparo de las fotos llega en AFTER_COMMIT, con la
        // transaccion de la subida aun ligada al hilo. Sin esto, lo que se
        // escribiera aqui se uniria a una transaccion ya confirmada y no se
        // guardaria.
        this.tx = new TransactionTemplate(transacciones);
        this.tx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        this.txLectura = new TransactionTemplate(transacciones);
        this.txLectura.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        this.txLectura.setReadOnly(true);

        // Un ejecutor propio y pequeno: no es un Executor de Spring, asi que no
        // desplaza al applicationTaskExecutor que Boot configura.
        this.ejecutor = new ThreadPoolTaskExecutor();
        this.ejecutor.setCorePoolSize(2);
        this.ejecutor.setMaxPoolSize(2);
        this.ejecutor.setQueueCapacity(50);
        this.ejecutor.setThreadNamePrefix("diagnostico-ia-");
        this.ejecutor.initialize();
    }

    @PreDestroy
    void apagar() {
        ejecutor.shutdown();
    }

    // ── lo que pide el panel ──

    /** GET del panel. Si la orden aun no tiene diagnostico, lo lanza. */
    public DiagnosticoIaVista obtener(Long mypeId, Long ordenId) {
        comprobarOrden(mypeId, ordenId);
        if (proveedor.configurado()) {
            lanzar(ordenId, Modo.SI_FALTA);
        }
        return vista(mypeId, ordenId);
    }

    /** POST del panel: volver a analizar. */
    public DiagnosticoIaVista rehacer(Long mypeId, Long ordenId) {
        comprobarOrden(mypeId, ordenId);
        if (proveedor.configurado()) {
            lanzar(ordenId, Modo.REHACER);
        }
        return vista(mypeId, ordenId);
    }

    /** El cliente subio fotos: el diagnostico que hubiera no las vio. */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void alAdjuntarFotos(FotosAdjuntadas evento) {
        if (!proveedor.configurado()) return;
        try {
            lanzar(evento.ordenId(), Modo.REEMPLAZAR);
        } catch (RuntimeException e) {
            // Las fotos ya estan guardadas y el cliente ya tiene su respuesta: si
            // esto falla, el panel lo relanza al abrir la orden. Se registra.
            log.warn("No se pudo lanzar el diagnóstico de la orden {} tras subir fotos", evento.ordenId(), e);
        }
    }

    private void comprobarOrden(Long mypeId, Long ordenId) {
        if (ordenes.findByIdAndMypeId(ordenId, mypeId).isEmpty()) {
            throw RecursoNoEncontrado.orden(ordenId);
        }
    }

    // ── lanzar ──

    /**
     * Decide, con la fila bloqueada, si hay que lanzar uno nuevo. Si si, deja
     * la fila en PENDIENTE con un intento nuevo y lo manda al ejecutor DESPUES
     * de confirmar: el hilo de fondo tiene que ver ese intento ya guardado.
     */
    void lanzar(Long ordenId, Modo modo) {
        String intento = tx.execute(estado -> {
            diagnosticos.crearSiFalta(ordenId);
            DiagnosticoIa d = diagnosticos.bloquear(ordenId).orElseThrow();
            OffsetDateTime ahora = OffsetDateTime.now();

            boolean enMarcha = d.getEstado() == EstadoDiagnostico.PENDIENTE
                    && d.getIntento() != null
                    && d.getSolicitadoEn() != null
                    && d.getSolicitadoEn().isAfter(ahora.minus(PENDIENTE_CADUCA));
            boolean terminado = d.getEstado() == EstadoDiagnostico.LISTO
                    || d.getEstado() == EstadoDiagnostico.ERROR;

            boolean lanzar = switch (modo) {
                case SI_FALTA -> !terminado && !enMarcha;
                case REHACER -> !enMarcha;
                case REEMPLAZAR -> true;
            };
            if (!lanzar) return null;

            String nuevo = UUID.randomUUID().toString();
            d.setEstado(EstadoDiagnostico.PENDIENTE);
            d.setIntento(nuevo);
            d.setSolicitadoEn(ahora);
            d.setError(null);
            return nuevo;
        });

        if (intento != null) {
            try {
                ejecutor.execute(() -> generar(ordenId, intento));
            } catch (TaskRejectedException e) {
                // Cola llena. La fila se queda en PENDIENTE, caduca y el
                // siguiente GET del panel lo vuelve a lanzar.
                log.warn("Cola del diagnóstico llena: la orden {} se reintentará al abrirla", ordenId);
            }
        }
    }

    // ── generar (en el hilo de fondo) ──

    private record Material(ProveedorDiagnostico.Peticion peticion, int omitidas, Set<Long> idsValidos) {}

    void generar(Long ordenId, String intento) {
        String modelo = proveedor.modelo();
        Material material;
        try {
            material = txLectura.execute(estado -> reunir(ordenId, intento));
        } catch (RuntimeException e) {
            log.warn("No se pudo preparar el diagnóstico de la orden {}", ordenId, e);
            guardar(ordenId, intento, EstadoDiagnostico.ERROR, modelo, null,
                    "No se pudo preparar el diagnóstico. Vuelve a intentarlo.", 0, 0);
            return;
        }
        if (material == null) return; // otro intento lo sustituyo: no se gasta la llamada

        int analizadas = material.peticion().fotos().size();
        try {
            ProveedorDiagnostico.Diagnostico hecho = proveedor.diagnosticar(material.peticion());
            RespuestaIa limpia = limpiar(hecho.respuesta(), material.idsValidos());
            guardar(ordenId, intento, EstadoDiagnostico.LISTO, hecho.modelo(),
                    json.writeValueAsString(limpia), null, analizadas, material.omitidas());
        } catch (FalloProveedorIa e) {
            guardar(ordenId, intento, EstadoDiagnostico.ERROR, modelo, null,
                    recortar(e.getMessage(), 300), analizadas, material.omitidas());
        } catch (JsonProcessingException | RuntimeException e) {
            log.warn("Falló el diagnóstico de la orden {}", ordenId, e);
            guardar(ordenId, intento, EstadoDiagnostico.ERROR, modelo, null,
                    "No se pudo completar el diagnóstico. Vuelve a intentarlo.",
                    analizadas, material.omitidas());
        }
    }

    /** Todo lo que la IA necesita, leido de una vez. Null si el intento ya no es el vigente. */
    private Material reunir(Long ordenId, String intento) {
        DiagnosticoIa d = diagnosticos.findByOrdenId(ordenId).orElse(null);
        if (d == null || !intento.equals(d.getIntento())) return null;

        // El ordenId ya se comprobo contra el mypeId del admin (o viene de la
        // subida del propio cliente). El taller se toma de la orden, no de fuera.
        OrdenServicio orden = ordenes.findById(ordenId).orElseThrow();
        Long mypeId = orden.getMype().getId();

        List<Repuesto> inventario = repuestos.findByMypeIdAndActivoTrueOrderByNombreAsc(mypeId);
        List<ProveedorDiagnostico.RepuestoCatalogo> catalogo = inventario.stream()
                .map(r -> new ProveedorDiagnostico.RepuestoCatalogo(r.getId(), r.getNombre(), r.getDescripcion()))
                .toList();

        List<ProveedorDiagnostico.Foto> fotos = new ArrayList<>();
        int omitidas = 0;
        long bytes = 0;
        for (OrdenFoto foto : orden.getFotos()) {
            if (foto.getOrigen() != OrigenFoto.CLIENTE) continue;
            byte[] contenido = leerFoto(foto.getRuta());
            if (contenido == null || bytes + contenido.length > maxBytesFotos) {
                omitidas++;
                continue;
            }
            bytes += contenido.length;
            fotos.add(new ProveedorDiagnostico.Foto(foto.getTipoMime(), contenido));
        }

        var peticion = new ProveedorDiagnostico.Peticion(
                orden.getEspecialidad().getTitulo(), orden.getDescripcionFalla(), fotos, catalogo);
        Set<Long> ids = inventario.stream().map(Repuesto::getId).collect(Collectors.toSet());
        return new Material(peticion, omitidas, ids);
    }

    /** La ruta publica (/uploads/ORD-0143/x.jpg) a bytes del disco, sin salirse de la carpeta. */
    private byte[] leerFoto(String rutaPublica) {
        String relativa = rutaPublica.startsWith("/uploads/") ? rutaPublica.substring("/uploads/".length()) : rutaPublica;
        Path raiz = almacen.getRaiz();
        Path archivo = raiz.resolve(relativa).normalize();
        if (!archivo.startsWith(raiz)) {
            log.warn("Ruta de foto fuera de la carpeta de subidas: {}", rutaPublica);
            return null;
        }
        try {
            return Files.readAllBytes(archivo);
        } catch (IOException e) {
            log.warn("No se pudo leer la foto {} para el diagnóstico: {}", rutaPublica, e.getClass().getSimpleName());
            return null;
        }
    }

    private void guardar(Long ordenId, String intento, EstadoDiagnostico estado, String modelo,
                         String resultado, String error, int analizadas, int omitidas) {
        Integer filas = tx.execute(s -> diagnosticos.guardarSiVigente(
                ordenId, intento, estado, modelo, resultado, error, analizadas, omitidas,
                OffsetDateTime.now()));
        if (filas == null || filas == 0) {
            log.debug("Diagnóstico de la orden {} descartado: el intento {} ya no es el vigente", ordenId, intento);
        }
    }

    /**
     * Lo que dijo la IA, pasado por el filtro. Repuestos: solo ids del
     * inventario activo del taller, sin repetir. Enumerados fuera de rango se
     * normalizan. Textos recortados.
     */
    RespuestaIa limpiar(RespuestaIa r, Set<Long> idsValidos) {
        if (r == null) throw new FalloProveedorIa("Gemini no devolvió ningún diagnóstico.");

        RespuestaIa.Equipo e = r.equipo();
        String marca = e == null ? null : texto(e.marca());
        String modeloEquipo = e == null ? null : texto(e.modelo());
        String fuente = e == null ? null : e.fuente();
        if (!Set.of("FOTO", "DESCRIPCION", "NO_IDENTIFICADO").contains(fuente)
                || (marca == null && modeloEquipo == null)) {
            fuente = "NO_IDENTIFICADO";
        }
        var equipo = new RespuestaIa.Equipo(e == null ? null : texto(e.tipo()), marca, modeloEquipo, fuente);

        List<RespuestaIa.Falla> fallas = lista(r.posiblesFallas()).stream()
                .filter(f -> f != null && texto(f.falla()) != null)
                .limit(4)
                .map(f -> new RespuestaIa.Falla(
                        texto(f.falla()),
                        Set.of("ALTA", "MEDIA", "BAJA").contains(f.probabilidad()) ? f.probabilidad() : "BAJA",
                        texto(f.explicacion()),
                        texto(f.solucion())))
                .toList();

        Set<Long> vistos = new HashSet<>();
        List<RespuestaIa.RepuestoElegido> elegidos = lista(r.repuestosInventario()).stream()
                .filter(x -> x != null && x.repuestoId() != null && idsValidos.contains(x.repuestoId()))
                .filter(x -> vistos.add(x.repuestoId()))
                .limit(8)
                .map(x -> new RespuestaIa.RepuestoElegido(x.repuestoId(), texto(x.motivo())))
                .toList();

        List<RespuestaIa.OtroRepuesto> otros = lista(r.otrosRepuestos()).stream()
                .filter(x -> x != null && texto(x.nombre()) != null)
                .limit(8)
                .map(x -> new RespuestaIa.OtroRepuesto(texto(x.nombre()), texto(x.motivo())))
                .toList();

        List<String> precauciones = lista(r.precauciones()).stream()
                .map(this::texto).filter(Objects::nonNull).limit(5).toList();

        List<String> herramientas = lista(r.herramientas()).stream()
                .map(this::texto).filter(Objects::nonNull).distinct().limit(8).toList();

        return new RespuestaIa(equipo, texto(r.resumen()), fallas, elegidos, otros, precauciones, herramientas);
    }

    private static <T> List<T> lista(List<T> l) {
        return l == null ? List.of() : l;
    }

    private String texto(String s) {
        if (s == null || s.isBlank()) return null;
        return recortar(s.strip(), MAX_TEXTO);
    }

    private static String recortar(String s, int max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max - 1) + "…";
    }

    // ── lo que ve el tecnico ──

    /**
     * La guia de la visita, o null si la orden no tiene un diagnostico LISTO.
     * Solo lee: el tecnico no lanza diagnosticos. Quien llama ya resolvio el
     * token del enlace, asi que la orden y su taller son los del enlace.
     */
    public GuiaTecnico guiaParaTecnico(Long mypeId, Long ordenId) {
        DiagnosticoIa d = diagnosticos.findByOrdenId(ordenId).orElse(null);
        if (d == null || d.getEstado() != EstadoDiagnostico.LISTO) return null;

        DiagnosticoIaVista v = vista(mypeId, ordenId);
        if (v.estado() != EstadoDiagnostico.LISTO) return null;

        DiagnosticoIaVista.Equipo e = v.equipo();
        return new GuiaTecnico(
                e == null ? null : new GuiaTecnico.Equipo(e.tipo(), e.marca(), e.modelo(), e.fuente()),
                v.repuestosInventario().stream()
                        .map(r -> new GuiaTecnico.RepuestoQueLlevar(r.nombre(), r.stock() <= 0))
                        .toList(),
                v.herramientas(),
                v.otrosRepuestos().stream().map(DiagnosticoIaVista.OtroRepuesto::nombre).toList(),
                v.posiblesFallas().stream()
                        .map(f -> new GuiaTecnico.Revision(f.falla(), f.probabilidad(), f.solucion()))
                        .toList(),
                v.precauciones());
    }

    // ── la vista ──

    private DiagnosticoIaVista vista(Long mypeId, Long ordenId) {
        DiagnosticoIa d = diagnosticos.findByOrdenId(ordenId).orElse(null);

        boolean terminado = d != null && (d.getEstado() == EstadoDiagnostico.LISTO
                || d.getEstado() == EstadoDiagnostico.ERROR);
        if (!proveedor.configurado() && !terminado) {
            return DiagnosticoIaVista.soloEstado(EstadoDiagnostico.SIN_CONFIGURAR);
        }
        if (d == null) {
            return DiagnosticoIaVista.soloEstado(EstadoDiagnostico.PENDIENTE);
        }
        if (d.getEstado() == EstadoDiagnostico.PENDIENTE) {
            return DiagnosticoIaVista.soloEstado(EstadoDiagnostico.PENDIENTE);
        }
        if (d.getEstado() == EstadoDiagnostico.ERROR) {
            return new DiagnosticoIaVista(EstadoDiagnostico.ERROR, d.getModelo(), d.getGeneradoEn(),
                    d.getFotosAnalizadas(), d.getFotosOmitidas(), d.getError(),
                    null, null, null, null, null, null, null);
        }

        RespuestaIa r;
        try {
            r = json.readValue(d.getResultado(), RespuestaIa.class);
        } catch (JsonProcessingException | IllegalArgumentException e) {
            log.warn("El diagnóstico guardado de la orden {} no se puede leer", ordenId, e);
            return new DiagnosticoIaVista(EstadoDiagnostico.ERROR, d.getModelo(), d.getGeneradoEn(),
                    d.getFotosAnalizadas(), d.getFotosOmitidas(),
                    "El diagnóstico guardado está dañado. Vuelve a analizar.",
                    null, null, null, null, null, null, null);
        }

        // Nombre, precio y stock: del inventario de HOY de este taller. Un
        // repuesto desactivado desde entonces ya no se sugiere.
        Map<Long, Repuesto> inventario = repuestos.findByMypeIdAndActivoTrueOrderByNombreAsc(mypeId).stream()
                .collect(Collectors.toMap(Repuesto::getId, Function.identity()));
        List<DiagnosticoIaVista.RepuestoSugerido> sugeridos = lista(r.repuestosInventario()).stream()
                .filter(x -> inventario.containsKey(x.repuestoId()))
                .map(x -> {
                    Repuesto rep = inventario.get(x.repuestoId());
                    return new DiagnosticoIaVista.RepuestoSugerido(
                            rep.getId(), rep.getNombre(), rep.getPrecio(), rep.getStock(), x.motivo());
                })
                .toList();

        RespuestaIa.Equipo e = r.equipo();
        return new DiagnosticoIaVista(
                EstadoDiagnostico.LISTO, d.getModelo(), d.getGeneradoEn(),
                d.getFotosAnalizadas(), d.getFotosOmitidas(), null,
                e == null ? null : new DiagnosticoIaVista.Equipo(e.tipo(), e.marca(), e.modelo(), e.fuente()),
                r.resumen(),
                lista(r.posiblesFallas()).stream()
                        .map(f -> new DiagnosticoIaVista.Falla(f.falla(), f.probabilidad(), f.explicacion(), f.solucion()))
                        .toList(),
                sugeridos,
                lista(r.otrosRepuestos()).stream()
                        .map(o -> new DiagnosticoIaVista.OtroRepuesto(o.nombre(), o.motivo()))
                        .toList(),
                lista(r.precauciones()),
                lista(r.herramientas()));
    }
}
