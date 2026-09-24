package pe.techserv.notificacion;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;
import pe.techserv.orden.OrdenServicio;
import pe.techserv.visita.ServicioEnlaces;

import java.nio.charset.StandardCharsets;

@Service
public class ServicioCorreoTecnico implements AvisoTecnico {

    private static final String REMITENTE = "TechServ <no-responder@techserv.pe>";

    private final JavaMailSender mailSender;
    private final SpringTemplateEngine templateEngine;
    private final ServicioEnlaces enlaces;

    public ServicioCorreoTecnico(JavaMailSender mailSender,
                                 SpringTemplateEngine templateEngine,
                                 ServicioEnlaces enlaces) {
        this.mailSender = mailSender;
        this.templateEngine = templateEngine;
        this.enlaces = enlaces;
    }

    // SIN @Transactional, y no es un olvido: es el arreglo del 19 sep 2026.
    //
    // Cuando este metodo la llevaba, se unia a la transaccion de quien asigna
    // (propagacion REQUIRED). Si el correo fallaba, el interceptor marcaba esa
    // transaccion compartida como rollback-only. El catch de ServicioPanel se
    // tragaba la excepcion, pero la bandera ya estaba puesta y NADIE puede
    // quitarla: al hacer commit saltaba UnexpectedRollbackException y la
    // asignacion entera se caia con un 500. Justo lo contrario de lo que
    // promete el comentario de ServicioPanel.
    //
    // Sin la anotacion no hay interceptor, asi que no hay nada que marque la
    // transaccion. Los `tokens.save` se unen a la del llamante, que ya la trae
    // (ServicioPanel es @Transactional, y la prueba que llama aqui directo
    // tambien). Si el correo revienta despues de guardar los tokens, esos
    // tokens se quedan: caducan solos y no estorban.
    //
    // No le pongas REQUIRES_NEW para "aislarlo": eso suspende la transaccion
    // del llamante, y `orden` es una entidad de ESE contexto de persistencia.
    //
    // Desde el 24 sep 2026 el correo lleva UN enlace, a la pagina del tecnico
    // (/visita/<token>), y ya no los botones de un solo uso. /t/accion sigue
    // funcionando para los correos que ya se enviaron.
    @Override
    public void avisarAsignacion(OrdenServicio orden) {
        String enlaceVisita = enlaces.crear(orden);

        Context context = new Context();
        context.setVariable("orden", orden);
        context.setVariable("enlaceVisita", enlaceVisita);
        context.setVariable("dias", ServicioEnlaces.DIAS_VIGENCIA);

        String cuerpoHtml = templateEngine.process("correo/asignacion-tecnico", context);

        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, StandardCharsets.UTF_8.name());
            helper.setFrom(REMITENTE);
            helper.setTo(orden.getTecnico().getUsuario().getEmail());
            helper.setSubject("TechServ · Nueva visita " + orden.getCodigo() + ": abre tu orden");
            helper.setText(cuerpoHtml, true);
            mailSender.send(mimeMessage);
        } catch (MessagingException e) {
            throw new IllegalStateException("Error al enviar correo al técnico", e);
        }
    }
}
