package pe.techserv.reserva;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import pe.techserv.BasePruebaIntegracion;
import pe.techserv.mype.TecnicoRepository;
import pe.techserv.orden.EstadoOrden;
import pe.techserv.orden.OrdenServicio;
import pe.techserv.orden.OrdenServicioRepository;
import pe.techserv.pago.MetodoPago;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * El paso 5 de la reserva: el cliente elige cómo va a pagar entre los métodos
 * que acepta el taller, y eso queda en la orden.
 *
 * Cada prueba registra su propio taller: cambiar los métodos de Delgado
 * cambiaría lo que ven las demás clases.
 */
@AutoConfigureMockMvc
class MetodoPagoReservaTest extends BasePruebaIntegracion {

    private static final String CLAVE = "demo1234";
    private static final String CLIENTE = "rosa.chavez@correo.pe";
    private static final String TODA_LA_SEMANA = """
            [{"dia":1,"abre":"08:00","cierra":"18:00"},{"dia":2,"abre":"08:00","cierra":"18:00"},
             {"dia":3,"abre":"08:00","cierra":"18:00"},{"dia":4,"abre":"08:00","cierra":"18:00"},
             {"dia":5,"abre":"08:00","cierra":"18:00"},{"dia":6,"abre":"08:00","cierra":"18:00"},
             {"dia":7,"abre":"08:00","cierra":"18:00"}]
            """;

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired OrdenServicioRepository ordenes;
    @Autowired TecnicoRepository tecnicos;

    private record Taller(Long mypeId, String token) {}

    @Test
    @DisplayName("El catálogo dice qué métodos acepta cada taller")
    void elCatalogoMuestraLosMetodos() throws Exception {
        Taller t = registrarTaller();
        String filtro = "$[?(@.id == %d)].metodosPago".formatted(t.mypeId());

        mvc.perform(get("/api/catalogo/mypes").param("especialidad", "SERVICIOS_HOGAR"))
                .andExpect(status().isOk())
                .andExpect(jsonPath(filtro).value(hasItem(contains("EFECTIVO", "YAPE", "PLIN", "TRANSFERENCIA"))));

        aceptar(t, "\"PLIN\", \"YAPE\"");

        mvc.perform(get("/api/catalogo/mypes").param("especialidad", "SERVICIOS_HOGAR"))
                .andExpect(jsonPath(filtro).value(hasItem(contains("YAPE", "PLIN"))));
    }

    @Test
    @DisplayName("Reservar exige un método de pago que el taller acepte, y lo guarda en la orden")
    void reservarConMetodoDePago() throws Exception {
        Taller t = registrarTaller();
        aceptar(t, "\"YAPE\", \"PLIN\"");
        LocalDate fecha = LocalDate.now().plusDays(2);

        reservar(t, fecha, "08:00", null)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.metodoPago").value("Elige cómo vas a pagar"));
        reservar(t, fecha, "08:00", "EFECTIVO")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensaje").value("Ese taller no acepta pagos con Efectivo"));

        String cuerpo = reservar(t, fecha, "08:00", "PLIN")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.metodoPago").value("PLIN"))
                .andReturn().getResponse().getContentAsString();
        Long id = json.readTree(cuerpo).get("id").asLong();
        assertThat(ordenes.findById(id).orElseThrow().getMetodoPago()).isEqualTo(MetodoPago.PLIN);

        // El taller lo ve en el detalle de la orden.
        mvc.perform(get("/api/panel/ordenes/{id}", id).header("Authorization", "Bearer " + t.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.metodoPago").value("PLIN"));
    }

    @Test
    @DisplayName("Lo que eligió el cliente se respeta aunque el taller deje de aceptarlo después")
    void elMetodoElegidoSobreviveAlCambioDelTaller() throws Exception {
        Taller t = registrarTaller();
        String cuerpo = reservar(t, LocalDate.now().plusDays(3), "09:00", "PLIN")
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        Long id = json.readTree(cuerpo).get("id").asLong();

        aceptar(t, "\"YAPE\"");
        OrdenServicio orden = ordenes.findById(id).orElseThrow();
        orden.setTecnico(tecnicos.findByMypeIdOrderByIdAsc(t.mypeId()).get(0));
        orden.setEstado(EstadoOrden.COMPLETADA);
        orden.setPrecioManoObra(new BigDecimal("55.00"));
        orden.setTotal(new BigDecimal("55.00"));
        ordenes.save(orden);

        pagar(t, id, "EFECTIVO")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensaje").value("El taller no acepta pagos con Efectivo"));
        pagar(t, id, "PLIN").andExpect(status().isOk());
    }

    // ───────────────────────────── auxiliares ─────────────────────────────

    private Taller registrarTaller() throws Exception {
        String email = "pagos." + UUID.randomUUID() + "@taller.pe";
        String ruc = "10" + String.format("%09d", ThreadLocalRandom.current().nextLong(1_000_000_000L));
        String cuerpo = mvc.perform(post("/api/auth/registro/negocio")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                 {
                                   "nombres": "Ana", "apellidos": "Prueba",
                                   "email": "%s", "clave": "%s", "telefono": "987654321",
                                   "razonSocial": "Taller de pagos", "ruc": "%s",
                                   "direccion": "Av. Larco 100", "distrito": "Trujillo",
                                   "especialidad": "SERVICIOS_HOGAR", "tarifaBase": 55.00,
                                   "horarios": %s
                                 }
                                 """.formatted(email, CLAVE, ruc, TODA_LA_SEMANA)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        JsonNode sesion = json.readTree(cuerpo);
        Taller t = new Taller(sesion.get("usuario").get("mypeId").asLong(), sesion.get("token").asText());

        // Sin técnicos no hay cupo, y sin cupo no se puede reservar.
        mvc.perform(post("/api/panel/tecnicos")
                        .header("Authorization", "Bearer " + t.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                 {"nombres": "Téc", "apellidos": "Nico", "email": "tec.%s", "telefono": ""}
                                 """.formatted(email)))
                .andExpect(status().isCreated());
        return t;
    }

    private void aceptar(Taller t, String metodos) throws Exception {
        mvc.perform(put("/api/panel/ajustes/metodos-pago")
                        .header("Authorization", "Bearer " + t.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"metodos\": [%s]}".formatted(metodos)))
                .andExpect(status().isOk());
    }

    private ResultActions reservar(Taller t, LocalDate fecha, String hora, String metodo) throws Exception {
        String campoMetodo = metodo == null ? "" : ", \"metodoPago\": \"%s\"".formatted(metodo);
        return mvc.perform(post("/api/mis-ordenes")
                .header("Authorization", "Bearer " + tokenDe(CLIENTE))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                         {
                           "mypeId": %d, "especialidad": "SERVICIOS_HOGAR",
                           "descripcionFalla": "El tomacorriente de la sala echa chispas",
                           "direccion": "Urb. Primavera, Mz. C Lt. 14", "distrito": "Trujillo",
                           "fecha": "%s", "hora": "%s"%s
                         }
                         """.formatted(t.mypeId(), fecha, hora, campoMetodo)));
    }

    private ResultActions pagar(Taller t, Long ordenId, String metodo) throws Exception {
        return mvc.perform(post("/api/panel/ordenes/{id}/pago", ordenId)
                .header("Authorization", "Bearer " + t.token())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"metodo\": \"%s\"}".formatted(metodo)));
    }

    private String tokenDe(String email) throws Exception {
        String cuerpo = mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\": \"%s\", \"clave\": \"%s\"}".formatted(email, CLAVE)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return json.readTree(cuerpo).get("token").asText();
    }
}
