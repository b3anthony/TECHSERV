package pe.techserv.reserva;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import pe.techserv.BasePruebaIntegracion;
import pe.techserv.mype.MypeRepository;
import pe.techserv.mype.TecnicoRepository;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * La reserva del cliente, con el foco puesto en lo que de verdad se puede
 * romper: el cupo de una franja horaria.
 */
@AutoConfigureMockMvc
class ReservaTest extends BasePruebaIntegracion {

    private static final String CLIENTE = "rosa.chavez@correo.pe";
    private static final String OTRO_CLIENTE = "javier.osorio@correo.pe";
    private static final String CLAVE = "demo1234";

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired MypeRepository mypes;
    @Autowired TecnicoRepository tecnicos;

    /** Servicios Delgado: 3 técnicos, pero solo 2 marcados como disponibles. */
    private Long tallerDelgado() {
        return mypes.findAll().stream()
                .filter(m -> m.getRuc().equals("20601234567"))
                .findFirst().orElseThrow().getId();
    }

    @Test
    @DisplayName("El aforo de una franja es el número de técnicos disponibles, no uno")
    void laTerceraReservaDeLaMismaFranjaNoEntra() throws Exception {
        Long taller = tallerDelgado();
        long aforo = tecnicos.countByMypeIdAndDisponibleTrue(taller);
        assertThat(aforo)
                .as("la semilla deja 2 técnicos disponibles en Servicios Delgado")
                .isEqualTo(2);

        // Un día lejano: la semilla no pone nada ahí, así que la franja empieza vacía.
        LocalDate dia = LocalDate.now().plusDays(30);
        String token = tokenDe(CLIENTE);

        // Las dos primeras caben: hay dos técnicos.
        reservar(token, taller, dia, "10:00").andExpect(status().isCreated());
        reservar(token, taller, dia, "10:00").andExpect(status().isCreated());

        // La tercera no: no hay a quién mandar.
        reservar(token, taller, dia, "10:00")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.mensaje").value(
                        org.hamcrest.Matchers.containsString("acaba de ocuparse")));

        // Y la agenda lo dice antes de que el cliente lo intente.
        String agenda = mvc.perform(get("/api/catalogo/mypes/{id}/agenda", taller)
                        .param("fecha", dia.toString()))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        var franjas = json.readTree(agenda).get("franjas");
        var diez = java.util.stream.StreamSupport.stream(franjas.spliterator(), false)
                .filter(f -> f.get("hora").asText().startsWith("10:00"))
                .findFirst().orElseThrow();
        assertThat(diez.get("disponible").asBoolean()).isFalse();
        assertThat(diez.get("cuposLibres").asLong()).isZero();
    }

    @Test
    @DisplayName("No se puede reservar una especialidad que ese taller no atiende")
    void especialidadQueNoAtiendeDa400() throws Exception {
        // Reparaciones La Libertad solo ofrece electrodomésticos y hogar.
        Long taller = mypes.findAll().stream()
                .filter(m -> m.getRuc().equals("20605554443"))
                .findFirst().orElseThrow().getId();

        reservar(tokenDe(CLIENTE), taller, LocalDate.now().plusDays(31),
                 "09:00", "SOPORTE_INFORMATICO")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensaje").value(
                        org.hamcrest.Matchers.containsString("no atiende")));
    }

    @Test
    @DisplayName("Una hora que no es franja de atención se rechaza")
    void horaFueraDeFranjaDa400() throws Exception {
        reservar(tokenDe(CLIENTE), tallerDelgado(), LocalDate.now().plusDays(32), "03:15")
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Una fecha pasada se rechaza en la validación del formulario")
    void fechaPasadaDa400() throws Exception {
        reservar(tokenDe(CLIENTE), tallerDelgado(), LocalDate.now().minusDays(1), "09:00")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.fecha").exists());
    }

    @Test
    @DisplayName("Un cliente no puede abrir la orden de otro cliente")
    void ordenDeOtroClienteDa404() throws Exception {
        String cuerpo = reservar(tokenDe(CLIENTE), tallerDelgado(),
                                 LocalDate.now().plusDays(33), "15:00")
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long ordenAjena = json.readTree(cuerpo).get("id").asLong();

        mvc.perform(get("/api/mis-ordenes/{id}", ordenAjena)
                        .header("Authorization", "Bearer " + tokenDe(OTRO_CLIENTE)))
           .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("La orden nueva nace en PENDIENTE y con su primer paso en el historial")
    void laOrdenNaceConHistorial() throws Exception {
        String cuerpo = reservar(tokenDe(CLIENTE), tallerDelgado(),
                                 LocalDate.now().plusDays(34), "16:00")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.estado").value("PENDIENTE"))
                .andExpect(jsonPath("$.codigo").value(
                        org.hamcrest.Matchers.matchesPattern("ORD-\\d{4}")))
                .andReturn().getResponse().getContentAsString();

        var orden = json.readTree(cuerpo);
        assertThat(orden.get("historial")).hasSize(1);
        assertThat(orden.get("historial").get(0).get("estado").asText()).isEqualTo("PENDIENTE");
        assertThat(orden.get("urlMapa").asText()).startsWith("https://www.google.com/maps/");
    }

    @Test
    @DisplayName("El catálogo público se ve sin iniciar sesión, con promedios calculados")
    void catalogoPublico() throws Exception {
        mvc.perform(get("/api/catalogo/mypes").param("especialidad", "REPARACION_ELECTRODOMESTICOS"))
           .andExpect(status().isOk())
           .andExpect(jsonPath("$[?(@.razonSocial=='Servicios Delgado E.I.R.L.')].promedio")
                   .value(org.hamcrest.Matchers.contains(4.8)))
           .andExpect(jsonPath("$[?(@.razonSocial=='Servicios Delgado E.I.R.L.')].servicios")
                   .value(org.hamcrest.Matchers.contains(126)));
    }

    // ── utilidades ──

    private org.springframework.test.web.servlet.ResultActions reservar(
            String token, Long taller, LocalDate fecha, String hora) throws Exception {
        return reservar(token, taller, fecha, hora, "REPARACION_ELECTRODOMESTICOS");
    }

    private org.springframework.test.web.servlet.ResultActions reservar(
            String token, Long taller, LocalDate fecha, String hora, String especialidad)
            throws Exception {
        return mvc.perform(post("/api/mis-ordenes")
                .header("Authorization", "Bearer " + token)
                .contentType("application/json")
                .content("""
                         {
                           "mypeId": %d,
                           "especialidad": "%s",
                           "descripcionFalla": "La lavadora no centrifuga y bota agua por abajo",
                           "direccion": "Urb. Primavera, Mz. C Lt. 14",
                           "referencia": "Frente al parque",
                           "distrito": "Trujillo",
                           "fecha": "%s",
                           "hora": "%s"
                         }
                         """.formatted(taller, especialidad, fecha, hora)));
    }

    private String tokenDe(String email) throws Exception {
        String cuerpo = mvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content("""
                                 {"email": "%s", "clave": "%s"}
                                 """.formatted(email, CLAVE)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return json.readTree(cuerpo).get("token").asText();
    }
}
