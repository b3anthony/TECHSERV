package pe.techserv.notificacion;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;
import pe.techserv.comun.PropiedadesTechServ;
import pe.techserv.orden.OrdenServicio;
import pe.techserv.seguridad.AccionTecnico;
import pe.techserv.seguridad.AccionToken;
import pe.techserv.seguridad.AccionTokenRepository;
import pe.techserv.seguridad.ServicioJwt;

import java.nio.charset.StandardCharsets;
import java.time.ZoneOffset;
import java.util.UUID;

@Service
public class ServicioCorreoTecnico implements AvisoTecnico {

    private static final String REMITENTE = "TechServ <no-responder@techserv.pe>";

    private final JavaMailSender mailSender;
    private final SpringTemplateEngine templateEngine;
    private final ServicioJwt servicioJwt;
    private final AccionTokenRepository tokens;
    private final PropiedadesTechServ props;

    public ServicioCorreoTecnico(JavaMailSender mailSender,
                                 SpringTemplateEngine templateEngine,
                                 ServicioJwt servicioJwt,
                                 AccionTokenRepository tokens,
                                 PropiedadesTechServ props) {
        this.mailSender = mailSender;
        this.templateEngine = templateEngine;
        this.servicioJwt = servicioJwt;
        this.tokens = tokens;
        this.props = props;
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
    @Override
    public void avisarAsignacion(OrdenServicio orden) {
        String enlaceConfirmar = generarEnlace(orden, AccionTecnico.CONFIRMAR);
        String enlaceEnCamino = generarEnlace(orden, AccionTecnico.EN_CAMINO);

        Context context = new Context();
        context.setVariable("orden", orden);
        context.setVariable("enlaceConfirmar", enlaceConfirmar);
        context.setVariable("enlaceEnCamino", enlaceEnCamino);
        context.setVariable("horas", props.tokenAccion().horas());

        String cuerpoHtml = templateEngine.process("correo/asignacion-tecnico", context);

        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, StandardCharsets.UTF_8.name());
            helper.setFrom(REMITENTE);
            helper.setTo(orden.getTecnico().getUsuario().getEmail());
            helper.setSubject("TechServ · Nueva orden " + orden.getCodigo() + " asignada");
            helper.setText(cuerpoHtml, true);
            mailSender.send(mimeMessage);
        } catch (MessagingException e) {
            throw new IllegalStateException("Error al enviar correo al técnico", e);
        }
    }

    private String generarEnlace(OrdenServicio orden, AccionTecnico accion) {
        UUID jti = UUID.randomUUID();
        String jwt = servicioJwt.paraAccion(jti, orden.getId(), orden.getTecnico().getId(), accion);

        AccionToken fila = new AccionToken();
        fila.setJti(jti);
        fila.setOrden(orden);
        fila.setTecnico(orden.getTecnico());
        fila.setAccion(accion);
        fila.setExpiraEn(servicioJwt.expiracionDeAccion().atOffset(ZoneOffset.UTC));
        tokens.save(fila);

        return props.urlPublica() + "/t/accion?token=" + jwt;
    }
}
