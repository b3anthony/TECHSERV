package pe.techserv.visita;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import org.hibernate.Hibernate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import pe.techserv.almacen.ServicioAlmacenamiento;
import pe.techserv.comun.ConflictoEstado;
import pe.techserv.comun.SolicitudInvalida;
import pe.techserv.mype.MypeEspecialidad;
import pe.techserv.mype.MypeEspecialidadRepository;
import pe.techserv.mype.RepuestoRepository;
import pe.techserv.mype.Tecnico;
import pe.techserv.orden.ActorHistorial;
import pe.techserv.orden.EstadoOrden;
import pe.techserv.orden.OrdenFoto;
import pe.techserv.orden.OrdenFotoRepository;
import pe.techserv.orden.OrdenHistorial;
import pe.techserv.orden.OrdenHistorialRepository;
import pe.techserv.orden.OrdenServicio;
import pe.techserv.orden.OrdenServicioRepository;
import pe.techserv.orden.OrigenFoto;
import pe.techserv.orden.dto.OrdenDetalle;
import pe.techserv.orden.dto.PasoHistorial;
import pe.techserv.pago.PagoRepository;
import pe.techserv.panel.ServicioCierre;
import pe.techserv.panel.dto.CierreOrden;
import pe.techserv.panel.dto.DetallePago;
import pe.techserv.panel.dto.RegistroPago;
import pe.techserv.visita.dto.AccionVisita;
import pe.techserv.visita.dto.VistaVisita;

import java.util.List;

/**
 * Lo que el tecnico puede hacer desde su pagina, y nada mas.
 *
 * Cada metodo empieza resolviendo el token. De ahi salen la orden, el taller y
 * el tecnico: nunca de la URL ni del cuerpo. Por eso el token de una orden no
 * sirve para tocar otra, ni la de otro taller.
 *
 * Cerrar y cobrar reutilizan ServicioCierre: las reglas de dinero y de stock
 * viven en un solo sitio, lo haga el taller o el tecnico.
 */
@Service
public class ServicioVisita {

    /** Fotos del trabajo por orden. Las del cliente tienen su propio tope. */
    static final int MAXIMO_FOTOS_TRABAJO = 6;

    private final ServicioEnlaces enlaces;
    private final OrdenServicioRepository ordenes;
    private final OrdenHistorialRepository historial;
    private final OrdenFotoRepository fotos;
    private final PagoRepository pagos;
    private final RepuestoRepository repuestos;
    private final MypeEspecialidadRepository tarifas;
    private final ServicioCierre cierre;
    private final ServicioAlmacenamiento almacen;
    private final EntityManager em;

    public ServicioVisita(ServicioEnlaces enlaces,
                          OrdenServicioRepository ordenes,
                          OrdenHistorialRepository historial,
                          OrdenFotoRepository fotos,
                          PagoRepository pagos,
                          RepuestoRepository repuestos,
                          MypeEspecialidadRepository tarifas,
                          ServicioCierre cierre,
                          ServicioAlmacenamiento almacen,
                          EntityManager em) {
        this.enlaces = enlaces;
        this.ordenes = ordenes;
        this.historial = historial;
        this.fotos = fotos;
        this.pagos = pagos;
        this.repuestos = repuestos;
        this.tarifas = tarifas;
        this.cierre = cierre;
        this.almacen = almacen;
        this.em = em;
    }

    @Transactional(readOnly = true)
    public VistaVisita ver(String token) {
        EnlaceTecnico enlace = enlaces.vigente(token);
        return vista(enlace.getOrden(), enlace.getTecnico());
    }

    @Transactional
    public VistaVisita avanzar(String token, AccionVisita accion) {
        EnlaceTecnico enlace = enlaces.vigente(token);
        Tecnico tecnico = enlace.getTecnico();
        OrdenServicio orden = bloquear(enlace);

        if (orden.getEstado() == accion.getHasta()) {
            // Doble toque, o dos pestanas abiertas: el paso ya esta dado. No es
            // un error para quien lo pide, pero tampoco se anota dos veces.
            return vista(orden, tecnico);
        }
        if (orden.getEstado() != accion.getDesde()) {
            throw new ConflictoEstado("La orden está " + orden.getEstado().getEtiqueta().toLowerCase()
                    + ": ese paso ya no se puede marcar");
        }

        if (accion == AccionVisita.LLEGUE) {
            cierre.pasarAEnProceso(orden.getMype().getId(), orden.getId(), ActorHistorial.TECNICO,
                    nombre(tecnico) + " " + accion.getFrase());
        } else {
            EstadoOrden anterior = orden.getEstado();
            orden.setEstado(accion.getHasta());
            ordenes.save(orden);
            anotar(orden, anterior, accion.getHasta(), nombre(tecnico) + " " + accion.getFrase());
        }
        return vista(orden, tecnico);
    }

    /**
     * El técnico no puede ir. La orden vuelve a PENDIENTE y sin técnico, y el
     * taller la ve otra vez en su bandeja para asignarla a otro. El cliente no
     * recibe nada: su reserva sigue en pie y el paso no aparece en su
     * seguimiento (ver {@link OrdenHistorial#esRechazoDelTecnico()}).
     *
     * Solo antes de confirmar: una vez confirmada, el taller ya cuenta con él y
     * el cambio se habla por teléfono.
     */
    @Transactional
    public void rechazar(String token, String motivo) {
        EnlaceTecnico enlace = enlaces.vigente(token);
        Tecnico tecnico = enlace.getTecnico();
        OrdenServicio orden = bloquear(enlace);

        if (orden.getEstado() != EstadoOrden.ASIGNADA) {
            throw new ConflictoEstado("La orden está " + orden.getEstado().getEtiqueta().toLowerCase()
                    + ": ya no se puede rechazar desde aquí. Llama al taller");
        }

        String porque = (motivo == null || motivo.isBlank()) ? "" : ": " + motivo.trim();
        orden.setTecnico(null);
        orden.setEstado(EstadoOrden.PENDIENTE);
        ordenes.save(orden);
        anotar(orden, EstadoOrden.ASIGNADA, EstadoOrden.PENDIENTE,
                nombre(tecnico) + " no puede ir" + porque);
    }

    @Transactional
    public VistaVisita terminar(String token, CierreOrden peticion) {
        EnlaceTecnico enlace = enlaces.vigente(token);
        OrdenServicio orden = bloquear(enlace);
        cierre.cerrar(orden.getMype().getId(), orden.getId(), peticion, ActorHistorial.TECNICO,
                nombre(enlace.getTecnico()) + " terminó el trabajo");
        return vista(orden, enlace.getTecnico());
    }

    @Transactional
    public VistaVisita cobrar(String token, RegistroPago peticion) {
        EnlaceTecnico enlace = enlaces.vigente(token);
        OrdenServicio orden = bloquear(enlace);
        cierre.registrarPago(orden.getMype().getId(), orden.getId(), peticion, enlace.getTecnico());
        return vista(orden, enlace.getTecnico());
    }

    @Transactional
    public VistaVisita subirFotos(String token, List<MultipartFile> archivos) {
        EnlaceTecnico enlace = enlaces.vigente(token);
        OrdenServicio orden = bloquear(enlace);

        boolean trabajando = orden.getEstado() == EstadoOrden.EN_PROCESO
                || orden.getEstado() == EstadoOrden.COMPLETADA
                || orden.getEstado() == EstadoOrden.CALIFICADA;
        if (!trabajando) {
            throw new ConflictoEstado("Las fotos del trabajo se suben cuando ya empezaste");
        }
        if (archivos == null || archivos.isEmpty()) {
            throw new SolicitudInvalida("Elige al menos una foto");
        }
        long yaSubidas = orden.getFotos().stream().filter(f -> f.getOrigen() == OrigenFoto.TECNICO).count();
        if (yaSubidas + archivos.size() > MAXIMO_FOTOS_TRABAJO) {
            throw new SolicitudInvalida("Puedes subir hasta " + MAXIMO_FOTOS_TRABAJO + " fotos del trabajo");
        }

        for (MultipartFile archivo : archivos) {
            String ruta = almacen.guardar(orden.getCodigo(), archivo);
            OrdenFoto foto = new OrdenFoto();
            foto.setOrden(orden);
            foto.setNombreArchivo(ruta.substring(ruta.lastIndexOf('/') + 1));
            foto.setRuta(ruta);
            foto.setTipoMime(archivo.getContentType());
            foto.setTamanoBytes(archivo.getSize());
            foto.setOrigen(OrigenFoto.TECNICO);
            fotos.save(foto);
            orden.getFotos().add(foto);
        }
        return vista(orden, enlace.getTecnico());
    }

    /**
     * La orden con la fila bloqueada y RELEIDA, comprobando de nuevo que sigue
     * siendo de este tecnico.
     *
     * No vale un SELECT ... FOR UPDATE a secas: resolver el token ya cargo la
     * orden en esta sesion, y Hibernate devolveria esa copia sin pisarla con lo
     * que hay en la base. Si otra peticion la cambio entre medias, se
     * comprobaria el estado viejo. refresh con bloqueo espera su turno y lee
     * la fila de verdad.
     */
    private OrdenServicio bloquear(EnlaceTecnico enlace) {
        OrdenServicio orden = (OrdenServicio) Hibernate.unproxy(enlace.getOrden());
        em.refresh(orden, LockModeType.PESSIMISTIC_WRITE);
        if (orden.getTecnico() == null || !orden.getTecnico().getId().equals(enlace.getTecnico().getId())) {
            throw ServicioEnlaces.noValido();
        }
        return orden;
    }

    private VistaVisita vista(OrdenServicio o, Tecnico tecnico) {
        Long mypeId = o.getMype().getId();
        boolean porCerrar = o.getEstado() == EstadoOrden.EN_PROCESO;
        DetallePago pago = pagos.findByOrdenId(o.getId()).map(DetallePago::de).orElse(null);

        return new VistaVisita(
                o.getCodigo(), o.getEstado(), o.getEstado().getEtiqueta(),
                o.getEspecialidad(), o.getEspecialidad().getTitulo(),
                o.getDescripcionFalla(),
                o.getCliente().getUsuario().getNombreCompleto(),
                o.getCliente().getUsuario().getTelefono(),
                o.getDireccion(), o.getReferencia(), o.getDistrito(), o.urlMapa(),
                o.getFechaProgramada(), o.getHoraProgramada(),
                o.getMype().getRazonSocial(), o.getMype().getTelefono(),
                tecnico.getUsuario().getNombres(),
                OrdenDetalle.rutas(o, OrigenFoto.CLIENTE),
                OrdenDetalle.rutas(o, OrigenFoto.TECNICO),
                MAXIMO_FOTOS_TRABAJO,
                o.getDiagnostico(), o.getPrecioManoObra(), o.getTotal(),
                o.getRepuestos().stream()
                        .map(r -> new VistaVisita.RepuestoCobrado(r.getRepuesto().getNombre(), r.getCantidad(),
                                r.getPrecioUnitario(), r.subtotal()))
                        .toList(),
                pago,
                tarifas.findByMypeIdAndEspecialidad(mypeId, o.getEspecialidad())
                        .map(MypeEspecialidad::getTarifaBase).orElse(null),
                porCerrar
                        ? repuestos.findByMypeIdAndActivoTrueOrderByNombreAsc(mypeId).stream()
                                .map(VistaVisita.RepuestoDisponible::de).toList()
                        : List.of(),
                o.getMype().getMetodosPago().stream().sorted().toList(),
                o.getMetodoPago(),
                o.getHistorial().stream().map(PasoHistorial::de).toList());
    }

    private static String nombre(Tecnico t) {
        return t.getUsuario().getNombreCompleto();
    }

    private void anotar(OrdenServicio orden, EstadoOrden desde, EstadoOrden hasta, String nota) {
        OrdenHistorial paso = new OrdenHistorial();
        paso.setOrden(orden);
        paso.setEstadoAnterior(desde);
        paso.setEstadoNuevo(hasta);
        paso.setActor(ActorHistorial.TECNICO);
        paso.setNota(nota);
        historial.save(paso);
        orden.getHistorial().add(paso);
    }
}
