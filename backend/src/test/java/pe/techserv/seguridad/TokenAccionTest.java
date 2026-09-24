package pe.techserv.seguridad;

import jakarta.mail.Multipart;
import jakarta.mail.Part;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import pe.techserv.BasePruebaIntegracion;
import pe.techserv.notificacion.ServicioCorreoTecnico;
import pe.techserv.orden.ActorHistorial;
import pe.techserv.orden.EstadoOrden;
import pe.techserv.orden.OrdenHistorial;
import pe.techserv.orden.OrdenHistorialRepository;
import pe.techserv.orden.OrdenServicio;
import pe.techserv.orden.OrdenServicioRepository;
import pe.techserv.visita.EnlaceTecnico;
import pe.techserv.visita.EnlaceTecnicoRepository;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@AutoConfigureMockMvc
class TokenAccionTest extends BasePruebaIntegracion {

    @MockitoBean
    JavaMailSender correo;

    @Autowired MockMvc mvc;
    @Autowired ServicioCorreoTecnico servicioCorreo;
    @Autowired ServicioJwt servicioJwt;
    @Autowired AccionTokenRepository tokens;
    @Autowired OrdenServicioRepository ordenes;
    @Autowired OrdenHistorialRepository historial;
    @Autowired EnlaceTecnicoRepository enlaces;

    @BeforeEach
    void preparar() {
        when(correo.createMimeMessage()).thenAnswer(inv -> new JavaMailSenderImpl().createMimeMessage());
        OrdenServicio orden = ordenes.findByCodigo("ORD-0139").orElseThrow();
        tokens.deleteAll(tokens.findByOrdenId(orden.getId()));
        orden.setEstado(EstadoOrden.ASIGNADA);
        ordenes.save(orden);
    }

    @Test
    @org.springframework.transaction.annotation.Transactional
    @DisplayName("El correo de asignación lleva los datos de la orden y un solo enlace a la página del técnico")
    void envioDeCorreoDeAsignacion() throws Exception {
        OrdenServicio orden = ordenes.findByCodigo("ORD-0139").orElseThrow();
        String emailTecnico = orden.getTecnico().getUsuario().getEmail();
        int enlacesAntes = enlaces.findByOrdenId(orden.getId()).size();

        servicioCorreo.avisarAsignacion(orden);

        ArgumentCaptor<MimeMessage> captor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(correo, times(1)).send(captor.capture());
        MimeMessage enviado = captor.getValue();

        assertThat(enviado.getAllRecipients()).isNotEmpty();
        assertThat(enviado.getAllRecipients()[0].toString()).contains(emailTecnico);
        assertThat(enviado.getSubject()).contains(orden.getCodigo());

        String html = extraerTexto(enviado);
        assertThat(html).contains(orden.getDireccion());
        assertThat(html).contains(orden.getCliente().getUsuario().getTelefono());

        Matcher matcher = Pattern.compile("/visita/([A-Za-z0-9_\\-]{43})").matcher(html);
        List<String> encontrados = new ArrayList<>();
        while (matcher.find()) {
            encontrados.add(matcher.group(1));
        }
        assertThat(encontrados).hasSize(1);
        assertThat(html).doesNotContain("/t/accion");

        // Se guarda el hash, nunca el token.
        List<EnlaceTecnico> filas = enlaces.findByOrdenId(orden.getId());
        assertThat(filas).hasSize(enlacesAntes + 1);
        assertThat(filas).noneMatch(f -> f.getHashToken().equals(encontrados.get(0)));
        assertThat(tokens.findByOrdenId(orden.getId())).isEmpty();
    }

    @Test
    @DisplayName("Un token válido cambia el estado de la orden y anota en el historial")
    void tokenValidoAplicaAccion() throws Exception {
        OrdenServicio orden = ordenes.findByCodigo("ORD-0139").orElseThrow();
        UUID jti = UUID.randomUUID();
        String token = servicioJwt.paraAccion(jti, orden.getId(), orden.getTecnico().getId(), AccionTecnico.CONFIRMAR);

        AccionToken fila = new AccionToken();
        fila.setJti(jti);
        fila.setOrden(orden);
        fila.setTecnico(orden.getTecnico());
        fila.setAccion(AccionTecnico.CONFIRMAR);
        fila.setExpiraEn(servicioJwt.expiracionDeAccion().atOffset(ZoneOffset.UTC));
        tokens.save(fila);

        int historialAntes = historial.findByOrdenIdOrderByOcurridoEnAsc(orden.getId()).size();

        mvc.perform(get("/t/accion").param("token", token))
                .andExpect(status().isOk())
                .andExpect(view().name("tecnico/accion-confirmada"));

        OrdenServicio actualizada = ordenes.findById(orden.getId()).orElseThrow();
        assertThat(actualizada.getEstado()).isEqualTo(EstadoOrden.CONFIRMADA);

        List<OrdenHistorial> pasos = historial.findByOrdenIdOrderByOcurridoEnAsc(orden.getId());
        assertThat(pasos).hasSize(historialAntes + 1);

        OrdenHistorial ultimoPaso = pasos.get(pasos.size() - 1);
        assertThat(ultimoPaso.getActor()).isEqualTo(ActorHistorial.TECNICO);
        assertThat(ultimoPaso.getEstadoNuevo()).isEqualTo(EstadoOrden.CONFIRMADA);
        assertThat(ultimoPaso.getNota()).contains("«Confirmar recepción»");
    }

    @Test
    @DisplayName("El mismo token usado otra vez no vuelve a cambiar el estado ni duplica historial")
    void tokenReutilizadoNoVuelveAAplicar() throws Exception {
        OrdenServicio orden = ordenes.findByCodigo("ORD-0139").orElseThrow();
        UUID jti = UUID.randomUUID();
        String token = servicioJwt.paraAccion(jti, orden.getId(), orden.getTecnico().getId(), AccionTecnico.CONFIRMAR);

        AccionToken fila = new AccionToken();
        fila.setJti(jti);
        fila.setOrden(orden);
        fila.setTecnico(orden.getTecnico());
        fila.setAccion(AccionTecnico.CONFIRMAR);
        fila.setExpiraEn(servicioJwt.expiracionDeAccion().atOffset(ZoneOffset.UTC));
        tokens.save(fila);

        // Primer uso
        mvc.perform(get("/t/accion").param("token", token))
                .andExpect(status().isOk())
                .andExpect(view().name("tecnico/accion-confirmada"));

        OrdenServicio trasPrimero = ordenes.findById(orden.getId()).orElseThrow();
        EstadoOrden estadoTrasPrimero = trasPrimero.getEstado();
        int historialTrasPrimero = historial.findByOrdenIdOrderByOcurridoEnAsc(orden.getId()).size();

        // Segundo uso del mismo token
        mvc.perform(get("/t/accion").param("token", token))
                .andExpect(status().isOk())
                .andExpect(view().name("tecnico/accion-ya-registrada"));

        OrdenServicio trasSegundo = ordenes.findById(orden.getId()).orElseThrow();
        assertThat(trasSegundo.getEstado()).isEqualTo(estadoTrasPrimero);

        int historialTrasSegundo = historial.findByOrdenIdOrderByOcurridoEnAsc(orden.getId()).size();
        assertThat(historialTrasSegundo).isEqualTo(historialTrasPrimero);
    }

    @Test
    @DisplayName("Un token vencido responde 400 y muestra la vista inválida")
    void tokenCaducadoDa400() throws Exception {
        OrdenServicio orden = ordenes.findByCodigo("ORD-0139").orElseThrow();
        UUID jti = UUID.randomUUID();
        String token = servicioJwt.paraAccion(jti, orden.getId(), orden.getTecnico().getId(), AccionTecnico.CONFIRMAR);

        AccionToken fila = new AccionToken();
        fila.setJti(jti);
        fila.setOrden(orden);
        fila.setTecnico(orden.getTecnico());
        fila.setAccion(AccionTecnico.CONFIRMAR);
        fila.setExpiraEn(OffsetDateTime.now().minusMinutes(10));
        tokens.save(fila);

        mvc.perform(get("/t/accion").param("token", token))
                .andExpect(status().isBadRequest())
                .andExpect(view().name("tecnico/accion-invalida"));
    }

    @Test
    @DisplayName("Un token con la firma manipulada responde 400 y muestra la vista inválida")
    void tokenManipuladoDa400() throws Exception {
        OrdenServicio orden = ordenes.findByCodigo("ORD-0139").orElseThrow();
        UUID jti = UUID.randomUUID();
        String token = servicioJwt.paraAccion(jti, orden.getId(), orden.getTecnico().getId(), AccionTecnico.CONFIRMAR);

        AccionToken fila = new AccionToken();
        fila.setJti(jti);
        fila.setOrden(orden);
        fila.setTecnico(orden.getTecnico());
        fila.setAccion(AccionTecnico.CONFIRMAR);
        fila.setExpiraEn(servicioJwt.expiracionDeAccion().atOffset(ZoneOffset.UTC));
        tokens.save(fila);

        char ultimo = token.charAt(token.length() - 1);
        char alterado = (ultimo == 'a') ? 'b' : 'a';
        String tokenManipulado = token.substring(0, token.length() - 1) + alterado;

        mvc.perform(get("/t/accion").param("token", tokenManipulado))
                .andExpect(status().isBadRequest())
                .andExpect(view().name("tecnico/accion-invalida"));
    }

    @Test
    @DisplayName("Un token que no cuadra con la base de datos responde 400 y muestra la vista inválida")
    void tokenQueNoCuadraConFilaDa400() throws Exception {
        OrdenServicio orden = ordenes.findByCodigo("ORD-0139").orElseThrow();

        // Subcaso 1: jti inexistente en accion_token
        UUID jtiInexistente = UUID.randomUUID();
        String tokenSinFila = servicioJwt.paraAccion(jtiInexistente, orden.getId(), orden.getTecnico().getId(), AccionTecnico.CONFIRMAR);

        mvc.perform(get("/t/accion").param("token", tokenSinFila))
                .andExpect(status().isBadRequest())
                .andExpect(view().name("tecnico/accion-invalida"));

        // Subcaso 2: jti guardado para otra orden
        OrdenServicio otraOrden = ordenes.findByCodigo("ORD-0140").orElseThrow();
        UUID jtiOtraOrden = UUID.randomUUID();
        AccionToken fila = new AccionToken();
        fila.setJti(jtiOtraOrden);
        fila.setOrden(otraOrden);
        fila.setTecnico(otraOrden.getTecnico());
        fila.setAccion(AccionTecnico.CONFIRMAR);
        fila.setExpiraEn(servicioJwt.expiracionDeAccion().atOffset(ZoneOffset.UTC));
        tokens.save(fila);

        String tokenDiscrepante = servicioJwt.paraAccion(jtiOtraOrden, orden.getId(), orden.getTecnico().getId(), AccionTecnico.CONFIRMAR);

        mvc.perform(get("/t/accion").param("token", tokenDiscrepante))
                .andExpect(status().isBadRequest())
                .andExpect(view().name("tecnico/accion-invalida"));
    }

    @Test
    @DisplayName("Un token de acción no sirve como token de sesión en el panel")
    void tokenAccionNoAutenticaComoSesion() throws Exception {
        OrdenServicio orden = ordenes.findByCodigo("ORD-0139").orElseThrow();
        UUID jti = UUID.randomUUID();
        String tokenAccion = servicioJwt.paraAccion(jti, orden.getId(), orden.getTecnico().getId(), AccionTecnico.CONFIRMAR);

        mvc.perform(get("/api/panel/ordenes")
                        .header("Authorization", "Bearer " + tokenAccion))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Dos clics simultáneos del mismo enlace solo aplican la acción una vez")
    void dosClicsSimultaneosSoloAplicanUnaVez() throws Exception {
        OrdenServicio orden = ordenes.findByCodigo("ORD-0139").orElseThrow();
        UUID jti = UUID.randomUUID();
        String token = servicioJwt.paraAccion(jti, orden.getId(), orden.getTecnico().getId(), AccionTecnico.CONFIRMAR);

        AccionToken fila = new AccionToken();
        fila.setJti(jti);
        fila.setOrden(orden);
        fila.setTecnico(orden.getTecnico());
        fila.setAccion(AccionTecnico.CONFIRMAR);
        fila.setExpiraEn(servicioJwt.expiracionDeAccion().atOffset(ZoneOffset.UTC));
        tokens.save(fila);

        int historialAntes = historial.findByOrdenIdOrderByOcurridoEnAsc(orden.getId()).size();

        CountDownLatch listos = new CountDownLatch(2);
        CountDownLatch salida = new CountDownLatch(1);
        CountDownLatch terminados = new CountDownLatch(2);
        ExecutorService executor = Executors.newFixedThreadPool(2);

        for (int i = 0; i < 2; i++) {
            executor.submit(() -> {
                try {
                    listos.countDown();
                    salida.await();
                    mvc.perform(get("/t/accion").param("token", token));
                } catch (Exception e) {
                    throw new RuntimeException(e);
                } finally {
                    terminados.countDown();
                }
            });
        }

        listos.await();
        salida.countDown();
        terminados.await(10, TimeUnit.SECONDS);
        executor.shutdown();

        List<OrdenHistorial> pasos = historial.findByOrdenIdOrderByOcurridoEnAsc(orden.getId());
        assertThat(pasos).hasSize(historialAntes + 1);

        AccionToken filaGuardada = tokens.findById(jti).orElseThrow();
        assertThat(filaGuardada.getUsadoEn()).isNotNull();

        OrdenServicio actualizada = ordenes.findById(orden.getId()).orElseThrow();
        assertThat(actualizada.getEstado()).isEqualTo(EstadoOrden.CONFIRMADA);
    }

    private String extraerTexto(Part parte) throws Exception {
        Object content = parte.getContent();
        if (content instanceof String s) {
            return s;
        }
        if (content instanceof Multipart mp) {
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < mp.getCount(); i++) {
                sb.append(extraerTexto(mp.getBodyPart(i)));
            }
            return sb.toString();
        }
        return "";
    }
}
