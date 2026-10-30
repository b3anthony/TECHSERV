package pe.techserv.notificacion;

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
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.support.TransactionTemplate;
import pe.techserv.BasePruebaIntegracion;
import pe.techserv.cliente.ServicioCuentaCliente;
import pe.techserv.cliente.dto.DesactivarCuenta;
import pe.techserv.comun.Especialidad;
import pe.techserv.mype.*;
import pe.techserv.orden.*;
import pe.techserv.panel.ServicioAjustes;
import pe.techserv.panel.dto.EliminarCuenta;
import pe.techserv.seguridad.ServicioJwt;
import pe.techserv.seguridad.ServicioPrincipal;
import pe.techserv.usuario.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class CorreoCuentaTest extends BasePruebaIntegracion {

    private static final String CLAVE = "correo1234";
    // Una fecha anterior a las cuentas de las otras clases: la limpieza global
    // solo alcanza nuestros datos. Nunca contamos filas de toda la base.
    private static final OffsetDateTime LIMPIEZA = OffsetDateTime.parse("2001-11-15T02:00:00Z");

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
    @Autowired OrdenServicioRepository ordenes;
    @Autowired PasswordEncoder claves;
    @Autowired ServicioJwt jwt;
    @Autowired ServicioPrincipal principales;
    @Autowired ServicioCuentaCliente cuentas;
    @Autowired ServicioAjustes ajustes;
    @Autowired ApplicationEventPublisher avisos;

    private final List<Long> usuariosCreados = new ArrayList<>();
    private final List<Long> talleresCreados = new ArrayList<>();
    private final List<Long> ordenesCreadas = new ArrayList<>();

    private record Cuenta(Long id, String email, String token, Long clienteId) {}
    private record Taller(Long id, Cuenta admin, Cuenta tecnico) {}

    @BeforeEach
    void preparar() {
        when(correo.createMimeMessage()).thenAnswer(inv -> new JavaMailSenderImpl().createMimeMessage());
    }

    @AfterEach
    void limpiar() {
        ordenesCreadas.forEach(id -> jdbc.update("DELETE FROM orden_servicio WHERE id = ?", id));
        usuariosCreados.forEach(id -> jdbc.update("DELETE FROM usuario WHERE id = ?", id));
        talleresCreados.forEach(id -> jdbc.update("DELETE FROM mype WHERE id = ?", id));
    }

    @Test
    void desactivarAvisaAlClienteConElPlazoLegibleEnLima() throws Exception {
        Cuenta c = cliente();
        String cuerpo = mvc.perform(post("/api/mi-cuenta/desactivar")
                        .header("Authorization", "Bearer " + c.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("clave", CLAVE))))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        OffsetDateTime hasta = OffsetDateTime.parse(json.readTree(cuerpo).get("reactivableHasta").asText());
        String fecha = DateTimeFormatter.ofPattern("d 'de' MMMM 'de' uuuu", Locale.forLanguageTag("es-PE"))
                .format(hasta.atZoneSameInstant(ZoneId.of("America/Lima")));

        MimeMessage enviado = unicoCorreo();
        assertThat(enviado.getAllRecipients()[0].toString()).isEqualTo(c.email());
        assertThat(enviado.getSubject()).isEqualTo("Cerramos tu cuenta de TechServ");
        assertThat(texto(enviado)).contains("Ángela Prueba", fecha, "hora de Lima", "entra antes del",
                "y la recuperas", "se eliminará definitivamente");
        assertThat(usuarios.findById(c.id()).orElseThrow().isActivo()).isFalse();
    }

    @Test
    void elPlazoUsaElDiaDeLimaAunqueEnUtcSeaElDiaSiguiente() throws Exception {
        Cuenta c = cliente();
        tx.executeWithoutResult(estado -> avisos.publishEvent(new AvisoCuenta.ClienteDesactivado(
                c.email(), "Ángela Prueba", OffsetDateTime.parse("2026-11-16T01:00:00Z"))));
        assertThat(texto(unicoCorreo())).contains("15 de noviembre de 2026").doesNotContain("16 de noviembre");
    }

    @Test
    void eliminarVencidasAvisaAlCorreoOriginalYNoIncluyeOtrosDatosPersonales() throws Exception {
        Cuenta c = clienteVencido();
        cuentas.eliminarVencidas(LIMPIEZA);
        MimeMessage enviado = unicoCorreo();
        assertThat(enviado.getAllRecipients()[0].toString()).isEqualTo(c.email());
        assertThat(enviado.getSubject()).isEqualTo("Tu cuenta de TechServ se eliminó");
        assertThat(texto(enviado)).contains("Ángela Prueba").doesNotContain(c.email(), "912345678",
                "Calle privada 123", "Referencia privada", "Distrito privado", "@techserv.invalid");
        Usuario anonimo = usuarios.findById(c.id()).orElseThrow();
        assertThat(anonimo.getEmail()).isEqualTo("eliminado-" + c.id() + "@techserv.invalid");
        assertThat(anonimo.isActivo()).isFalse();
        assertThat(clientes.findById(c.clienteId()).orElseThrow().getEliminadaEn()).isEqualTo(LIMPIEZA);
        cuentas.eliminarVencidas(LIMPIEZA);
        verify(correo, times(1)).send(any(MimeMessage.class));
    }

    @Test
    void eliminarTallerAvisaAlAdministradorOriginalYCuentaLasOrdenesCanceladas() throws Exception {
        Taller t = taller();
        Cuenta c = cliente();
        OrdenServicio pendiente = orden(t, c, EstadoOrden.PENDIENTE);
        OrdenServicio confirmada = orden(t, c, EstadoOrden.CONFIRMADA);
        OrdenServicio cerrada = orden(t, c, EstadoOrden.COMPLETADA);
        eliminarTaller(t);

        MimeMessage enviado = unicoCorreo();
        assertThat(enviado.getAllRecipients()[0].toString()).isEqualTo(t.admin().email());
        assertThat(enviado.getSubject()).isEqualTo("Eliminamos la cuenta de Taller Ágil & Seguro");
        assertThat(texto(enviado)).contains("Taller Ágil &amp; Seguro", "hora de Lima", "Sus técnicos ya no pueden entrar",
                "se cancelaron: <strong>2</strong>");
        assertThat(mypes.findById(t.id()).orElseThrow().isActivo()).isFalse();
        assertThat(usuarios.findById(t.admin().id()).orElseThrow().isActivo()).isFalse();
        assertThat(usuarios.findById(t.tecnico().id()).orElseThrow().isActivo()).isFalse();
        assertThat(usuarios.findById(t.admin().id()).orElseThrow().getEmail()).isNotEqualTo(t.admin().email());
        assertThat(ordenes.findById(pendiente.getId()).orElseThrow().getEstado()).isEqualTo(EstadoOrden.CANCELADA);
        assertThat(ordenes.findById(confirmada.getId()).orElseThrow().getEstado()).isEqualTo(EstadoOrden.CANCELADA);
        assertThat(ordenes.findById(cerrada.getId()).orElseThrow().getEstado()).isEqualTo(EstadoOrden.COMPLETADA);
    }

    @Test
    void smtpCaidoNoImpideDesactivar() throws Exception {
        Cuenta c = cliente();
        smtpCaido();
        mvc.perform(post("/api/mi-cuenta/desactivar").header("Authorization", "Bearer " + c.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("clave", CLAVE))))
                .andExpect(status().isOk());
        assertThat(usuarios.findById(c.id()).orElseThrow().isActivo()).isFalse();
        assertThat(unicoCorreo().getAllRecipients()[0].toString()).isEqualTo(c.email());
    }

    @Test
    void smtpCaidoNoImpideEliminarVencidas() throws Exception {
        Cuenta c = clienteVencido();
        smtpCaido();
        cuentas.eliminarVencidas(LIMPIEZA);
        assertThat(clientes.findById(c.clienteId()).orElseThrow().getEliminadaEn()).isEqualTo(LIMPIEZA);
        assertThat(usuarios.findById(c.id()).orElseThrow().getEmail()).contains("@techserv.invalid");
        assertThat(unicoCorreo().getAllRecipients()[0].toString()).isEqualTo(c.email());
    }

    @Test
    void smtpCaidoNoImpideEliminarTallerNiCancelarOrdenes() throws Exception {
        Taller t = taller();
        OrdenServicio pendiente = orden(t, cliente(), EstadoOrden.PENDIENTE);
        smtpCaido();
        eliminarTaller(t);
        assertThat(mypes.findById(t.id()).orElseThrow().isActivo()).isFalse();
        assertThat(usuarios.findById(t.tecnico().id()).orElseThrow().isActivo()).isFalse();
        assertThat(ordenes.findById(pendiente.getId()).orElseThrow().getEstado()).isEqualTo(EstadoOrden.CANCELADA);
        assertThat(unicoCorreo().getAllRecipients()[0].toString()).isEqualTo(t.admin().email());
    }

    @Test
    void desactivarNoEnviaAntesDelCommitNiCuandoSeRevierte() {
        Cuenta c = cliente();
        var principal = principales.porId(c.id()).orElseThrow();
        tx.executeWithoutResult(estado -> {
            cuentas.desactivar(principal, new DesactivarCuenta(CLAVE));
            verify(correo, never()).send(any(MimeMessage.class));
            estado.setRollbackOnly();
        });
        assertThat(usuarios.findById(c.id()).orElseThrow().isActivo()).isTrue();
        verify(correo, never()).send(any(MimeMessage.class));
        tx.executeWithoutResult(estado -> {
            cuentas.desactivar(principal, new DesactivarCuenta(CLAVE));
            verify(correo, never()).send(any(MimeMessage.class));
        });
        verify(correo, times(1)).send(any(MimeMessage.class));
    }

    @Test
    void eliminarVencidasNoEnviaAntesDelCommitNiCuandoSeRevierte() {
        Cuenta c = clienteVencido();
        tx.executeWithoutResult(estado -> {
            cuentas.eliminarVencidas(LIMPIEZA);
            verify(correo, never()).send(any(MimeMessage.class));
            estado.setRollbackOnly();
        });
        assertThat(usuarios.findById(c.id()).orElseThrow().getEmail()).isEqualTo(c.email());
        verify(correo, never()).send(any(MimeMessage.class));
        tx.executeWithoutResult(estado -> {
            cuentas.eliminarVencidas(LIMPIEZA);
            verify(correo, never()).send(any(MimeMessage.class));
        });
        verify(correo, times(1)).send(any(MimeMessage.class));
    }

    @Test
    void eliminarTallerNoEnviaAntesDelCommitNiCuandoSeRevierte() {
        Taller t = taller();
        var principal = principales.porId(t.admin().id()).orElseThrow();
        tx.executeWithoutResult(estado -> {
            ajustes.eliminarCuenta(principal, new EliminarCuenta(CLAVE, "ELIMINAR"));
            verify(correo, never()).send(any(MimeMessage.class));
            estado.setRollbackOnly();
        });
        assertThat(mypes.findById(t.id()).orElseThrow().isActivo()).isTrue();
        verify(correo, never()).send(any(MimeMessage.class));
        tx.executeWithoutResult(estado -> {
            ajustes.eliminarCuenta(principal, new EliminarCuenta(CLAVE, "ELIMINAR"));
            verify(correo, never()).send(any(MimeMessage.class));
        });
        verify(correo, times(1)).send(any(MimeMessage.class));
    }

    private void smtpCaido() {
        doThrow(new MailSendException("SMTP apagado")).when(correo).send(any(MimeMessage.class));
    }

    private Cuenta clienteVencido() {
        Cuenta c = cliente();
        jdbc.update("UPDATE usuario SET activo = false WHERE id = ?", c.id());
        jdbc.update("UPDATE cliente SET desactivada_en = ? WHERE id = ?", LIMPIEZA.minusDays(31), c.clienteId());
        return c;
    }

    private Cuenta cliente() {
        return tx.execute(estado -> {
            Usuario u = usuario(Rol.CLIENTE);
            Cliente c = new Cliente();
            c.setUsuario(u);
            c.setDireccion("Calle privada 123");
            c.setReferencia("Referencia privada");
            c.setDistrito("Distrito privado");
            clientes.saveAndFlush(c);
            return new Cuenta(u.getId(), u.getEmail(), jwt.paraSesion(u), c.getId());
        });
    }

    private Taller taller() {
        return tx.execute(estado -> {
            Mype m = new Mype();
            m.setRazonSocial("Taller Ágil & Seguro");
            m.setRuc(String.valueOf(ThreadLocalRandom.current().nextLong(20_000_000_000L, 99_999_999_999L)));
            m.setDireccion("Jr. Pruebas 123");
            m.setDistrito("Lima");
            mypes.saveAndFlush(m);
            talleresCreados.add(m.getId());
            Usuario admin = usuario(Rol.ADMIN_MYPE);
            Administrador a = new Administrador();
            a.setUsuario(admin);
            a.setMype(m);
            administradores.save(a);
            Usuario tecnico = usuario(Rol.TECNICO);
            Tecnico t = new Tecnico();
            t.setUsuario(tecnico);
            t.setMype(m);
            tecnicos.save(t);
            return new Taller(m.getId(), new Cuenta(admin.getId(), admin.getEmail(), jwt.paraSesion(admin), null),
                    new Cuenta(tecnico.getId(), tecnico.getEmail(), jwt.paraSesion(tecnico), null));
        });
    }

    private Usuario usuario(Rol rol) {
        Usuario u = new Usuario();
        u.setNombres("Ángela");
        u.setApellidos("Prueba");
        u.setEmail("aviso.cuenta." + UUID.randomUUID() + "@correo.pe");
        u.setTelefono("912345678");
        u.setClaveHash(claves.encode(CLAVE));
        u.setRol(rol);
        usuarios.saveAndFlush(u);
        usuariosCreados.add(u.getId());
        return u;
    }

    private OrdenServicio orden(Taller t, Cuenta c, EstadoOrden estado) {
        return tx.execute(transaccion -> {
            OrdenServicio o = new OrdenServicio();
            o.setCodigo("ORD-A" + UUID.randomUUID().toString().substring(0, 10));
            o.setCliente(clientes.findById(c.clienteId()).orElseThrow());
            o.setMype(mypes.findById(t.id()).orElseThrow());
            if (estado != EstadoOrden.PENDIENTE) {
                o.setTecnico(tecnicos.findByMypeIdOrderByIdAsc(t.id()).getFirst());
            }
            o.setEspecialidad(Especialidad.SERVICIOS_HOGAR);
            o.setDescripcionFalla("Prueba del correo de cierre");
            o.setDireccion("Jr. Pruebas 123");
            o.setDistrito("Lima");
            o.setFechaProgramada(LocalDate.now().plusDays(1));
            o.setHoraProgramada(LocalTime.of(10, 0));
            o.setEstado(estado);
            ordenes.saveAndFlush(o);
            ordenesCreadas.add(o.getId());
            return o;
        });
    }

    private void eliminarTaller(Taller t) throws Exception {
        mvc.perform(post("/api/panel/ajustes/eliminar-cuenta")
                        .header("Authorization", "Bearer " + t.admin().token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("clave", CLAVE, "confirmacion", "ELIMINAR"))))
                .andExpect(status().isNoContent());
    }

    private MimeMessage unicoCorreo() {
        ArgumentCaptor<MimeMessage> captor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(correo, times(1)).send(captor.capture());
        return captor.getValue();
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
}
