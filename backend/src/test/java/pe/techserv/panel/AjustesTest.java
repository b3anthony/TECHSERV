package pe.techserv.panel;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import pe.techserv.BasePruebaIntegracion;
import pe.techserv.comun.Especialidad;
import pe.techserv.mype.Mype;
import pe.techserv.mype.MypeRepository;
import pe.techserv.mype.TecnicoRepository;
import pe.techserv.orden.EstadoOrden;
import pe.techserv.orden.OrdenHistorialRepository;
import pe.techserv.orden.OrdenServicio;
import pe.techserv.orden.OrdenServicioRepository;
import pe.techserv.usuario.ClienteRepository;
import pe.techserv.usuario.UsuarioRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Los ajustes del taller y las reglas que llegaron con ellos: una especialidad
 * por taller, el horario de atención, los métodos de pago, el tope de técnicos,
 * las estrellas de cada técnico y cerrar la cuenta.
 *
 * Cada prueba que escribe registra SU PROPIO taller: las clases comparten la
 * base, y tocar la cuenta, el horario o el equipo de Delgado cambiaría lo que
 * miden las demás.
 */
@AutoConfigureMockMvc
class AjustesTest extends BasePruebaIntegracion {

    private static final String CLAVE = "demo1234";
    private static final String CLIENTE = "rosa.chavez@correo.pe";
    private static final String ADMIN_DELGADO = "jorge@serviciosdelgado.pe";
    private static final String ADMIN_TECNOHOGAR = "silvia@tecnohogar.pe";

    /** Lunes a sábado, de 8:00 a 18:00. */
    private static final String HORARIO_SEMANA = """
            [{"dia":1,"abre":"08:00","cierra":"18:00"},{"dia":2,"abre":"08:00","cierra":"18:00"},
             {"dia":3,"abre":"08:00","cierra":"18:00"},{"dia":4,"abre":"08:00","cierra":"18:00"},
             {"dia":5,"abre":"08:00","cierra":"18:00"},{"dia":6,"abre":"08:00","cierra":"18:00"}]
            """;

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;
    @Autowired MypeRepository mypes;
    @Autowired TecnicoRepository tecnicos;
    @Autowired UsuarioRepository usuarios;
    @Autowired ClienteRepository clientes;
    @Autowired OrdenServicioRepository ordenes;
    @Autowired OrdenHistorialRepository historial;

    /** Un taller recién registrado, con su administrador. */
    private record Taller(Long mypeId, String email, String token) {}

    // ───────────────────────────── registro ─────────────────────────────

    @Test
    @DisplayName("El registro guarda una especialidad, el horario y los cuatro métodos de pago")
    void registroConUnaEspecialidadYHorario() throws Exception {
        Taller t = registrar(HORARIO_SEMANA);

        mvc.perform(get("/api/panel/ajustes").header("Authorization", "Bearer " + t.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cuenta.email").value(t.email()))
                .andExpect(jsonPath("$.especialidad.especialidad").value("SERVICIOS_HOGAR"))
                .andExpect(jsonPath("$.especialidad.tarifaBase").value(55.00))
                .andExpect(jsonPath("$.horarios", hasSize(6)))
                .andExpect(jsonPath("$.horarios[0].dia").value(1))
                .andExpect(jsonPath("$.horarios[0].abre").value("08:00"))
                .andExpect(jsonPath("$.horarios[0].cierra").value("18:00"))
                .andExpect(jsonPath("$.metodosPago", hasSize(4)));
    }

    @Test
    @DisplayName("Un horario en el que no cabe ninguna visita se rechaza, y no deja usuario a medias")
    void registroSinFranjaPosibleDa400() throws Exception {
        String email = "noche." + UUID.randomUUID() + "@taller.pe";
        registrarCon(email, rucNuevo(), """
                [{"dia":1,"abre":"18:00","cierra":"22:00"}]
                """)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensaje").value(containsString("no cabe ninguna visita")));

        assertThat(usuarios.existsByEmailIgnoreCase(email)).isFalse();
    }

    @Test
    @DisplayName("Un día repetido o que cierra antes de abrir se rechaza")
    void registroConHorarioIncoherenteDa400() throws Exception {
        registrarCon("repetido." + UUID.randomUUID() + "@taller.pe", rucNuevo(), """
                [{"dia":1,"abre":"08:00","cierra":"12:00"},{"dia":1,"abre":"14:00","cierra":"18:00"}]
                """)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensaje").value("El lunes aparece dos veces en el horario"));

        registrarCon("alreves." + UUID.randomUUID() + "@taller.pe", rucNuevo(), """
                [{"dia":2,"abre":"12:00","cierra":"08:00"}]
                """)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensaje").value(containsString("posterior a la de apertura")));
    }

    // ───────────────────────────── horario y agenda ─────────────────────────────

    @Test
    @DisplayName("La agenda solo ofrece las franjas del horario, y fuera de él no se puede reservar")
    void laAgendaRespetaElHorario() throws Exception {
        // Solo los lunes, de 9:00 a 11:00: caben las franjas de las 9 y las 10.
        Taller t = registrar("""
                [{"dia":1,"abre":"09:00","cierra":"11:00"}]
                """);
        altaTecnico(t, "unico." + UUID.randomUUID() + "@taller.pe").andExpect(status().isCreated());

        LocalDate lunes = LocalDate.now().with(TemporalAdjusters.next(DayOfWeek.MONDAY));
        LocalDate martes = lunes.plusDays(1);

        mvc.perform(get("/api/catalogo/mypes/{id}/agenda", t.mypeId()).param("fecha", lunes.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.franjas", hasSize(2)))
                .andExpect(jsonPath("$.franjas[0].hora").value(containsString("09:00")))
                .andExpect(jsonPath("$.franjas[1].hora").value(containsString("10:00")));

        mvc.perform(get("/api/catalogo/mypes/{id}/agenda", t.mypeId()).param("fecha", martes.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.franjas", hasSize(0)));

        reservar(t.mypeId(), martes, "10:00")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensaje").value("El taller no atiende ese día a esa hora"));
        reservar(t.mypeId(), lunes, "14:00")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensaje").value("El taller no atiende ese día a esa hora"));
        reservar(t.mypeId(), lunes, "10:00").andExpect(status().isCreated());
    }

    @Test
    @DisplayName("El horario se cambia desde ajustes, con la misma validación que en el registro")
    void cambiarHorario() throws Exception {
        Taller t = registrar(HORARIO_SEMANA);

        mvc.perform(put("/api/panel/ajustes/horario")
                        .header("Authorization", "Bearer " + t.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                 {"horarios": [{"dia":7,"abre":"09:00","cierra":"13:00"},
                                               {"dia":3,"abre":"14:00","cierra":"17:30"}]}
                                 """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.horarios", hasSize(2)))
                .andExpect(jsonPath("$.horarios[0].dia").value(3))
                .andExpect(jsonPath("$.horarios[1].dia").value(7))
                .andExpect(jsonPath("$.horarios[0].cierra").value("17:30"));

        mvc.perform(put("/api/panel/ajustes/horario")
                        .header("Authorization", "Bearer " + t.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                 {"horarios": []}
                                 """))
                .andExpect(status().isBadRequest());
    }

    // ───────────────────────────── equipo ─────────────────────────────

    @Test
    @DisplayName("Un taller tiene como máximo 10 técnicos; al quitar uno, cabe otro")
    void topeDeDiezTecnicos() throws Exception {
        Taller t = registrar(HORARIO_SEMANA);
        String prefijo = UUID.randomUUID().toString().substring(0, 8);

        Long primero = null;
        for (int i = 1; i <= ServicioAdministracion.MAXIMO_TECNICOS; i++) {
            String cuerpo = altaTecnico(t, "t" + i + "." + prefijo + "@taller.pe")
                    .andExpect(status().isCreated())
                    // Sin especialidades en la petición: atiende la del taller.
                    .andExpect(jsonPath("$.especialidades[0]").value("SERVICIOS_HOGAR"))
                    .andReturn().getResponse().getContentAsString();
            if (primero == null) {
                primero = json.readTree(cuerpo).get("id").asLong();
            }
        }

        altaTecnico(t, "t11." + prefijo + "@taller.pe")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.mensaje").value(containsString("el máximo por taller")));
        assertThat(tecnicos.countByMypeIdAndUsuarioActivoTrue(t.mypeId())).isEqualTo(10);

        mvc.perform(delete("/api/panel/tecnicos/{id}", primero)
                        .header("Authorization", "Bearer " + t.token()))
                .andExpect(status().isNoContent());

        altaTecnico(t, "t11." + prefijo + "@taller.pe").andExpect(status().isCreated());
    }

    @Test
    @DisplayName("Cada técnico trae el promedio y el número de sus calificaciones reales")
    void estrellasDelTecnico() throws Exception {
        Long luis = tecnicos.findByUsuarioEmailIgnoreCase("luis.ramirez@serviciosdelgado.pe").orElseThrow().getId();

        Map<String, Object> real = jdbc.queryForMap("""
                SELECT AVG(c.puntaje) AS promedio, COUNT(c.id) AS total
                  FROM calificacion c JOIN orden_servicio o ON o.id = c.orden_id
                 WHERE o.tecnico_id = ?
                """, luis);
        long total = ((Number) real.get("total")).longValue();
        assertThat(total).as("la semilla deja calificaciones a Luis").isPositive();
        double promedio = new BigDecimal(real.get("promedio").toString())
                .setScale(1, RoundingMode.HALF_UP).doubleValue();

        mvc.perform(get("/api/panel/tecnicos").header("Authorization", "Bearer " + tokenDe(ADMIN_DELGADO, CLAVE)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id==%d)].promedio".formatted(luis)).value(promedio))
                .andExpect(jsonPath("$[?(@.id==%d)].calificaciones".formatted(luis)).value((int) total));

        // Un técnico nuevo no tiene promedio: no se inventa un 0.
        Taller t = registrar(HORARIO_SEMANA);
        altaTecnico(t, "sin.notas." + UUID.randomUUID() + "@taller.pe").andExpect(status().isCreated());
        mvc.perform(get("/api/panel/tecnicos").header("Authorization", "Bearer " + t.token()))
                .andExpect(jsonPath("$[0].promedio").doesNotExist())
                .andExpect(jsonPath("$[0].calificaciones").value(0));
    }

    // ───────────────────────────── métodos de pago ─────────────────────────────

    @Test
    @DisplayName("Solo se puede cobrar con un método que el taller acepta")
    void losMetodosDePagoRestringenElCobro() throws Exception {
        Taller t = registrar(HORARIO_SEMANA);
        altaTecnico(t, "cobrador." + UUID.randomUUID() + "@taller.pe").andExpect(status().isCreated());

        mvc.perform(put("/api/panel/ajustes/metodos-pago")
                        .header("Authorization", "Bearer " + t.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                 {"metodos": ["YAPE"]}
                                 """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.metodosPago", hasSize(1)))
                .andExpect(jsonPath("$.metodosPago[0]").value("YAPE"));

        OrdenServicio orden = fabricarOrden(t.mypeId(), EstadoOrden.COMPLETADA);

        pagar(t, orden, "EFECTIVO")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensaje").value("El taller no acepta pagos con Efectivo"));
        pagar(t, orden, "YAPE").andExpect(status().isOk());

        mvc.perform(put("/api/panel/ajustes/metodos-pago")
                        .header("Authorization", "Bearer " + t.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                 {"metodos": []}
                                 """))
                .andExpect(status().isBadRequest());
    }

    // ───────────────────────────── cuenta ─────────────────────────────

    @Test
    @DisplayName("El administrador cambia su celular y su contraseña")
    void cambiarCelularYClave() throws Exception {
        Taller t = registrar(HORARIO_SEMANA);

        mvc.perform(put("/api/panel/ajustes/cuenta")
                        .header("Authorization", "Bearer " + t.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                 {"nombres": "Ana María", "apellidos": "Prueba", "telefono": "912345678"}
                                 """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cuenta.telefono").value("912345678"))
                .andExpect(jsonPath("$.cuenta.nombres").value("Ana María"));

        mvc.perform(put("/api/panel/ajustes/cuenta")
                        .header("Authorization", "Bearer " + t.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                 {"nombres": "Ana", "apellidos": "Prueba", "telefono": "12345"}
                                 """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.telefono").exists());

        cambiarClave(t, "equivocada", "nueva-clave-123")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensaje").value("La contraseña actual no es correcta"));
        cambiarClave(t, CLAVE, "nueva-clave-123").andExpect(status().isNoContent());

        login(t.email(), CLAVE).andExpect(status().isBadRequest());
        login(t.email(), "nueva-clave-123").andExpect(status().isOk());
    }

    @Test
    @DisplayName("Los ajustes son del taller de la sesión: Silvia ve TecnoHogar, no Delgado")
    void ajustesAisladosPorTaller() throws Exception {
        mvc.perform(get("/api/panel/ajustes").header("Authorization", "Bearer " + tokenDe(ADMIN_TECNOHOGAR, CLAVE)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.negocio.ruc").value("20609876543"))
                .andExpect(jsonPath("$.cuenta.email").value(ADMIN_TECNOHOGAR));
    }

    @Test
    @DisplayName("Un cliente no entra a los ajustes del panel")
    void clienteNoEntraAAjustes() throws Exception {
        mvc.perform(get("/api/panel/ajustes").header("Authorization", "Bearer " + tokenDe(CLIENTE, CLAVE)))
                .andExpect(status().isForbidden());
    }

    // ───────────────────────────── eliminar cuenta ─────────────────────────────

    @Test
    @DisplayName("Cerrar la cuenta pide la contraseña y la palabra ELIMINAR")
    void eliminarCuentaPideConfirmacion() throws Exception {
        Taller t = registrar(HORARIO_SEMANA);

        eliminar(t, "equivocada", "ELIMINAR")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensaje").value("La contraseña no es correcta"));
        eliminar(t, CLAVE, "borrar")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensaje").value("Escribe ELIMINAR para confirmar"));

        assertThat(mypes.findById(t.mypeId()).orElseThrow().isActivo()).isTrue();
    }

    @Test
    @DisplayName("Con una visita en curso no se cierra la cuenta, y no se cancela nada")
    void eliminarCuentaConVisitaEnCursoDa409() throws Exception {
        Taller t = registrar(HORARIO_SEMANA);
        altaTecnico(t, "encamino." + UUID.randomUUID() + "@taller.pe").andExpect(status().isCreated());
        OrdenServicio enCamino = fabricarOrden(t.mypeId(), EstadoOrden.EN_CAMINO);
        OrdenServicio pendiente = fabricarOrden(t.mypeId(), EstadoOrden.PENDIENTE);

        eliminar(t, CLAVE, "ELIMINAR")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.mensaje").value(containsString(enCamino.getCodigo())));

        // La cancelación de la pendiente se deshizo junto con todo lo demás.
        assertThat(ordenes.findById(pendiente.getId()).orElseThrow().getEstado()).isEqualTo(EstadoOrden.PENDIENTE);
        assertThat(mypes.findById(t.mypeId()).orElseThrow().isActivo()).isTrue();
        login(t.email(), CLAVE).andExpect(status().isOk());
    }

    @Test
    @DisplayName("Cerrar la cuenta: cancela lo pendiente, saca al taller del catálogo y da de baja al equipo")
    void eliminarCuenta() throws Exception {
        Taller t = registrar(HORARIO_SEMANA);
        String correoTecnico = "baja." + UUID.randomUUID() + "@taller.pe";
        altaTecnico(t, correoTecnico).andExpect(status().isCreated());
        Long tecnicoUsuarioId = tecnicos.findByUsuarioEmailIgnoreCase(correoTecnico).orElseThrow().getUsuario().getId();
        OrdenServicio pendiente = fabricarOrden(t.mypeId(), EstadoOrden.PENDIENTE);
        OrdenServicio cerrada = fabricarOrden(t.mypeId(), EstadoOrden.COMPLETADA);

        eliminar(t, CLAVE, "eliminar").andExpect(status().isNoContent());

        // La orden pendiente queda cancelada y lo dice su historial; la cerrada no se toca.
        assertThat(ordenes.findById(pendiente.getId()).orElseThrow().getEstado()).isEqualTo(EstadoOrden.CANCELADA);
        assertThat(historial.findByOrdenIdOrderByOcurridoEnAsc(pendiente.getId()))
                .anyMatch(p -> p.getEstadoNuevo() == EstadoOrden.CANCELADA
                        && "El taller cerró su cuenta en TechServ".equals(p.getNota()));
        assertThat(ordenes.findById(cerrada.getId()).orElseThrow().getEstado()).isEqualTo(EstadoOrden.COMPLETADA);

        // Fuera del catálogo.
        Mype taller = mypes.findById(t.mypeId()).orElseThrow();
        assertThat(taller.isActivo()).isFalse();
        mvc.perform(get("/api/catalogo/mypes/{id}/agenda", t.mypeId())
                        .param("fecha", LocalDate.now().plusDays(3).toString()))
                .andExpect(status().isNotFound());

        // El administrador ya no entra, ni con la sesión que tenía abierta.
        login(t.email(), CLAVE).andExpect(status().isBadRequest());
        mvc.perform(get("/api/panel/ajustes").header("Authorization", "Bearer " + t.token()))
                .andExpect(status().isUnauthorized());

        // El técnico queda de baja y su correo libre: puede volver a usarse.
        var usuarioTecnico = usuarios.findById(tecnicoUsuarioId).orElseThrow();
        assertThat(usuarioTecnico.isActivo()).isFalse();
        assertThat(usuarioTecnico.getEmail()).startsWith("baja-").endsWith("@techserv.invalid");
        assertThat(usuarios.existsByEmailIgnoreCase(correoTecnico)).isFalse();
        assertThat(usuarios.existsByEmailIgnoreCase(t.email())).isFalse();
    }

    // ───────────────────────────── auxiliares ─────────────────────────────

    private Taller registrar(String horarios) throws Exception {
        String email = "admin." + UUID.randomUUID() + "@taller.pe";
        String cuerpo = registrarCon(email, rucNuevo(), horarios)
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        JsonNode sesion = json.readTree(cuerpo);
        return new Taller(sesion.get("usuario").get("mypeId").asLong(), email, sesion.get("token").asText());
    }

    private ResultActions registrarCon(String email, String ruc, String horarios) throws Exception {
        return mvc.perform(post("/api/auth/registro/negocio")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                         {
                           "nombres": "Ana", "apellidos": "Prueba",
                           "email": "%s", "clave": "%s", "telefono": "987654321",
                           "razonSocial": "Taller de prueba", "ruc": "%s",
                           "direccion": "Av. Larco 100", "distrito": "Trujillo",
                           "especialidad": "SERVICIOS_HOGAR", "tarifaBase": 55.00,
                           "horarios": %s
                         }
                         """.formatted(email, CLAVE, ruc, horarios)));
    }

    /** Un RUC de 11 dígitos que no choca con la semilla (esa empieza por 206). */
    private static String rucNuevo() {
        return "10" + String.format("%09d", ThreadLocalRandom.current().nextLong(1_000_000_000L));
    }

    private ResultActions altaTecnico(Taller t, String email) throws Exception {
        return mvc.perform(post("/api/panel/tecnicos")
                .header("Authorization", "Bearer " + t.token())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                         {"nombres": "Téc", "apellidos": "Nico", "email": "%s", "telefono": ""}
                         """.formatted(email)));
    }

    private ResultActions reservar(Long mypeId, LocalDate fecha, String hora) throws Exception {
        return mvc.perform(post("/api/mis-ordenes")
                .header("Authorization", "Bearer " + tokenDe(CLIENTE, CLAVE))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                         {
                           "mypeId": %d, "especialidad": "SERVICIOS_HOGAR",
                           "descripcionFalla": "Se cortó la luz en la cocina",
                           "direccion": "Urb. Primavera, Mz. C Lt. 14", "distrito": "Trujillo",
                           "fecha": "%s", "hora": "%s", "metodoPago": "EFECTIVO"
                         }
                         """.formatted(mypeId, fecha, hora)));
    }

    private ResultActions pagar(Taller t, OrdenServicio orden, String metodo) throws Exception {
        return mvc.perform(post("/api/panel/ordenes/{id}/pago", orden.getId())
                .header("Authorization", "Bearer " + t.token())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                         {"metodo": "%s"}
                         """.formatted(metodo)));
    }

    private ResultActions cambiarClave(Taller t, String actual, String nueva) throws Exception {
        return mvc.perform(put("/api/panel/ajustes/clave")
                .header("Authorization", "Bearer " + t.token())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                         {"claveActual": "%s", "claveNueva": "%s"}
                         """.formatted(actual, nueva)));
    }

    private ResultActions eliminar(Taller t, String clave, String confirmacion) throws Exception {
        return mvc.perform(post("/api/panel/ajustes/eliminar-cuenta")
                .header("Authorization", "Bearer " + t.token())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                         {"clave": "%s", "confirmacion": "%s"}
                         """.formatted(clave, confirmacion)));
    }

    private ResultActions login(String email, String clave) throws Exception {
        return mvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                         {"email": "%s", "clave": "%s"}
                         """.formatted(email, clave)));
    }

    private String tokenDe(String email, String clave) throws Exception {
        String cuerpo = login(email, clave).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return json.readTree(cuerpo).get("token").asText();
    }

    /** Una orden del taller en el estado pedido, con el primer técnico del taller. */
    private OrdenServicio fabricarOrden(Long mypeId, EstadoOrden estado) {
        OrdenServicio orden = new OrdenServicio();
        orden.setCodigo("ORD-A" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase());
        orden.setCliente(clientes.findAll().stream().findFirst().orElseThrow());
        orden.setMype(mypes.findById(mypeId).orElseThrow());
        if (estado != EstadoOrden.PENDIENTE) {
            orden.setTecnico(tecnicos.findByMypeIdOrderByIdAsc(mypeId).stream().findFirst().orElseThrow());
        }
        orden.setEspecialidad(Especialidad.SERVICIOS_HOGAR);
        orden.setDescripcionFalla("Falla de prueba para ajustes");
        orden.setDireccion("Calle Las Palmeras 123");
        orden.setDistrito("Trujillo");
        orden.setFechaProgramada(LocalDate.now().plusDays(2));
        orden.setHoraProgramada(LocalTime.of(10, 0));
        orden.setEstado(estado);
        if (estado == EstadoOrden.COMPLETADA) {
            orden.setPrecioManoObra(new BigDecimal("40.00"));
            orden.setTotal(new BigDecimal("40.00"));
        }
        orden.setCreadaEn(OffsetDateTime.now());
        orden.setActualizadaEn(OffsetDateTime.now());
        return ordenes.save(orden);
    }
}
