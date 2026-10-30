package pe.techserv.seguridad;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.mail.Multipart;
import jakarta.mail.Part;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.support.TransactionTemplate;
import pe.techserv.BasePruebaIntegracion;
import pe.techserv.comun.PropiedadesTechServ;
import pe.techserv.mype.*;
import pe.techserv.seguridad.dto.RecuperarClave;
import pe.techserv.seguridad.dto.RestablecerClave;
import pe.techserv.usuario.*;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@AutoConfigureMockMvc
class RecuperacionClaveTest extends BasePruebaIntegracion {

    private static final String CLAVE = "anterior123";
    private static final String NUEVA = "nueva12345";
    private static final String INVALIDO = "El enlace no es válido o ya caducó. Pide uno nuevo.";

    @MockitoBean JavaMailSender correo;
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;
    @Autowired TransactionTemplate tx;
    @Autowired UsuarioRepository usuarios;
    @Autowired ClienteRepository clientes;
    @Autowired MypeRepository mypes;
    @Autowired AdministradorRepository administradores;
    @Autowired TecnicoRepository tecnicos;
    @Autowired RecuperacionClaveRepository recuperaciones;
    @Autowired ServicioRecuperacionClave servicio;
    @Autowired PasswordEncoder claves;
    @Autowired ServicioJwt jwt;
    @Autowired PropiedadesTechServ props;

    private final List<Long> usuariosCreados = new ArrayList<>();
    private final List<Long> talleresCreados = new ArrayList<>();

    private record Cuenta(Long id, String email, String token, Long mypeId) {}

    @BeforeEach
    void prepararCorreo() {
        when(correo.createMimeMessage()).thenAnswer(inv -> new JavaMailSenderImpl().createMimeMessage());
    }

    @AfterEach
    void limpiar() {
        usuariosCreados.forEach(id -> jdbc.update("DELETE FROM usuario WHERE id = ?", id));
        talleresCreados.forEach(id -> jdbc.update("DELETE FROM mype WHERE id = ?", id));
    }

    @Test
    void recuperarNoRevelaSiExisteOEstaActivaLaCuenta() throws Exception {
        Cuenta activa = cuenta(Rol.CLIENTE);
        Cuenta inactiva = cuenta(Rol.CLIENTE);
        Cuenta eliminada = cuenta(Rol.CLIENTE);
        Cuenta vencida = cuenta(Rol.CLIENTE);
        jdbc.update("UPDATE usuario SET activo = false WHERE id IN (?, ?, ?)",
                inactiva.id(), eliminada.id(), vencida.id());
        jdbc.update("UPDATE cliente SET eliminada_en = NOW(6) WHERE usuario_id = ?", eliminada.id());
        jdbc.update("UPDATE cliente SET desactivada_en = NOW(6) - INTERVAL 31 DAY WHERE usuario_id = ?", vencida.id());

        for (String email : List.of(activa.email().toUpperCase(), inactiva.email(), eliminada.email(),
                vencida.email(), "inexistente." + UUID.randomUUID() + "@correo.pe")) {
            solicitar(email).andExpect(status().isAccepted()).andExpect(content().string(""));
        }

        ArgumentCaptor<MimeMessage> captor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(correo, times(1)).send(captor.capture());
        assertThat(captor.getValue().getAllRecipients()[0].toString()).isEqualTo(activa.email());
        for (Cuenta c : List.of(inactiva, eliminada, vencida)) {
            assertThat(filas(c)).isZero();
        }
    }

    @Test
    void elEnlaceLleva256BitsYSoloSuSha256SeGuarda() throws Exception {
        Cuenta c = cuenta(Rol.CLIENTE);
        String token = pedirToken(c);
        assertThat(java.util.Base64.getUrlDecoder().decode(token)).hasSize(32);
        assertThat(token).hasSize(43).doesNotContain("=");

        RecuperacionClave r = recuperaciones.findFirstByUsuarioIdOrderByCreadoEnDesc(c.id()).orElseThrow();
        assertThat(r.getHashToken()).isEqualTo(hash(token)).hasSize(64).isNotEqualTo(token);
        assertThat(r.getExpiraEn()).isEqualTo(r.getCreadoEn().plusMinutes(30));
        assertThat(r.getUsadoEn()).isNull();
        assertThat(jdbc.queryForList("""
                SELECT column_name FROM information_schema.columns
                WHERE table_schema = DATABASE() AND table_name = 'recuperacion_clave'
                """, String.class)).containsExactlyInAnyOrder(
                "id", "usuario_id", "hash_token", "expira_en", "usado_en", "creado_en");

        MimeMessage aviso = ultimoCorreo();
        assertThat(aviso.getFrom()[0].toString()).contains("no-responder@techserv.pe");
        assertThat(texto(aviso)).contains(props.urlFrontend() + "/restablecer-clave/" + token,
                "Lucía Vega", "30 minutos", "Si no fuiste tú, ignora este correo; tu contraseña no cambia.");
    }

    @Test
    void recuperarValidaCorreoVacioYFormato() throws Exception {
        for (String email : List.of("", "no-es-correo")) {
            solicitar(email).andExpect(status().isBadRequest()).andExpect(jsonPath("$.campos.email").exists());
        }
        verify(correo, never()).send(any(MimeMessage.class));
    }

    @Test
    void frenoDe60SegundosNoCreaNiEnviaOtroEnlace() throws Exception {
        Cuenta c = cuenta(Rol.CLIENTE);
        String token = pedirToken(c);
        solicitar(c.email()).andExpect(status().isAccepted()).andExpect(content().string(""));
        assertThat(filas(c)).isEqualTo(1);
        verify(correo, times(1)).send(any(MimeMessage.class));
        restablecer(token, NUEVA).andExpect(status().isNoContent());
        // El freno cuenta también el enlace recién consumido.
        solicitar(c.email()).andExpect(status().isAccepted());
        assertThat(filas(c)).isEqualTo(1);
        verify(correo, times(2)).send(any(MimeMessage.class));
    }

    @Test
    void pedirUnoNuevoInvalidaElAnterior() throws Exception {
        Cuenta c = cuenta(Rol.CLIENTE);
        String anterior = pedirToken(c);
        jdbc.update("UPDATE recuperacion_clave SET creado_en = NOW(6) - INTERVAL 61 SECOND WHERE usuario_id = ?", c.id());
        String nuevo = pedirToken(c);
        assertThat(nuevo).isNotEqualTo(anterior);
        assertThat(filas(c)).isEqualTo(2);
        invalido(anterior);
        restablecer(nuevo, NUEVA).andExpect(status().isNoContent());
    }

    @Test
    void restablecerFuncionaSoloUnaVezYCambiaLaClave() throws Exception {
        Cuenta c = cuenta(Rol.CLIENTE);
        String token = pedirToken(c);
        restablecer(token, NUEVA).andExpect(status().isNoContent()).andExpect(content().string(""));
        assertThat(usuarios.findById(c.id()).orElseThrow().getClaveCambiadaEn()).isNotNull();
        assertThat(recuperaciones.findByHashToken(hash(token)).orElseThrow().getUsadoEn()).isNotNull();
        invalido(token);
        login(c.email(), CLAVE).andExpect(status().isBadRequest());
        login(c.email(), NUEVA).andExpect(status().isOk());
        MimeMessage aviso = ultimoCorreo();
        assertThat(aviso.getSubject()).isEqualTo("Tu contraseña de TechServ cambió");
        assertThat(aviso.getAllRecipients()[0].toString()).isEqualTo(c.email());
        assertThat(texto(aviso)).contains("hora de Lima", "Si no fuiste tú, recupérala ya y avisa al taller/soporte.");
        verify(correo, times(2)).send(any(MimeMessage.class));
    }

    @Test
    void caducadoInexistenteYUsadoDanElMismo400() throws Exception {
        Cuenta c = cuenta(Rol.CLIENTE);
        String token = pedirToken(c);
        jdbc.update("UPDATE recuperacion_clave SET expira_en = NOW(6) - INTERVAL 1 SECOND WHERE usuario_id = ?", c.id());
        invalido(token);
        invalido("A".repeat(43));
        invalido("malformado");
        mvc.perform(post("/api/auth/restablecer-clave").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("claveNueva", NUEVA))))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.mensaje").value(INVALIDO));
        assertThat(recuperaciones.findByHashToken(hash(token)).orElseThrow().getUsadoEn()).isNull();
        login(c.email(), CLAVE).andExpect(status().isOk());
    }

    @Test
    void laClaveNuevaTieneLasMismasReglasDelRegistroYNoConsumeSiEsInvalida() throws Exception {
        Cuenta c = cuenta(Rol.CLIENTE);
        String token = pedirToken(c);
        for (String clave : List.of("", "1234567", "        ")) {
            restablecer(token, clave).andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.campos.claveNueva").exists());
        }
        // No se exigen mayúsculas, símbolos ni dígitos: el registro tampoco.
        restablecer(token, "abcdefgh").andExpect(status().isNoContent());
        login(c.email(), "abcdefgh").andExpect(status().isOk());
    }

    @Test
    void restablecerInvalidaTodosLosOtrosEnlacesDelUsuario() throws Exception {
        Cuenta c = cuenta(Rol.CLIENTE);
        Cuenta otra = cuenta(Rol.CLIENTE);
        String token = pedirToken(c);
        String tokenOtraCuenta = pedirToken(otra);
        RecuperacionClave adicional = new RecuperacionClave();
        adicional.setUsuario(usuarios.findById(c.id()).orElseThrow());
        adicional.setHashToken(hash("B".repeat(43)));
        adicional.setExpiraEn(OffsetDateTime.now().plusMinutes(30));
        recuperaciones.save(adicional);

        restablecer(token, NUEVA).andExpect(status().isNoContent());
        invalido("B".repeat(43));
        restablecer(tokenOtraCuenta, NUEVA).andExpect(status().isNoContent());
    }

    @Test
    void sesionesAnterioresQuedanFueraYLasPosterioresFuncionan() throws Exception {
        Cuenta c = cuenta(Rol.CLIENTE);
        yo(c.token()).andExpect(status().isOk());
        // Sin esperas: una sesión emitida en el MISMO segundo del cambio también cae.
        restablecer(pedirToken(c), NUEVA).andExpect(status().isNoContent());
        yo(c.token()).andExpect(status().isUnauthorized());
        String nuevaSesion = json.readTree(login(c.email(), NUEVA).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString()).get("token").asText();
        yo(nuevaSesion).andExpect(status().isOk());
    }

    @Test
    void unLoginQueLeyoLaClaveViejaAntesDelCambioNoDejaSesionViva() throws Exception {
        Cuenta c = cuenta(Rol.CLIENTE);
        // Lo que un login leyó de la fila (hash y sello viejos) justo antes del restablecimiento...
        var leidoAntes = usuarios.findById(c.id()).orElseThrow();
        restablecer(pedirToken(c), NUEVA).andExpect(status().isNoContent());
        // ...y la sesión que ese login emite DESPUÉS de que el cambio se confirmó.
        yo(jwt.paraSesion(leidoAntes)).andExpect(status().isUnauthorized());
    }

    @Test
    void elClienteDesactivadoRestableceSinReactivarseYEntrarLoReactiva() throws Exception {
        Cuenta c = cuenta(Rol.CLIENTE);
        jdbc.update("UPDATE usuario SET activo = false WHERE id = ?", c.id());
        jdbc.update("UPDATE cliente SET desactivada_en = NOW(6) - INTERVAL 2 DAY WHERE usuario_id = ?", c.id());
        restablecer(pedirToken(c), NUEVA).andExpect(status().isNoContent());
        assertThat(usuarios.findById(c.id()).orElseThrow().isActivo()).isFalse();
        assertThat(clientes.findByUsuarioId(c.id()).orElseThrow().getDesactivadaEn()).isNotNull();
        login(c.email(), CLAVE).andExpect(status().isBadRequest());
        login(c.email(), NUEVA).andExpect(status().isOk()).andExpect(jsonPath("$.cuentaReactivada").value(true));
        assertThat(usuarios.findById(c.id()).orElseThrow().isActivo()).isTrue();
        assertThat(clientes.findByUsuarioId(c.id()).orElseThrow().getDesactivadaEn()).isNull();
    }

    @Test
    void losTresRolesPuedenRecuperarYRestablecer() throws Exception {
        for (Rol rol : Rol.values()) {
            Cuenta c = cuenta(rol);
            restablecer(pedirToken(c), NUEVA).andExpect(status().isNoContent());
            login(c.email(), NUEVA).andExpect(status().isOk()).andExpect(jsonPath("$.usuario.rol").value(rol.name()));
        }
    }

    @Test
    void unTallerCerradoNoRecibeEnlacesAunqueElUsuarioEsteActivo() throws Exception {
        for (Rol rol : List.of(Rol.ADMIN_MYPE, Rol.TECNICO)) {
            Cuenta c = cuenta(rol);
            jdbc.update("UPDATE mype SET activo = false WHERE id = ?", c.mypeId());
            solicitar(c.email()).andExpect(status().isAccepted()).andExpect(content().string(""));
            assertThat(filas(c)).isZero();
        }
        verify(correo, never()).send(any(MimeMessage.class));
    }

    @Test
    void unUsuarioDeTallerInactivoNoRecibeEnlaces() throws Exception {
        for (Rol rol : List.of(Rol.ADMIN_MYPE, Rol.TECNICO)) {
            Cuenta c = cuenta(rol);
            jdbc.update("UPDATE usuario SET activo = false WHERE id = ?", c.id());
            solicitar(c.email()).andExpect(status().isAccepted());
            assertThat(filas(c)).isZero();
        }
        verify(correo, never()).send(any(MimeMessage.class));
    }

    @Test
    void unEnlaceEmitidoAntesDeEliminarLaCuentaOElTallerNoCambiaSuClave() throws Exception {
        Cuenta c = cuenta(Rol.CLIENTE);
        String token = pedirToken(c);
        // Incluso una fila incoherente con activo=true no recupera datos borrados.
        jdbc.update("UPDATE cliente SET eliminada_en = NOW(6) WHERE usuario_id = ?", c.id());
        invalido(token);
        Cuenta admin = cuenta(Rol.ADMIN_MYPE);
        String tokenAdmin = pedirToken(admin);
        jdbc.update("UPDATE mype SET activo = false WHERE id = ?", admin.mypeId());
        invalido(tokenAdmin);
        assertThat(claves.matches(CLAVE, usuarios.findById(admin.id()).orElseThrow().getClaveHash())).isTrue();
    }

    @Test
    void dosPeticionesSimultaneasSoloRestablecenUnaVez() throws Exception {
        Cuenta c = cuenta(Rol.CLIENTE);
        String token = pedirToken(c);
        List<Integer> estados = enParalelo(() -> restablecer(token, NUEVA).andReturn().getResponse().getStatus());
        assertThat(estados).containsExactlyInAnyOrder(204, 400);
        verify(correo, times(2)).send(any(MimeMessage.class));
        login(c.email(), NUEVA).andExpect(status().isOk());
    }

    @Test
    void dosPedidosSimultaneosRespetanElFreno() throws Exception {
        Cuenta c = cuenta(Rol.CLIENTE);
        assertThat(enParalelo(() -> solicitar(c.email()).andReturn().getResponse().getStatus()))
                .containsExactly(202, 202);
        assertThat(filas(c)).isEqualTo(1);
        verify(correo, times(1)).send(any(MimeMessage.class));
    }

    @Test
    void cambiarDesdeMiCuentaOAjustesConservaLaMarcaYLaSesion() throws Exception {
        for (Rol rol : List.of(Rol.CLIENTE, Rol.ADMIN_MYPE)) {
            Cuenta c = cuenta(rol);
            String ruta = rol == Rol.CLIENTE ? "/api/mi-cuenta/clave" : "/api/panel/ajustes/clave";
            mvc.perform(put(ruta).header("Authorization", "Bearer " + c.token())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(json.writeValueAsString(Map.of("claveActual", CLAVE, "claveNueva", NUEVA))))
                    .andExpect(status().isNoContent());
            assertThat(usuarios.findById(c.id()).orElseThrow().getClaveCambiadaEn()).isNull();
            yo(c.token()).andExpect(status().isOk());

            // Tampoco se borra una marca de recuperación que ya existía.
            restablecer(pedirToken(c), "recuperada123").andExpect(status().isNoContent());
            OffsetDateTime marca = usuarios.findById(c.id()).orElseThrow().getClaveCambiadaEn();
            String sesion = json.readTree(login(c.email(), "recuperada123").andExpect(status().isOk())
                    .andReturn().getResponse().getContentAsString()).get("token").asText();
            mvc.perform(put(ruta).header("Authorization", "Bearer " + sesion)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(json.writeValueAsString(Map.of("claveActual", "recuperada123", "claveNueva", "final12345"))))
                    .andExpect(status().isNoContent());
            assertThat(usuarios.findById(c.id()).orElseThrow().getClaveCambiadaEn()).isEqualTo(marca);
            yo(sesion).andExpect(status().isOk());
        }
    }

    @Test
    void elCorreoSoloSaleDespuesDelCommitYNuncaSiSeRevierte() {
        Cuenta c = cuenta(Rol.CLIENTE);
        tx.executeWithoutResult(estado -> {
            servicio.recuperar(new RecuperarClave(c.email()));
            verify(correo, never()).send(any(MimeMessage.class));
            estado.setRollbackOnly();
        });
        assertThat(filas(c)).isZero();
        verify(correo, never()).send(any(MimeMessage.class));
        tx.executeWithoutResult(estado -> {
            servicio.recuperar(new RecuperarClave(c.email()));
            verify(correo, never()).send(any(MimeMessage.class));
        });
        verify(correo, times(1)).send(any(MimeMessage.class));
    }

    @Test
    void smtpCaidoNoRompeRecuperarNiRestablecer() throws Exception {
        Cuenta c = cuenta(Rol.CLIENTE);
        doThrow(new MailSendException("SMTP apagado")).when(correo).send(any(MimeMessage.class));
        String token = pedirToken(c);
        restablecer(token, NUEVA).andExpect(status().isNoContent());
        login(c.email(), NUEVA).andExpect(status().isOk());
        assertThat(recuperaciones.findByHashToken(hash(token)).orElseThrow().getUsadoEn()).isNotNull();
    }

    @Test
    void restablecerNoEnviaAntesDelCommitNiCuandoSeRevierte() throws Exception {
        Cuenta c = cuenta(Rol.CLIENTE);
        String token = pedirToken(c);
        tx.executeWithoutResult(estado -> {
            servicio.restablecer(new RestablecerClave(token, NUEVA));
            verify(correo, times(1)).send(any(MimeMessage.class));
            estado.setRollbackOnly();
        });
        verify(correo, times(1)).send(any(MimeMessage.class));
        assertThat(recuperaciones.findByHashToken(hash(token)).orElseThrow().getUsadoEn()).isNull();
        login(c.email(), CLAVE).andExpect(status().isOk());
        tx.executeWithoutResult(estado -> {
            servicio.restablecer(new RestablecerClave(token, NUEVA));
            verify(correo, times(1)).send(any(MimeMessage.class));
        });
        verify(correo, times(2)).send(any(MimeMessage.class));
    }

    @Test
    void losDatosDelUsuarioVanEscapadosEnElCorreo() throws Exception {
        Cuenta c = cuenta(Rol.CLIENTE);
        jdbc.update("UPDATE usuario SET nombres = ? WHERE id = ?", "<img src=x onerror=alert(1)>", c.id());
        pedirToken(c);
        assertThat(texto(ultimoCorreo())).contains("&lt;img").doesNotContain("<img src=x");
    }

    private Cuenta cuenta(Rol rol) {
        return tx.execute(estado -> {
            Usuario u = new Usuario();
            u.setNombres("Lucía");
            u.setApellidos("Vega");
            u.setEmail("recuperacion." + UUID.randomUUID() + "@correo.pe");
            u.setClaveHash(claves.encode(CLAVE));
            u.setRol(rol);
            usuarios.saveAndFlush(u);
            usuariosCreados.add(u.getId());
            Long mypeId = null;
            if (rol == Rol.CLIENTE) {
                Cliente c = new Cliente();
                c.setUsuario(u);
                clientes.save(c);
            } else {
                Mype m = new Mype();
                m.setRazonSocial("Taller de recuperación");
                m.setRuc(String.valueOf(ThreadLocalRandom.current().nextLong(20_000_000_000L, 99_999_999_999L)));
                m.setDireccion("Jr. Pruebas 123");
                m.setDistrito("Lima");
                mypes.saveAndFlush(m);
                talleresCreados.add(m.getId());
                mypeId = m.getId();
                if (rol == Rol.ADMIN_MYPE) {
                    Administrador a = new Administrador();
                    a.setUsuario(u);
                    a.setMype(m);
                    administradores.save(a);
                } else {
                    Tecnico t = new Tecnico();
                    t.setUsuario(u);
                    t.setMype(m);
                    tecnicos.save(t);
                }
            }
            return new Cuenta(u.getId(), u.getEmail(), jwt.paraSesion(u), mypeId);
        });
    }

    private ResultActions solicitar(String email) throws Exception {
        return mvc.perform(post("/api/auth/recuperar-clave").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("email", email))));
    }

    private String pedirToken(Cuenta c) throws Exception {
        solicitar(c.email()).andExpect(status().isAccepted()).andExpect(content().string(""));
        var matcher = Pattern.compile("/restablecer-clave/([A-Za-z0-9_-]{43})").matcher(texto(ultimoCorreo()));
        assertThat(matcher.find()).isTrue();
        return matcher.group(1);
    }

    private ResultActions restablecer(String token, String clave) throws Exception {
        return mvc.perform(post("/api/auth/restablecer-clave").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("token", token, "claveNueva", clave))));
    }

    private void invalido(String token) throws Exception {
        restablecer(token, NUEVA).andExpect(status().isBadRequest()).andExpect(jsonPath("$.mensaje").value(INVALIDO));
    }

    private ResultActions login(String email, String clave) throws Exception {
        return mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("email", email, "clave", clave))));
    }

    private ResultActions yo(String token) throws Exception {
        return mvc.perform(get("/api/auth/yo").header("Authorization", "Bearer " + token));
    }

    private int filas(Cuenta c) {
        return jdbc.queryForObject("SELECT count(*) FROM recuperacion_clave WHERE usuario_id = ?", Integer.class, c.id());
    }

    private MimeMessage ultimoCorreo() {
        ArgumentCaptor<MimeMessage> captor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(correo, atLeastOnce()).send(captor.capture());
        return captor.getAllValues().getLast();
    }

    private static String hash(String token) throws Exception {
        return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)));
    }

    private static String texto(Part parte) throws Exception {
        Object contenido = parte.getContent();
        if (contenido instanceof String s) return s;
        StringBuilder texto = new StringBuilder();
        if (contenido instanceof Multipart multi) {
            for (int i = 0; i < multi.getCount(); i++) texto.append(texto(multi.getBodyPart(i)));
        }
        return texto.toString();
    }

    private static List<Integer> enParalelo(java.util.concurrent.Callable<Integer> peticion) throws Exception {
        CountDownLatch listos = new CountDownLatch(2);
        CountDownLatch salida = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            List<Future<Integer>> futuros = new ArrayList<>();
            for (int i = 0; i < 2; i++) {
                futuros.add(executor.submit(() -> {
                    listos.countDown();
                    assertThat(salida.await(10, TimeUnit.SECONDS)).isTrue();
                    return peticion.call();
                }));
            }
            assertThat(listos.await(10, TimeUnit.SECONDS)).isTrue();
            salida.countDown();
            return List.of(futuros.get(0).get(20, TimeUnit.SECONDS), futuros.get(1).get(20, TimeUnit.SECONDS));
        }
    }
}
