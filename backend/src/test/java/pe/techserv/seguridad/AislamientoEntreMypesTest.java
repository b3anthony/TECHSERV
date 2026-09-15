package pe.techserv.seguridad;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import pe.techserv.BasePruebaIntegracion;
import pe.techserv.orden.OrdenServicioRepository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * La prueba que sostiene el multi-inquilino.
 *
 * Si esta clase se pone en verde con el guardian roto, el resto de la aplicacion
 * da igual: un taller podria leer las ordenes de otro. Por eso usa las ordenes
 * REALES de la semilla y no datos inventados dentro del test.
 */
@AutoConfigureMockMvc
class AislamientoEntreMypesTest extends BasePruebaIntegracion {

    private static final String ADMIN_DELGADO   = "jorge@serviciosdelgado.pe";
    private static final String ADMIN_TECNOHOGAR = "silvia@tecnohogar.pe";
    private static final String CLIENTE          = "rosa.chavez@correo.pe";
    private static final String CLAVE            = "demo1234";

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired OrdenServicioRepository ordenes;

    @Test
    @DisplayName("El admin de un taller NO puede leer una orden de otro: recibe 404, no 403")
    void ordenDeOtraMypeDa404() throws Exception {
        // ORD-0133 es de TecnoHogar Trujillo.
        Long ordenAjena = ordenes.findByCodigo("ORD-0133").orElseThrow().getId();

        mvc.perform(get("/api/panel/ordenes/{id}", ordenAjena)
                        .header("Authorization", "Bearer " + tokenDe(ADMIN_DELGADO)))
           .andExpect(status().isNotFound());

        // 403 diría "existe, pero no es tuya", y con eso se pueden ir probando
        // ids hasta contar las órdenes de la competencia.
        mvc.perform(get("/api/panel/ordenes/{id}", ordenAjena)
                        .header("Authorization", "Bearer " + tokenDe(ADMIN_DELGADO)))
           .andExpect(status().isNotFound())
           .andExpect(jsonPath("$.estado").value(404));
    }

    @Test
    @DisplayName("Su dueño legítimo sí la ve")
    void ordenPropiaDa200() throws Exception {
        Long orden = ordenes.findByCodigo("ORD-0133").orElseThrow().getId();

        mvc.perform(get("/api/panel/ordenes/{id}", orden)
                        .header("Authorization", "Bearer " + tokenDe(ADMIN_TECNOHOGAR)))
           .andExpect(status().isOk())
           .andExpect(jsonPath("$.codigo").value("ORD-0133"));
    }

    @Test
    @DisplayName("La bandeja solo trae órdenes del taller de quien pregunta")
    void bandejaNoSeMezcla() throws Exception {
        String cuerpo = mvc.perform(get("/api/panel/ordenes?tamano=100")
                        .header("Authorization", "Bearer " + tokenDe(ADMIN_TECNOHOGAR)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        var raiz = json.readTree(cuerpo);
        assertThat(raiz.get("content")).isNotEmpty();

        // Ninguna de las órdenes de la demo de Servicios Delgado puede asomar aquí.
        assertThat(cuerpo).doesNotContain("ORD-0142")
                          .doesNotContain("ORD-0135")
                          .doesNotContain("ORD-0139");
    }

    @Test
    @DisplayName("Sin token, el panel responde 401")
    void sinTokenDa401() throws Exception {
        mvc.perform(get("/api/panel/ordenes"))
           .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Un cliente con sesión válida tampoco entra al panel: 403")
    void clienteEnPanelDa403() throws Exception {
        mvc.perform(get("/api/panel/ordenes")
                        .header("Authorization", "Bearer " + tokenDe(CLIENTE)))
           .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Un token inventado no autentica")
    void tokenFalsoDa401() throws Exception {
        mvc.perform(get("/api/panel/ordenes")
                        .header("Authorization", "Bearer esto.no.es-un-token"))
           .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Clave incorrecta y correo inexistente dan EL MISMO mensaje")
    void elErrorDeLoginNoRevelaSiElCorreoExiste() throws Exception {
        String conClaveMala = mensajeDeLoginFallido(ADMIN_DELGADO, "claveIncorrecta");
        String conCorreoInexistente = mensajeDeLoginFallido("nadie@ejemplo.pe", CLAVE);

        assertThat(conClaveMala).isEqualTo(conCorreoInexistente);
    }

    private String mensajeDeLoginFallido(String email, String clave) throws Exception {
        String cuerpo = mvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content("""
                                 {"email": "%s", "clave": "%s"}
                                 """.formatted(email, clave)))
                .andExpect(status().isBadRequest())
                .andReturn().getResponse().getContentAsString();
        return json.readTree(cuerpo).get("mensaje").asText();
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
