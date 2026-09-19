package pe.techserv.notificacion;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
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

    @Override
    @Transactional
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
