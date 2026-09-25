package pe.techserv.reserva;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import pe.techserv.almacen.ServicioAlmacenamiento;
import pe.techserv.catalogo.ServicioCatalogo;
import pe.techserv.comun.ConflictoEstado;
import pe.techserv.comun.RecursoNoEncontrado;
import pe.techserv.comun.SolicitudInvalida;
import pe.techserv.mype.Mype;
import pe.techserv.mype.MypeEspecialidadRepository;
import pe.techserv.mype.MypeRepository;
import pe.techserv.orden.*;
import pe.techserv.orden.dto.OrdenDetalle;
import pe.techserv.orden.dto.OrdenResumen;
import pe.techserv.reserva.dto.DetalleCalificacion;
import pe.techserv.reserva.dto.NuevaCalificacion;
import pe.techserv.reserva.dto.NuevaReserva;
import pe.techserv.reserva.dto.Seguimiento;
import pe.techserv.usuario.Cliente;
import pe.techserv.usuario.ClienteRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/** Crear una orden y consultarla desde el lado del cliente. */
@Service
public class ServicioReserva {

    private final OrdenServicioRepository ordenes;
    private final OrdenFotoRepository fotos;
    private final OrdenHistorialRepository historial;
    private final CalificacionRepository calificaciones;
    private final ClienteRepository clientes;
    private final MypeRepository mypes;
    private final MypeEspecialidadRepository especialidades;
    private final ServicioCatalogo catalogo;
    private final ServicioAlmacenamiento almacen;

    public ServicioReserva(OrdenServicioRepository ordenes, OrdenFotoRepository fotos,
                           OrdenHistorialRepository historial, CalificacionRepository calificaciones,
                           ClienteRepository clientes, MypeRepository mypes,
                           MypeEspecialidadRepository especialidades,
                           ServicioCatalogo catalogo, ServicioAlmacenamiento almacen) {
        this.ordenes = ordenes;
        this.fotos = fotos;
        this.historial = historial;
        this.calificaciones = calificaciones;
        this.clientes = clientes;
        this.mypes = mypes;
        this.especialidades = especialidades;
        this.catalogo = catalogo;
        this.almacen = almacen;
    }

    @Transactional
    public OrdenDetalle reservar(Long clienteId, NuevaReserva datos) {
        Cliente cliente = clientes.findById(clienteId)
                .orElseThrow(() -> new RecursoNoEncontrado("No se encontró tu perfil de cliente"));

        Mype taller = mypes.findById(datos.mypeId())
                .filter(Mype::isActivo)
                .orElseThrow(() -> new RecursoNoEncontrado("No se encontró el taller"));

        // Que el taller atienda esa especialidad no es una obviedad: el cliente
        // manda el mypeId y la especialidad por separado, y podrían no cuadrar.
        especialidades.findByMypeIdAndEspecialidad(taller.getId(), datos.especialidad())
                .orElseThrow(() -> new SolicitudInvalida(
                        "Ese taller no atiende " + datos.especialidad().getTitulo()));

        if (!taller.getMetodosPago().contains(datos.metodoPago())) {
            throw new SolicitudInvalida("Ese taller no acepta pagos con "
                    + datos.metodoPago().getEtiqueta());
        }

        if (!ServicioCatalogo.FRANJAS.contains(datos.hora())) {
            throw new SolicitudInvalida("Esa hora no es una franja de atención");
        }

        if (!taller.atiende(datos.fecha().getDayOfWeek(), datos.hora())) {
            throw new SolicitudInvalida("El taller no atiende ese día a esa hora");
        }

        // El cupo se vuelve a comprobar AQUI, no solo al pintar la agenda: entre
        // que el cliente vio las horas libres y pulsó "Confirmar" pudo entrar
        // otra reserva.
        if (!catalogo.hayCupo(taller.getId(), datos.fecha(), datos.hora())) {
            throw new ConflictoEstado(
                    "Esa hora acaba de ocuparse. Elige otra franja, por favor.");
        }

        OrdenServicio orden = new OrdenServicio();
        orden.setCodigo(siguienteCodigo());
        orden.setCliente(cliente);
        orden.setMype(taller);
        orden.setEspecialidad(datos.especialidad());
        orden.setDescripcionFalla(datos.descripcionFalla().trim());
        orden.setDireccion(datos.direccion().trim());
        orden.setReferencia(vacioANulo(datos.referencia()));
        orden.setDistrito(datos.distrito().trim());
        // La ubicación del cliente se copia para poder abrir el mapa; si mañana
        // se muda, esta orden sigue apuntando a donde fue el técnico.
        orden.setLatitud(cliente.getLatitud());
        orden.setLongitud(cliente.getLongitud());
        orden.setFechaProgramada(datos.fecha());
        orden.setHoraProgramada(datos.hora());
        orden.setMetodoPago(datos.metodoPago());
        orden.setEstado(EstadoOrden.PENDIENTE);
        ordenes.save(orden);

        anotar(orden, null, EstadoOrden.PENDIENTE, ActorHistorial.CLIENTE,
               "El cliente registró la solicitud");

        return OrdenDetalle.paraCliente(orden);
    }

    @Transactional
    public OrdenDetalle adjuntarFotos(Long clienteId, Long ordenId, List<MultipartFile> archivos) {
        OrdenServicio orden = ordenes.findByIdAndClienteId(ordenId, clienteId)
                .orElseThrow(() -> RecursoNoEncontrado.orden(ordenId));

        if (orden.getEstado() != EstadoOrden.PENDIENTE) {
            throw new ConflictoEstado(
                    "Solo se pueden añadir fotos mientras la orden sigue pendiente");
        }
        if (archivos.size() + orden.getFotos().size() > ServicioAlmacenamiento.MAXIMO_FOTOS) {
            throw new SolicitudInvalida("Puedes adjuntar hasta "
                    + ServicioAlmacenamiento.MAXIMO_FOTOS + " fotos");
        }

        for (MultipartFile archivo : archivos) {
            String ruta = almacen.guardar(orden.getCodigo(), archivo);

            OrdenFoto foto = new OrdenFoto();
            foto.setOrden(orden);
            foto.setNombreArchivo(ruta.substring(ruta.lastIndexOf('/') + 1));
            foto.setRuta(ruta);
            foto.setTipoMime(archivo.getContentType());
            foto.setTamanoBytes(archivo.getSize());
            fotos.save(foto);
            orden.getFotos().add(foto);
        }

        return OrdenDetalle.paraCliente(orden);
    }

    @Transactional(readOnly = true)
    public List<OrdenResumen> misOrdenes(Long clienteId) {
        return ordenes.findByClienteIdOrderByCreadaEnDesc(clienteId).stream()
                .map(OrdenResumen::de)
                .toList();
    }

    @Transactional(readOnly = true)
    public OrdenDetalle miOrden(Long clienteId, Long ordenId) {
        return ordenes.findByIdAndClienteId(ordenId, clienteId)
                .map(OrdenDetalle::paraCliente)
                .orElseThrow(() -> RecursoNoEncontrado.orden(ordenId));
    }

    @Transactional
    public void cancelar(Long clienteId, Long ordenId, String motivo) {
        OrdenServicio orden = ordenes.findByIdAndClienteId(ordenId, clienteId)
                .orElseThrow(() -> RecursoNoEncontrado.orden(ordenId));

        if (!orden.getEstado().permite(EstadoOrden.CANCELADA)) {
            throw new ConflictoEstado("Una orden " + orden.getEstado().getEtiqueta().toLowerCase()
                    + " ya no se puede cancelar");
        }

        EstadoOrden anterior = orden.getEstado();
        orden.setEstado(EstadoOrden.CANCELADA);
        ordenes.save(orden);

        anotar(orden, anterior, EstadoOrden.CANCELADA, ActorHistorial.CLIENTE,
               vacioANulo(motivo) == null ? "El cliente canceló la solicitud"
                                          : "El cliente canceló: " + motivo.trim());
    }

    /** Las franjas que ofrece un taller ese día, para pintar la agenda. */
    @Transactional(readOnly = true)
    public ServicioCatalogo.AgendaDia agenda(Long mypeId, LocalDate fecha) {
        return catalogo.agenda(mypeId, fecha);
    }

    @Transactional(readOnly = true)
    public Seguimiento seguimiento(Long clienteId, Long ordenId) {
        OrdenServicio orden = ordenes.findByIdAndClienteId(ordenId, clienteId)
                .orElseThrow(() -> RecursoNoEncontrado.orden(ordenId));

        boolean tieneCalificacion = calificaciones.existsByOrdenId(orden.getId());
        return Seguimiento.de(orden, tieneCalificacion);
    }

    @Transactional
    public Seguimiento calificar(Long clienteId, Long ordenId, NuevaCalificacion datos) {
        OrdenServicio orden = ordenes.findByIdAndClienteId(ordenId, clienteId)
                .orElseThrow(() -> RecursoNoEncontrado.orden(ordenId));

        if (calificaciones.existsByOrdenId(orden.getId())) {
            throw new ConflictoEstado("Ya calificaste este servicio");
        }

        if (orden.getEstado() != EstadoOrden.COMPLETADA) {
            throw new ConflictoEstado("Solo se puede calificar un servicio completado");
        }

        if (!orden.getEstado().permite(EstadoOrden.CALIFICADA)) {
            throw new ConflictoEstado("Una orden " + orden.getEstado().getEtiqueta().toLowerCase()
                    + " ya no se puede calificar");
        }

        Calificacion calificacion = new Calificacion();
        calificacion.setOrden(orden);
        calificacion.setPuntaje(datos.puntaje());
        calificacion.setComentario(vacioANulo(datos.comentario()));
        calificaciones.save(calificacion);

        EstadoOrden anterior = orden.getEstado();
        orden.setEstado(EstadoOrden.CALIFICADA);
        ordenes.save(orden);

        anotar(orden, anterior, EstadoOrden.CALIFICADA, ActorHistorial.CLIENTE,
               "El cliente calificó el servicio con " + datos.puntaje() + " de 5");

        return Seguimiento.de(orden, true);
    }

    @Transactional(readOnly = true)
    public Optional<DetalleCalificacion> consultarCalificacion(Long clienteId, Long ordenId) {
        OrdenServicio orden = ordenes.findByIdAndClienteId(ordenId, clienteId)
                .orElseThrow(() -> RecursoNoEncontrado.orden(ordenId));

        return calificaciones.findByOrdenId(orden.getId())
                .map(DetalleCalificacion::de);
    }

    private String siguienteCodigo() {
        return "ORD-%04d".formatted(ordenes.siguienteCorrelativo());
    }

    private void anotar(OrdenServicio orden, EstadoOrden desde, EstadoOrden hasta,
                        ActorHistorial actor, String nota) {
        OrdenHistorial paso = new OrdenHistorial();
        paso.setOrden(orden);
        paso.setEstadoAnterior(desde);
        paso.setEstadoNuevo(hasta);
        paso.setActor(actor);
        paso.setNota(nota);
        historial.save(paso);
        orden.getHistorial().add(paso);
    }

    private static String vacioANulo(String texto) {
        return (texto == null || texto.isBlank()) ? null : texto.trim();
    }
}
