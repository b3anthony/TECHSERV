package pe.techserv.cliente;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.techserv.cliente.dto.ActualizarCuentaCliente;
import pe.techserv.cliente.dto.CuentaCliente;
import pe.techserv.cliente.dto.CuentaDesactivada;
import pe.techserv.cliente.dto.DesactivarCuenta;
import pe.techserv.comun.ConflictoEstado;
import pe.techserv.comun.RecursoNoEncontrado;
import pe.techserv.comun.SolicitudInvalida;
import pe.techserv.orden.*;
import pe.techserv.panel.dto.CambioClave;
import pe.techserv.seguridad.UsuarioAutenticado;
import pe.techserv.usuario.Cliente;
import pe.techserv.usuario.ClienteRepository;
import pe.techserv.usuario.Usuario;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * La cuenta del cliente: sus datos, su contraseña, y desactivarla.
 *
 * Desactivar no borra nada en el acto. La cuenta queda cerrada y, si el
 * cliente vuelve a entrar antes de {@link #DIAS_PARA_REACTIVAR} días, se
 * reactiva sola. Pasado ese plazo, {@link #eliminarVencidas} borra sus datos
 * personales. Las órdenes se quedan porque son también el historial del
 * taller, pero ya no dicen quién las pidió.
 */
@Service
public class ServicioCuentaCliente {

    public static final int DIAS_PARA_REACTIVAR = 30;

    private static final Logger log = LoggerFactory.getLogger(ServicioCuentaCliente.class);

    /** Con el técnico en la puerta, o de camino, no se puede desaparecer. */
    private static final Set<EstadoOrden> EN_CURSO = EnumSet.of(EstadoOrden.EN_CAMINO, EstadoOrden.EN_PROCESO);

    private final ClienteRepository clientes;
    private final OrdenServicioRepository ordenes;
    private final OrdenHistorialRepository historial;
    private final PasswordEncoder claves;

    public ServicioCuentaCliente(ClienteRepository clientes, OrdenServicioRepository ordenes,
                                 OrdenHistorialRepository historial, PasswordEncoder claves) {
        this.clientes = clientes;
        this.ordenes = ordenes;
        this.historial = historial;
        this.claves = claves;
    }

    @Transactional(readOnly = true)
    public CuentaCliente ver(UsuarioAutenticado quien) {
        return CuentaCliente.de(cliente(quien));
    }

    @Transactional
    public CuentaCliente actualizar(UsuarioAutenticado quien, ActualizarCuentaCliente datos) {
        Cliente c = cliente(quien);
        Usuario u = c.getUsuario();
        u.setNombres(datos.nombres().trim());
        u.setApellidos(datos.apellidos().trim());
        u.setTelefono(vacioANulo(datos.telefono()));
        c.setDireccion(vacioANulo(datos.direccion()));
        c.setReferencia(vacioANulo(datos.referencia()));
        c.setDistrito(vacioANulo(datos.distrito()));
        return CuentaCliente.de(c);
    }

    @Transactional
    public void cambiarClave(UsuarioAutenticado quien, CambioClave datos) {
        Usuario u = cliente(quien).getUsuario();
        if (!claves.matches(datos.claveActual(), u.getClaveHash())) {
            throw new SolicitudInvalida("La contraseña actual no es correcta");
        }
        if (datos.claveActual().equals(datos.claveNueva())) {
            throw new SolicitudInvalida("La contraseña nueva tiene que ser distinta de la actual");
        }
        u.setClaveHash(claves.encode(datos.claveNueva()));
    }

    /**
     * Cierra la cuenta. Las visitas que aún no empezaron se cancelan (el taller
     * deja de guardar ese hueco); si hay una en camino o en proceso, no se
     * cierra nada hasta que termine.
     */
    @Transactional
    public CuentaDesactivada desactivar(UsuarioAutenticado quien, DesactivarCuenta datos) {
        Cliente c = cliente(quien);
        Usuario u = c.getUsuario();
        if (!claves.matches(datos.clave(), u.getClaveHash())) {
            throw new SolicitudInvalida("La contraseña no es correcta");
        }

        List<EstadoOrden> abiertas = EnumSet.allOf(EstadoOrden.class).stream()
                .filter(e -> !e.estaCerrada()).toList();

        // Cada orden se bloquea y se relee: el técnico puede estar pulsando
        // "Voy en camino" en este mismo instante.
        List<String> enCurso = new ArrayList<>();
        for (Long id : ordenes.idsDelCliente(c.getId(), abiertas)) {
            OrdenServicio orden = ordenes.bloquearDelCliente(id, c.getId()).orElseThrow();
            if (EN_CURSO.contains(orden.getEstado())) {
                enCurso.add(orden.getCodigo());
            } else if (orden.getEstado().permite(EstadoOrden.CANCELADA)) {
                EstadoOrden anterior = orden.getEstado();
                orden.setEstado(EstadoOrden.CANCELADA);
                anotarCancelacion(orden, anterior, u);
            }
        }
        if (!enCurso.isEmpty()) {
            // La excepción deshace también las cancelaciones de arriba.
            throw new ConflictoEstado("Tienes una visita en curso (" + String.join(", ", enCurso)
                    + "). Podrás desactivar tu cuenta cuando termine");
        }

        OffsetDateTime ahora = OffsetDateTime.now();
        u.setActivo(false);
        c.setDesactivadaEn(ahora);
        return new CuentaDesactivada(ahora.plusDays(DIAS_PARA_REACTIVAR));
    }

    /**
     * Si la cuenta del cliente está desactivada y todavía a tiempo, la vuelve a
     * abrir. Lo llama el inicio de sesión con la contraseña ya comprobada.
     */
    @Transactional
    public boolean reactivarSiPuede(Usuario u) {
        Optional<Cliente> encontrado = clientes.findByUsuarioId(u.getId());
        if (encontrado.isEmpty()) {
            return false;
        }
        Cliente c = encontrado.get();
        boolean aTiempo = c.getDesactivadaEn() != null && c.getEliminadaEn() == null
                && c.getDesactivadaEn().plusDays(DIAS_PARA_REACTIVAR).isAfter(OffsetDateTime.now());
        if (!aTiempo) {
            return false;
        }
        u.setActivo(true);
        c.setDesactivadaEn(null);
        return true;
    }

    /**
     * Borra los datos personales de las cuentas desactivadas hace más del
     * plazo. El correo queda libre para registrarse de nuevo.
     *
     * @return cuántas cuentas se eliminaron
     */
    @Transactional
    public int eliminarVencidas(OffsetDateTime ahora) {
        List<Cliente> vencidas = clientes.findByDesactivadaEnBeforeAndEliminadaEnIsNull(
                ahora.minusDays(DIAS_PARA_REACTIVAR));
        for (Cliente c : vencidas) {
            Usuario u = c.getUsuario();
            u.setActivo(false);
            u.setNombres("Cliente");
            u.setApellidos("eliminado");
            u.setEmail("eliminado-" + u.getId() + "@techserv.invalid");
            u.setTelefono(null);
            u.setClaveHash(claves.encode(UUID.randomUUID().toString()));
            c.setDireccion(null);
            c.setReferencia(null);
            c.setDistrito(null);
            c.setLatitud(null);
            c.setLongitud(null);
            c.setEliminadaEn(ahora);
        }
        if (!vencidas.isEmpty()) {
            log.info("Se eliminaron {} cuentas de cliente desactivadas hace más de {} días",
                     vencidas.size(), DIAS_PARA_REACTIVAR);
        }
        return vencidas.size();
    }

    private Cliente cliente(UsuarioAutenticado quien) {
        return clientes.findById(quien.clienteIdObligatorio())
                .orElseThrow(() -> new RecursoNoEncontrado("No se encontró tu perfil de cliente"));
    }

    private void anotarCancelacion(OrdenServicio orden, EstadoOrden anterior, Usuario quien) {
        OrdenHistorial paso = new OrdenHistorial();
        paso.setOrden(orden);
        paso.setEstadoAnterior(anterior);
        paso.setEstadoNuevo(EstadoOrden.CANCELADA);
        paso.setActor(ActorHistorial.CLIENTE);
        paso.setActorUsuario(quien);
        paso.setNota("El cliente desactivó su cuenta");
        historial.save(paso);
        orden.getHistorial().add(paso);
    }

    private static String vacioANulo(String texto) {
        return (texto == null || texto.isBlank()) ? null : texto.trim();
    }
}
