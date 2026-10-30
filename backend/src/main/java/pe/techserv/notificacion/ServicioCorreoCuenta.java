package pe.techserv.notificacion;

import jakarta.mail.MessagingException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;
import pe.techserv.comun.PropiedadesTechServ;

import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Map;

@Service
public class ServicioCorreoCuenta {

    private static final Logger log = LoggerFactory.getLogger(ServicioCorreoCuenta.class);
    private static final String REMITENTE = "TechServ <no-responder@techserv.pe>";
    private static final ZoneId LIMA = ZoneId.of("America/Lima");
    private static final DateTimeFormatter FECHA = DateTimeFormatter
            .ofPattern("d 'de' MMMM 'de' uuuu", Locale.forLanguageTag("es-PE"));
    private static final DateTimeFormatter FECHA_HORA = DateTimeFormatter
            .ofPattern("d 'de' MMMM 'de' uuuu, HH:mm '(hora de Lima)'", Locale.forLanguageTag("es-PE"));

    private final JavaMailSender correo;
    private final SpringTemplateEngine plantillas;
    private final PropiedadesTechServ props;

    public ServicioCorreoCuenta(JavaMailSender correo, SpringTemplateEngine plantillas,
                                PropiedadesTechServ props) {
        this.correo = correo;
        this.plantillas = plantillas;
        this.props = props;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void recuperar(AvisoCuenta.Recuperacion aviso) {
        String enlace = props.urlFrontend().replaceAll("/+$", "")
                + "/restablecer-clave/" + aviso.token();
        enviar(aviso.email(), "Recupera tu contraseña de TechServ", "recuperacion-clave",
                Map.of("nombre", aviso.nombre(), "enlace", enlace));
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void claveRestablecida(AvisoCuenta.ClaveRestablecida aviso) {
        enviar(aviso.email(), "Tu contraseña de TechServ cambió", "clave-restablecida",
                Map.of("nombre", aviso.nombre(), "fecha", fechaHora(aviso.fecha()),
                        "enlaceRecuperar", props.urlFrontend().replaceAll("/+$", "") + "/recuperar-clave"));
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void clienteDesactivado(AvisoCuenta.ClienteDesactivado aviso) {
        enviar(aviso.email(), "Cerramos tu cuenta de TechServ", "cuenta-desactivada",
                Map.of("nombre", aviso.nombre(), "fechaLimite", fecha(aviso.reactivableHasta())));
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void clienteEliminado(AvisoCuenta.ClienteEliminado aviso) {
        enviar(aviso.email(), "Tu cuenta de TechServ se eliminó", "cuenta-eliminada",
                Map.of("nombre", aviso.nombre()));
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void tallerEliminado(AvisoCuenta.TallerEliminado aviso) {
        enviar(aviso.email(), "Eliminamos la cuenta de " + aviso.razonSocial(), "taller-eliminado",
                Map.of("nombre", aviso.nombre(), "razonSocial", aviso.razonSocial(),
                        "fecha", fechaHora(aviso.fecha()), "canceladas", aviso.ordenesCanceladas()));
    }

    // SIN @Transactional: el negocio ya hizo commit. Ningún fallo de SMTP o
    // plantilla debe marcar una transacción rollback-only ni romper la petición.
    private void enviar(String destinatario, String asunto, String plantilla, Map<String, Object> datos) {
        try {
            Context contexto = new Context(Locale.forLanguageTag("es-PE"));
            contexto.setVariables(datos);
            String html = plantillas.process("correo/" + plantilla, contexto);
            var mensaje = correo.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mensaje, true, StandardCharsets.UTF_8.name());
            helper.setFrom(REMITENTE);
            helper.setTo(destinatario);
            helper.setSubject(asunto);
            helper.setText(html, true);
            correo.send(mensaje);
        } catch (MessagingException | RuntimeException e) {
            log.warn("No se pudo enviar el aviso de cuenta de la plantilla {}", plantilla, e);
        }
    }

    private static String fecha(OffsetDateTime valor) {
        return FECHA.format(valor.atZoneSameInstant(LIMA));
    }

    private static String fechaHora(OffsetDateTime valor) {
        return FECHA_HORA.format(valor.atZoneSameInstant(LIMA));
    }
}
