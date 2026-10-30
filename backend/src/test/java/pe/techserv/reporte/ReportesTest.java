package pe.techserv.reporte;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import pe.techserv.BasePruebaIntegracion;
import pe.techserv.mype.MypeRepository;
import pe.techserv.orden.EstadoOrden;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class ReportesTest extends BasePruebaIntegracion {

    private static final String ADMIN_DELGADO    = "jorge@serviciosdelgado.pe";
    private static final String ADMIN_TECNOHOGAR = "silvia@tecnohogar.pe";
    private static final String CLIENTE          = "rosa.chavez@correo.pe";
    private static final String CLAVE            = "demo1234";

    private static final ZoneId ZONA_LIMA = ZoneId.of("America/Lima");

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;
    @Autowired MypeRepository mypes;

    private Long mypeDelgado() {
        return mypes.findAll().stream()
                .filter(m -> "20601234567".equals(m.getRuc()))
                .findFirst().orElseThrow().getId();
    }

    private Long mypeTecnoHogar() {
        return mypes.findAll().stream()
                .filter(m -> "20609876543".equals(m.getRuc()))
                .findFirst().orElseThrow().getId();
    }

    private String tokenDe(String email) throws Exception {
        String cuerpo = mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                 {"email": "%s", "clave": "%s"}
                                 """.formatted(email, CLAVE)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return json.readTree(cuerpo).get("token").asText();
    }

    @Test
    @DisplayName("1. Cada número del reporte coincide con su consulta SQL")
    void cadaNumeroDelReporteCoincideConSuConsultaSql() throws Exception {
        Long mypeId = mypeDelgado();
        String desdeStr = "2026-09-01";
        String hastaStr = "2026-09-30";

        OffsetDateTime desde = LocalDate.parse(desdeStr).atStartOfDay(ZONA_LIMA).toOffsetDateTime();
        OffsetDateTime hasta = LocalDate.parse(hastaStr).atTime(23, 59, 59, 999_999_000).atZone(ZONA_LIMA).toOffsetDateTime();

        BigDecimal ingresosSql = jdbc.queryForObject("""
                SELECT COALESCE(SUM(p.monto), 0)
                FROM pago p
                JOIN orden_servicio os ON os.id = p.orden_id
                WHERE os.mype_id = ?
                  AND p.estado = 'PAGADO'
                  AND p.pagado_en BETWEEN ? AND ?
                """, BigDecimal.class, mypeId, desde, hasta);

        Long ordenesCreadasSql = jdbc.queryForObject("""
                SELECT COUNT(os.id)
                FROM orden_servicio os
                WHERE os.mype_id = ?
                  AND os.creada_en BETWEEN ? AND ?
                """, Long.class, mypeId, desde, hasta);

        Double calificacionPromedioSql = jdbc.queryForObject("""
                SELECT COALESCE(AVG(c.puntaje), 0)
                FROM calificacion c
                JOIN orden_servicio os ON os.id = c.orden_id
                WHERE os.mype_id = ?
                """, Double.class, mypeId);

        Long serviciosCalificadosSql = jdbc.queryForObject("""
                SELECT COUNT(c.id)
                FROM calificacion c
                JOIN orden_servicio os ON os.id = c.orden_id
                WHERE os.mype_id = ?
                """, Long.class, mypeId);

        Double horasMediasSql = jdbc.queryForObject("""
                SELECT CAST(AVG(TIMESTAMPDIFF(MICROSECOND, os.creada_en, h.ocurrido_en) / 3.6e9) AS DOUBLE)
                FROM orden_historial h
                JOIN orden_servicio os ON os.id = h.orden_id
                WHERE os.mype_id = ?
                  AND h.estado_nuevo = 'COMPLETADA'
                  AND h.ocurrido_en BETWEEN ? AND ?
                """, Double.class, mypeId, desde, hasta);

        String respuesta = mvc.perform(get("/api/panel/reportes")
                        .param("desde", desdeStr)
                        .param("hasta", hastaStr)
                        .header("Authorization", "Bearer " + tokenDe(ADMIN_DELGADO)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        JsonNode res = json.readTree(respuesta);

        assertThat(res.get("ingresos").decimalValue()).isEqualByComparingTo(ingresosSql);
        assertThat(res.get("ordenesCreadas").asLong()).isEqualTo(ordenesCreadasSql);
        assertThat(res.get("calificacionPromedio").asDouble()).isEqualTo(calificacionPromedioSql);
        assertThat(res.get("serviciosCalificados").asLong()).isEqualTo(serviciosCalificadosSql);

        if (horasMediasSql == null) {
            assertThat(res.get("horasMediasDeAtencion").isNull()).isTrue();
        } else {
            assertThat(res.get("horasMediasDeAtencion").asDouble()).isEqualTo(horasMediasSql);
        }

        // Verificamos también que el ranking devuelto coincide fila a fila con la consulta SQL
        List<String> nombresSql = new ArrayList<>();
        jdbc.query("""
                SELECT
                    t.id AS tecnico_id,
                    CONCAT(u.nombres, ' ', u.apellidos) AS nombre_completo,
                    COUNT(h.id) AS ordenes_completadas,
                    COALESCE(SUM(p.monto), 0) AS ingreso_generado
                FROM orden_servicio os
                JOIN tecnico t ON t.id = os.tecnico_id
                JOIN usuario u ON u.id = t.usuario_id
                JOIN orden_historial h ON h.orden_id = os.id AND h.estado_nuevo = 'COMPLETADA'
                LEFT JOIN pago p ON p.orden_id = os.id AND p.estado = 'PAGADO'
                WHERE os.mype_id = ?
                  AND h.ocurrido_en BETWEEN ? AND ?
                GROUP BY t.id, u.nombres, u.apellidos
                ORDER BY COUNT(h.id) DESC, nombre_completo ASC
                """, rs -> {
            nombresSql.add(rs.getString("nombre_completo"));
        }, mypeId, desde, hasta);

        JsonNode rankingNode = res.get("ranking");
        assertThat(rankingNode.size()).isEqualTo(nombresSql.size());
        for (int i = 0; i < nombresSql.size(); i++) {
            assertThat(rankingNode.get(i).get("nombreCompleto").asText()).isEqualTo(nombresSql.get(i));
        }
    }

    @Test
    @DisplayName("2. Los estados a cero aparecen")
    void losEstadosACeroAparecen() throws Exception {
        String respuesta = mvc.perform(get("/api/panel/reportes")
                        .param("desde", "2000-01-01")
                        .param("hasta", "2000-01-31")
                        .header("Authorization", "Bearer " + tokenDe(ADMIN_DELGADO)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        JsonNode ordenesPorEstado = json.readTree(respuesta).get("ordenesPorEstado");

        assertThat(ordenesPorEstado.size()).isEqualTo(EstadoOrden.values().length);
        for (EstadoOrden estado : EstadoOrden.values()) {
            assertThat(ordenesPorEstado.has(estado.name()))
                    .as("El estado %s debe existir en ordenesPorEstado", estado.name())
                    .isTrue();
            assertThat(ordenesPorEstado.get(estado.name()).asLong()).isEqualTo(0L);
        }
    }

    @Test
    @DisplayName("3. Aislamiento: números distintos entre talleres y ranking independiente")
    void aislamientoEntreMypesYRankingIndependiente() throws Exception {
        String desdeStr = "2026-09-01";
        String hastaStr = "2026-09-30";

        String respDelgado = mvc.perform(get("/api/panel/reportes")
                        .param("desde", desdeStr)
                        .param("hasta", hastaStr)
                        .header("Authorization", "Bearer " + tokenDe(ADMIN_DELGADO)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        String respTecnoHogar = mvc.perform(get("/api/panel/reportes")
                        .param("desde", desdeStr)
                        .param("hasta", hastaStr)
                        .header("Authorization", "Bearer " + tokenDe(ADMIN_TECNOHOGAR)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        JsonNode nodoDelgado = json.readTree(respDelgado);
        JsonNode nodoTecnoHogar = json.readTree(respTecnoHogar);

        // Los números de facturación y actividad son propios de cada taller
        assertThat(nodoDelgado.get("ingresos").decimalValue())
                .as("Los ingresos deben ser distintos entre talleres diferentes")
                .isNotEqualTo(nodoTecnoHogar.get("ingresos").decimalValue());

        assertThat(nodoDelgado.get("ordenesCreadas").asLong())
                .as("Las órdenes creadas deben ser distintas entre talleres diferentes")
                .isNotEqualTo(nodoTecnoHogar.get("ordenesCreadas").asLong());

        // Ningún técnico de Servicios Delgado debe figurar en el ranking de TecnoHogar
        List<String> tecnicosDelgado = new ArrayList<>();
        nodoDelgado.get("ranking").forEach(t -> tecnicosDelgado.add(t.get("nombreCompleto").asText()));

        List<String> tecnicosTecnoHogar = new ArrayList<>();
        nodoTecnoHogar.get("ranking").forEach(t -> tecnicosTecnoHogar.add(t.get("nombreCompleto").asText()));

        assertThat(tecnicosDelgado).isNotEmpty();
        assertThat(tecnicosTecnoHogar).isNotEmpty();

        assertThat(tecnicosTecnoHogar).doesNotContainAnyElementsOf(tecnicosDelgado);
        assertThat(tecnicosTecnoHogar).contains("Pedro Salazar");
        assertThat(tecnicosDelgado).doesNotContain("Pedro Salazar");
        assertThat(tecnicosTecnoHogar).doesNotContain("Luis Ramírez", "Carlos Núñez", "Ana Quispe");
    }

    @Test
    @DisplayName("4. desde posterior a hasta da 400")
    void desdePosteriorAHastaDa400() throws Exception {
        mvc.perform(get("/api/panel/reportes")
                        .param("desde", "2026-09-30")
                        .param("hasta", "2026-09-01")
                        .header("Authorization", "Bearer " + tokenDe(ADMIN_DELGADO)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.estado").value(400))
                .andExpect(jsonPath("$.mensaje").value("La fecha de inicio no puede ser posterior a la de fin"));
    }

    @Test
    @DisplayName("5. Un periodo sin datos devuelve ingresos 0 y horasMediasDeAtencion null")
    void periodoSinDatosDevuelveIngresos0YHorasMediasNull() throws Exception {
        String respuesta = mvc.perform(get("/api/panel/reportes")
                        .param("desde", "2000-01-01")
                        .param("hasta", "2000-01-31")
                        .header("Authorization", "Bearer " + tokenDe(ADMIN_DELGADO)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ingresos").value(0))
                .andExpect(jsonPath("$.horasMediasDeAtencion").value(nullValue()))
                .andExpect(jsonPath("$.ordenesCreadas").value(0))
                .andReturn().getResponse().getContentAsString();

        JsonNode res = json.readTree(respuesta);
        assertThat(res.get("ingresos").decimalValue()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(res.get("horasMediasDeAtencion").isNull()).isTrue();
    }

    @Test
    @DisplayName("6. Sin sesión 401 y con sesión de cliente 403")
    void sinSesion401YConSesionCliente403() throws Exception {
        mvc.perform(get("/api/panel/reportes"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.estado").value(401))
                .andExpect(jsonPath("$.mensaje").value("Inicia sesión para continuar"));

        mvc.perform(get("/api/panel/reportes")
                        .header("Authorization", "Bearer " + tokenDe(CLIENTE)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.estado").value(403))
                .andExpect(jsonPath("$.mensaje").value("No tienes permiso para esta acción"));
    }
}
