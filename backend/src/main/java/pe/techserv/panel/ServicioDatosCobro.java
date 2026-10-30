package pe.techserv.panel;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;
import pe.techserv.almacen.ServicioAlmacenamiento;
import pe.techserv.comun.RecursoNoEncontrado;
import pe.techserv.comun.SolicitudInvalida;
import pe.techserv.mype.Mype;
import pe.techserv.mype.MypeCobro;
import pe.techserv.mype.MypeCobroRepository;
import pe.techserv.mype.MypeRepository;
import pe.techserv.pago.MetodoPago;
import pe.techserv.panel.dto.ActualizarDatosCobro;
import pe.techserv.panel.dto.DatosCobro;
import pe.techserv.seguridad.UsuarioAutenticado;
import pe.techserv.visita.dto.DatosCobroVisita;

import java.util.Collection;

@Service
public class ServicioDatosCobro {

    private static final Logger log = LoggerFactory.getLogger(ServicioDatosCobro.class);

    private final MypeCobroRepository cobros;
    private final MypeRepository mypes;
    private final ServicioAlmacenamiento almacen;

    public ServicioDatosCobro(MypeCobroRepository cobros, MypeRepository mypes,
                              ServicioAlmacenamiento almacen) {
        this.cobros = cobros;
        this.mypes = mypes;
        this.almacen = almacen;
    }

    @Transactional(readOnly = true)
    public DatosCobro ver(UsuarioAutenticado usuario) {
        return datos(usuario.mypeIdObligatorio());
    }

    @Transactional
    public DatosCobro actualizar(UsuarioAutenticado usuario, ActualizarDatosCobro datos) {
        MypeCobro cobro = paraEditar(usuario.mypeIdObligatorio());
        cobro.setYapeNumero(datos.yapeNumero());
        cobro.setPlinNumero(datos.plinNumero());
        cobro.setBanco(datos.banco());
        cobro.setTitular(datos.titular());
        cobro.setNumeroCuenta(datos.numeroCuenta());
        cobro.setCci(datos.cci());
        return DatosCobro.de(cobros.save(cobro));
    }

    @Transactional
    public DatosCobro subirQr(UsuarioAutenticado usuario, String metodo, MultipartFile imagen) {
        Long mypeId = usuario.mypeIdObligatorio();
        MetodoPago elegido = metodoQr(metodo);
        MypeCobro cobro = paraEditar(mypeId);
        String anterior = qr(cobro, elegido);
        String nueva = almacen.guardarCobro(mypeId, imagen);
        limpiarAlFinalizar(mypeId, anterior, nueva);
        ponerQr(cobro, elegido, nueva);
        return DatosCobro.de(cobros.save(cobro));
    }

    @Transactional
    public DatosCobro quitarQr(UsuarioAutenticado usuario, String metodo) {
        Long mypeId = usuario.mypeIdObligatorio();
        MetodoPago elegido = metodoQr(metodo);
        MypeCobro cobro = paraEditar(mypeId);
        String anterior = qr(cobro, elegido);
        limpiarAlFinalizar(mypeId, anterior, null);
        ponerQr(cobro, elegido, null);
        return DatosCobro.de(cobros.save(cobro));
    }

    /** El taller y los métodos salen de la orden resuelta por el token del técnico. */
    @Transactional(readOnly = true)
    public DatosCobroVisita paraVisita(Long mypeId, Collection<MetodoPago> ofrecidos) {
        return DatosCobroVisita.de(datos(mypeId), ofrecidos);
    }

    private DatosCobro datos(Long mypeId) {
        return cobros.findByMypeId(mypeId).map(DatosCobro::de).orElseGet(DatosCobro::vacios);
    }

    private MypeCobro paraEditar(Long mypeId) {
        // Bloquear el taller también serializa la primera creación de su configuración.
        Mype taller = mypes.bloquear(mypeId)
                .orElseThrow(() -> new RecursoNoEncontrado("No se encontró el taller"));
        return cobros.findByMypeId(mypeId).orElseGet(() -> new MypeCobro(taller));
    }

    private static MetodoPago metodoQr(String metodo) {
        return switch (metodo) {
            case "YAPE" -> MetodoPago.YAPE;
            case "PLIN" -> MetodoPago.PLIN;
            default -> throw new SolicitudInvalida("El QR debe ser de Yape o Plin");
        };
    }

    private static String qr(MypeCobro cobro, MetodoPago metodo) {
        return metodo == MetodoPago.YAPE ? cobro.getYapeQr() : cobro.getPlinQr();
    }

    private static void ponerQr(MypeCobro cobro, MetodoPago metodo, String ruta) {
        if (metodo == MetodoPago.YAPE) cobro.setYapeQr(ruta);
        else cobro.setPlinQr(ruta);
    }

    private void limpiarAlFinalizar(Long mypeId, String anterior, String nueva) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int estado) {
                // Un rollback conserva el anterior y elimina el archivo recién subido.
                String sobrante = estado == STATUS_COMMITTED ? anterior : nueva;
                if (sobrante == null) return;
                try {
                    almacen.eliminarCobro(mypeId, sobrante);
                } catch (RuntimeException e) {
                    log.error("No se pudo limpiar el QR del taller {}: {}", mypeId, sobrante, e);
                }
            }
        });
    }
}
