package pe.techserv.cliente;

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
import org.springframework.transaction.support.TransactionTemplate;
import pe.techserv.BasePruebaIntegracion;
import pe.techserv.comun.Especialidad;
import pe.techserv.mype.MypeRepository;
import pe.techserv.mype.TecnicoRepository;
import pe.techserv.orden.EstadoOrden;
import pe.techserv.orden.OrdenHistorial;
import pe.techserv.orden.OrdenHistorialRepository;
import pe.techserv.orden.OrdenServicio;
import pe.techserv.orden.OrdenServicioRepository;
import pe.techserv.usuario.Cliente;
import pe.techserv.usuario.ClienteRepository;
import pe.techserv.usuario.UsuarioRepository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Los ajustes del cliente: editar sus datos, cambiar la contraseña, y
 * desactivar la cuenta, que se recupera entrando antes de un mes y, si no, se
 * elimina.
 *
 * Cada prueba registra SU PROPIO cliente: desactivar a Rosa, la de la semilla,
 * rompería las pruebas de las otras clases que entran con ella.
 */
@AutoConfigureMockMvc
class CuentaClienteTest extends BasePruebaIntegracion {

    private static final String CLAVE = "demo1234";
    private static final String RUC_DELGADO = "20601234567";

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;
    @Autowired TransactionTemplate tx;
    @Autowired ServicioCuentaCliente cuentas;
    @Autowired ClienteRepository clientes;
    @Autowired UsuarioRepository usuarios;
    @Autowired MypeRepository mypes;
    @Autowired TecnicoRepository tecnicos;
    @Autowired OrdenServicioRepository ordenes;
    @Autowired OrdenHistorialRepository historial;

    private record ClienteNuevo(Long usuarioId, String email, String token) {}

    // ───────────────────────────── datos ─────────────────────────────

    @Test
    @DisplayName("El cliente ve y edita sus datos; el correo no cambia")
    void editarDatos() throws Exception {
        ClienteNuevo c = registrar();

        mvc.perform(get("/api/mi-cuenta").header("Authorization", "Bearer " + c.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nombres").value("Lucía"))
                .andExpect(jsonPath("$.email").value(c.email()))
                .andExpect(jsonPath("$.direccion").doesNotExist());

        actualizar(c, """
                {"nombres": "Lucía María", "apellidos": "Vega Ruiz", "telefono": "912345678",
                 "direccion": "Jr. Pizarro 520", "referencia": "Frente a la plaza", "distrito": "Trujillo",
                 "email": "otro@correo.pe"}
                """)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nombres").value("Lucía María"))
                .andExpect(jsonPath("$.telefono").value("912345678"))
                .andExpect(jsonPath("$.direccion").value("Jr. Pizarro 520"))
                .andExpect(jsonPath("$.email").value(c.email()));

        // El nombre nuevo es el de su sesión.
        mvc.perform(get("/api/auth/yo").header("Authorization", "Bearer " + c.token()))
                .andExpect(jsonPath("$.nombreCompleto").value("Lucía María Vega Ruiz"));

        actualizar(c, """
                {"nombres": "Lucía", "apellidos": "Vega", "telefono": "044123456"}
                """)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.telefono").value("El celular tiene 9 dígitos y empieza por 9"));

        // Vaciar el celular y la dirección está permitido, como en el registro.
        actualizar(c, """
                {"nombres": "Lucía", "apellidos": "Vega", "telefono": "", "direccion": " "}
                """)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.telefono").doesNotExist())
                .andExpect(jsonPath("$.direccion").doesNotExist());
    }

    @Test
    @DisplayName("El cliente cambia su contraseña si sabe la actual")
    void cambiarClave() throws Exception {
        ClienteNuevo c = registrar();

        cambiarClave(c, "equivocada", "nueva12345")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensaje").value("La contraseña actual no es correcta"));
        cambiarClave(c, CLAVE, "nueva12345").andExpect(status().isNoContent());

        login(c.email(), CLAVE).andExpect(status().isBadRequest());
        login(c.email(), "nueva12345").andExpect(status().isOk());
    }

    @Test
    @DisplayName("Solo un cliente entra en /api/mi-cuenta")
    void soloElCliente() throws Exception {
        mvc.perform(get("/api/mi-cuenta")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/mi-cuenta")
                        .header("Authorization", "Bearer " + tokenDe("jorge@serviciosdelgado.pe", CLAVE)))
                .andExpect(status().isForbidden());
    }

    // ───────────────────────────── desactivar ─────────────────────────────

    @Test
    @DisplayName("Desactivar pide la contraseña")
    void desactivarPideLaClave() throws Exception {
        ClienteNuevo c = registrar();

        desactivar(c, "equivocada")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensaje").value("La contraseña no es correcta"));

        assertThat(usuarios.findById(c.usuarioId()).orElseThrow().isActivo()).isTrue();
        mvc.perform(get("/api/mi-cuenta").header("Authorization", "Bearer " + c.token()))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Desactivar cancela las visitas pendientes, cierra la sesión, y entrar antes de un mes la reactiva")
    void desactivarYReactivar() throws Exception {
        ClienteNuevo c = registrar();
        OrdenServicio pendiente = fabricarOrden(c, EstadoOrden.PENDIENTE);
        OrdenServicio confirmada = fabricarOrden(c, EstadoOrden.CONFIRMADA);
        OrdenServicio completada = fabricarOrden(c, EstadoOrden.COMPLETADA);

        String cuerpo = desactivar(c, CLAVE)
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        OffsetDateTime hasta = OffsetDateTime.parse(json.readTree(cuerpo).get("reactivableHasta").asText());
        assertThat(hasta).isBetween(OffsetDateTime.now().plusDays(29), OffsetDateTime.now().plusDays(31));

        assertThat(estadoDe(pendiente)).isEqualTo(EstadoOrden.CANCELADA);
        assertThat(estadoDe(confirmada)).isEqualTo(EstadoOrden.CANCELADA);
        assertThat(estadoDe(completada)).isEqualTo(EstadoOrden.COMPLETADA);
        List<OrdenHistorial> pasos = historial.findByOrdenIdOrderByOcurridoEnAsc(pendiente.getId());
        assertThat(pasos.get(pasos.size() - 1).getNota()).isEqualTo("El cliente desactivó su cuenta");

        // La sesión que tenía ya no vale.
        mvc.perform(get("/api/mi-cuenta").header("Authorization", "Bearer " + c.token()))
                .andExpect(status().isUnauthorized());
        // Con la contraseña mal, lo mismo que siempre: no se entera de nada.
        login(c.email(), "equivocada")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensaje").value("Correo o contraseña incorrectos"));

        // Entrar con la buena la reactiva, y se le dice.
        login(c.email(), CLAVE)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cuentaReactivada").value(true));
        assertThat(usuarios.findById(c.usuarioId()).orElseThrow().isActivo()).isTrue();
        assertThat(clienteDe(c).getDesactivadaEn()).isNull();
        // Lo cancelado se queda cancelado.
        assertThat(estadoDe(pendiente)).isEqualTo(EstadoOrden.CANCELADA);

        login(c.email(), CLAVE)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cuentaReactivada").value(false));
    }

    @Test
    @DisplayName("Con una visita en camino no se puede desactivar, y no se cancela nada")
    void desactivarConVisitaEnCursoDa409() throws Exception {
        ClienteNuevo c = registrar();
        OrdenServicio pendiente = fabricarOrden(c, EstadoOrden.PENDIENTE);
        OrdenServicio enCamino = fabricarOrden(c, EstadoOrden.EN_CAMINO);

        desactivar(c, CLAVE)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.mensaje").value(containsString(enCamino.getCodigo())));

        assertThat(estadoDe(pendiente)).isEqualTo(EstadoOrden.PENDIENTE);
        assertThat(estadoDe(enCamino)).isEqualTo(EstadoOrden.EN_CAMINO);
        assertThat(usuarios.findById(c.usuarioId()).orElseThrow().isActivo()).isTrue();
        assertThat(clienteDe(c).getDesactivadaEn()).isNull();
    }

    @Test
    @DisplayName("Pasado un mes sin volver, ya no se reactiva y la limpieza borra sus datos y libera el correo")
    void pasadoUnMesSeElimina() throws Exception {
        ClienteNuevo vencido = registrar();
        ClienteNuevo reciente = registrar();
        OrdenServicio orden = fabricarOrden(vencido, EstadoOrden.COMPLETADA);
        desactivar(vencido, CLAVE).andExpect(status().isOk());
        desactivar(reciente, CLAVE).andExpect(status().isOk());

        Long idVencido = clienteDe(vencido).getId();
        Long idReciente = clienteDe(reciente).getId();
        jdbc.update("UPDATE cliente SET desactivada_en = NOW(6) - INTERVAL 31 DAY WHERE id = ?", idVencido);
        jdbc.update("UPDATE cliente SET desactivada_en = NOW(6) - INTERVAL 10 DAY WHERE id = ?", idReciente);

        // Aunque la limpieza de esta noche aún no haya pasado, el plazo venció.
        login(vencido.email(), CLAVE)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensaje").value("Correo o contraseña incorrectos"));

        cuentas.eliminarVencidas(OffsetDateTime.now());

        tx.executeWithoutResult(estado -> {
            Cliente c = clientes.findById(idVencido).orElseThrow();
            assertThat(c.getEliminadaEn()).isNotNull();
            assertThat(c.getDireccion()).isNull();
            assertThat(c.getUsuario().isActivo()).isFalse();
            assertThat(c.getUsuario().getNombreCompleto()).isEqualTo("Cliente eliminado");
            assertThat(c.getUsuario().getTelefono()).isNull();
            assertThat(c.getUsuario().getEmail()).startsWith("eliminado-").endsWith("@techserv.invalid");

            // La orden sigue en el historial del taller, sin datos de quién la pidió.
            OrdenServicio o = ordenes.findById(orden.getId()).orElseThrow();
            assertThat(o.getEstado()).isEqualTo(EstadoOrden.COMPLETADA);
            assertThat(o.getCliente().getUsuario().getNombreCompleto()).isEqualTo("Cliente eliminado");

            // La de hace diez días sigue esperando a que vuelva.
            Cliente r = clientes.findById(idReciente).orElseThrow();
            assertThat(r.getEliminadaEn()).isNull();
            assertThat(r.getUsuario().getEmail()).isEqualTo(reciente.email());
        });

        // El correo quedó libre.
        assertThat(usuarios.existsByEmailIgnoreCase(vencido.email())).isFalse();
        registrarCon(vencido.email()).andExpect(status().isCreated());

        // Y la de hace diez días todavía se recupera.
        login(reciente.email(), CLAVE)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cuentaReactivada").value(true));

        // Una segunda pasada no vuelve a tocar la eliminada.
        cuentas.eliminarVencidas(OffsetDateTime.now());
        assertThat(clientes.findById(idVencido).orElseThrow().getEliminadaEn()).isNotNull();
    }

    @Test
    @DisplayName("Un técnico o un taller dado de baja no se reactiva al entrar")
    void soloElClienteSeReactiva() throws Exception {
        String email = "tecnico.baja." + UUID.randomUUID() + "@taller.pe";
        Long usuarioId = tx.execute(estado -> {
            var t = tecnicos.findAll().stream().filter(x -> x.getUsuario().isActivo()).findFirst().orElseThrow();
            return t.getUsuario().getId();
        });
        // Un usuario inactivo con la contraseña de la semilla: el login no lo deja entrar.
        String original = jdbc.queryForObject("SELECT email FROM usuario WHERE id = ?", String.class, usuarioId);
        try {
            jdbc.update("UPDATE usuario SET activo = false, email = ? WHERE id = ?", email, usuarioId);
            login(email, CLAVE)
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.mensaje").value("Correo o contraseña incorrectos"));
            assertThat(usuarios.findById(usuarioId).orElseThrow().isActivo()).isFalse();
        } finally {
            jdbc.update("UPDATE usuario SET activo = true, email = ? WHERE id = ?", original, usuarioId);
        }
    }

    // ───────────────────────────── auxiliares ─────────────────────────────

    private ClienteNuevo registrar() throws Exception {
        String email = "cliente." + UUID.randomUUID() + "@correo.pe";
        String cuerpo = registrarCon(email)
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        JsonNode sesion = json.readTree(cuerpo);
        return new ClienteNuevo(sesion.get("usuario").get("id").asLong(), email, sesion.get("token").asText());
    }

    private ResultActions registrarCon(String email) throws Exception {
        return mvc.perform(post("/api/auth/registro/cliente")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                         {"nombres": "Lucía", "apellidos": "Vega", "email": "%s", "clave": "%s",
                          "telefono": "987654321"}
                         """.formatted(email, CLAVE)));
    }

    private ResultActions actualizar(ClienteNuevo c, String cuerpo) throws Exception {
        return mvc.perform(put("/api/mi-cuenta")
                .header("Authorization", "Bearer " + c.token())
                .contentType(MediaType.APPLICATION_JSON)
                .content(cuerpo));
    }

    private ResultActions cambiarClave(ClienteNuevo c, String actual, String nueva) throws Exception {
        return mvc.perform(put("/api/mi-cuenta/clave")
                .header("Authorization", "Bearer " + c.token())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                         {"claveActual": "%s", "claveNueva": "%s"}
                         """.formatted(actual, nueva)));
    }

    private ResultActions desactivar(ClienteNuevo c, String clave) throws Exception {
        return mvc.perform(post("/api/mi-cuenta/desactivar")
                .header("Authorization", "Bearer " + c.token())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                         {"clave": "%s"}
                         """.formatted(clave)));
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

    private Cliente clienteDe(ClienteNuevo c) {
        return clientes.findByUsuarioId(c.usuarioId()).orElseThrow();
    }

    private EstadoOrden estadoDe(OrdenServicio orden) {
        return ordenes.findById(orden.getId()).orElseThrow().getEstado();
    }

    /** Una orden de este cliente en Delgado, en el estado pedido. */
    private OrdenServicio fabricarOrden(ClienteNuevo c, EstadoOrden estado) {
        Long mypeId = mypes.findAll().stream().filter(m -> RUC_DELGADO.equals(m.getRuc()))
                .findFirst().orElseThrow().getId();
        OrdenServicio orden = new OrdenServicio();
        orden.setCodigo("ORD-C" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase());
        orden.setCliente(clienteDe(c));
        orden.setMype(mypes.findById(mypeId).orElseThrow());
        if (estado != EstadoOrden.PENDIENTE) {
            orden.setTecnico(tecnicos.findByMypeIdOrderByIdAsc(mypeId).get(0));
        }
        orden.setEspecialidad(Especialidad.REPARACION_ELECTRODOMESTICOS);
        orden.setDescripcionFalla("Falla de prueba de la cuenta del cliente");
        orden.setDireccion("Jr. Pizarro 520");
        orden.setDistrito("Trujillo");
        orden.setFechaProgramada(LocalDate.now().plusDays(3));
        orden.setHoraProgramada(LocalTime.of(10, 0));
        orden.setEstado(estado);
        return ordenes.save(orden);
    }
}
