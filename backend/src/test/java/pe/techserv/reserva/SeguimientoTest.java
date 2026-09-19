package pe.techserv.reserva;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import pe.techserv.BasePruebaIntegracion;
import pe.techserv.mype.MypeRepository;
import pe.techserv.mype.Tecnico;
import pe.techserv.mype.TecnicoRepository;
import pe.techserv.orden.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class SeguimientoTest extends BasePruebaIntegracion {

    private static final String CLIENTE = "rosa.chavez@correo.pe";
    private static final String OTRO_CLIENTE = "miguel.aranda@correo.pe";
    private static final String CLAVE = "demo1234";

    private static final AtomicInteger DIA_OFFSET = new AtomicInteger(100);

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired MypeRepository mypes;
    @Autowired TecnicoRepository tecnicos;
    @Autowired OrdenServicioRepository ordenes;
    @Autowired OrdenHistorialRepository historialRepo;
    @Autowired CalificacionRepository calificaciones;

    private Long tallerDelgado() {
        return mypes.findAll().stream()
                .filter(m -> "20601234567".equals(m.getRuc()))
                .findFirst().orElseThrow().getId();
    }

    private Long crearOrdenPropia(String tokenCliente) throws Exception {
        LocalDate fecha = LocalDate.now().plusDays(DIA_OFFSET.incrementAndGet());
        String cuerpo = mvc.perform(post("/api/mis-ordenes")
                        .header("Authorization", "Bearer " + tokenCliente)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                 {
                                   "mypeId": %d,
                                   "especialidad": "REPARACION_ELECTRODOMESTICOS",
                                   "descripcionFalla": "La refrigeradora no enfría bien",
                                   "direccion": "Urb. Primavera, Mz. C Lt. 14",
                                   "referencia": "Frente al parque",
                                   "distrito": "Trujillo",
                                   "fecha": "%s",
                                   "hora": "10:00"
                                 }
                                 """.formatted(tallerDelgado(), fecha)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return json.readTree(cuerpo).get("id").asLong();
    }

    private OrdenServicio llevarACompletada(Long ordenId) {
        OrdenServicio orden = ordenes.findById(ordenId).orElseThrow();
        Tecnico tec = tecnicos.findAll().stream()
                .filter(t -> t.getMype().getId().equals(orden.getMype().getId()) && t.isDisponible())
                .findFirst().orElseThrow();
        orden.setTecnico(tec);
        orden.setEstado(EstadoOrden.COMPLETADA);
        orden.setDiagnostico("Diagnóstico técnico completado con éxito");
        orden.setPrecioManoObra(new BigDecimal("50.00"));
        orden.setTotal(new BigDecimal("50.00"));

        OrdenHistorial paso = new OrdenHistorial();
        paso.setOrden(orden);
        paso.setEstadoAnterior(EstadoOrden.EN_PROCESO);
        paso.setEstadoNuevo(EstadoOrden.COMPLETADA);
        paso.setActor(ActorHistorial.TECNICO);
        paso.setNota("Trabajo finalizado");
        paso.setOcurridoEn(OffsetDateTime.now().minusMinutes(5));

        List<OrdenHistorial> previos = historialRepo.findByOrdenIdOrderByOcurridoEnAsc(ordenId);
        for (OrdenHistorial p : previos) {
            p.setOcurridoEn(OffsetDateTime.now().minusMinutes(10));
            historialRepo.save(p);
        }

        historialRepo.save(paso);

        return ordenes.save(orden);
    }

    @Test
    @DisplayName("GET seguimiento de una orden propia devuelve 200 con pasos en orden cronológico y etiqueta en español")
    void seguimientoOrdenPropiaEnOrdenCronologico() throws Exception {
        String token = tokenDe(CLIENTE);
        Long ordenId = crearOrdenPropia(token);
        llevarACompletada(ordenId);

        String respuesta = mvc.perform(get("/api/mis-ordenes/{id}/seguimiento", ordenId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.codigo").isNotEmpty())
                .andExpect(jsonPath("$.estado").value("COMPLETADA"))
                .andExpect(jsonPath("$.etiquetaEstado").value("Completada"))
                .andExpect(jsonPath("$.tallerNombre").value("Servicios Delgado E.I.R.L."))
                .andExpect(jsonPath("$.tecnicoNombre").isNotEmpty())
                .andExpect(jsonPath("$.pasos").isArray())
                .andReturn().getResponse().getContentAsString();

        var raiz = json.readTree(respuesta);
        var pasos = raiz.get("pasos");
        assertThat(pasos.size()).isGreaterThanOrEqualTo(2);

        // Verificar orden cronológico estricto de los pasos
        OffsetDateTime previo = null;
        for (var paso : pasos) {
            assertThat(paso.get("etiqueta").asText()).isNotEmpty();
            OffsetDateTime fechaPaso = OffsetDateTime.parse(paso.get("ocurridoEn").asText());
            if (previo != null) {
                assertThat(fechaPaso).isAfterOrEqualTo(previo);
            }
            previo = fechaPaso;
        }
    }

    @Test
    @DisplayName("GET seguimiento de la orden de otro cliente devuelve 404, nunca 403 ni 200")
    void seguimientoOrdenDeOtroClienteDa404() throws Exception {
        String tokenRosa = tokenDe(CLIENTE);
        String tokenMiguel = tokenDe(OTRO_CLIENTE);
        Long ordenRosa = crearOrdenPropia(tokenRosa);

        MvcResult resultado = mvc.perform(get("/api/mis-ordenes/{id}/seguimiento", ordenRosa)
                        .header("Authorization", "Bearer " + tokenMiguel))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.estado").value(404))
                .andReturn();

        int estadoHttp = resultado.getResponse().getStatus();
        assertThat(estadoHttp).isEqualTo(404);
        assertThat(estadoHttp).isNotEqualTo(403);
        assertThat(estadoHttp).isNotEqualTo(200);
    }

    @Test
    @DisplayName("puedeCalificar es false mientras la orden no está COMPLETADA y true en cuanto lo está")
    void puedeCalificarSoloCuandoEstaCompletada() throws Exception {
        String token = tokenDe(CLIENTE);
        Long ordenId = crearOrdenPropia(token);

        // Nace en PENDIENTE -> puedeCalificar debe ser false
        mvc.perform(get("/api/mis-ordenes/{id}/seguimiento", ordenId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("PENDIENTE"))
                .andExpect(jsonPath("$.puedeCancelar").value(true))
                .andExpect(jsonPath("$.puedeCalificar").value(false));

        // Pasa a COMPLETADA -> puedeCalificar debe ser true
        llevarACompletada(ordenId);

        mvc.perform(get("/api/mis-ordenes/{id}/seguimiento", ordenId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("COMPLETADA"))
                .andExpect(jsonPath("$.puedeCancelar").value(false))
                .andExpect(jsonPath("$.puedeCalificar").value(true));
    }

    @Test
    @DisplayName("Calificar una orden COMPLETADA propia responde 200, pasa a CALIFICADA y anota historial con actor CLIENTE")
    void calificarOrdenCompletadaPropiaPasaACalificada() throws Exception {
        String token = tokenDe(CLIENTE);
        Long ordenId = crearOrdenPropia(token);
        llevarACompletada(ordenId);

        mvc.perform(post("/api/mis-ordenes/{id}/calificacion", ordenId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                 {
                                   "puntaje": 5,
                                   "comentario": "Llegó puntual y dejó la refrigeradora como nueva"
                                 }
                                 """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("CALIFICADA"))
                .andExpect(jsonPath("$.etiquetaEstado").value("Calificada"))
                .andExpect(jsonPath("$.puedeCalificar").value(false))
                .andExpect(jsonPath("$.puedeCancelar").value(false));

        // Comprobación en base de datos
        OrdenServicio ordenEnBd = ordenes.findById(ordenId).orElseThrow();
        assertThat(ordenEnBd.getEstado()).isEqualTo(EstadoOrden.CALIFICADA);

        List<OrdenHistorial> historial = historialRepo.findByOrdenIdOrderByOcurridoEnAsc(ordenId);
        OrdenHistorial ultimo = historial.get(historial.size() - 1);
        assertThat(ultimo.getActor()).isEqualTo(ActorHistorial.CLIENTE);
        assertThat(ultimo.getEstadoAnterior()).isEqualTo(EstadoOrden.COMPLETADA);
        assertThat(ultimo.getEstadoNuevo()).isEqualTo(EstadoOrden.CALIFICADA);
        assertThat(ultimo.getNota()).isEqualTo("El cliente calificó el servicio con 5 de 5");
    }

    @Test
    @DisplayName("Calificar dos veces da 409 la segunda y mantiene una sola calificación")
    void calificarDosVecesDa409YNoDuplica() throws Exception {
        String token = tokenDe(CLIENTE);
        Long ordenId = crearOrdenPropia(token);
        llevarACompletada(ordenId);

        // Primera calificación: 200 OK
        mvc.perform(post("/api/mis-ordenes/{id}/calificacion", ordenId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                 {
                                   "puntaje": 5,
                                   "comentario": "Primera calificación"
                                 }
                                 """))
                .andExpect(status().isOk());

        // Segunda calificación: 409 Conflicto
        mvc.perform(post("/api/mis-ordenes/{id}/calificacion", ordenId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                 {
                                   "puntaje": 4,
                                   "comentario": "Intento de segunda calificación"
                                 }
                                 """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.mensaje").value("Ya calificaste este servicio"));

        long totalCalificaciones = calificaciones.findAll().stream()
                .filter(c -> c.getOrden().getId().equals(ordenId))
                .count();
        assertThat(totalCalificaciones).isEqualTo(1);
    }

    @Test
    @DisplayName("Calificar una orden que no está completada da 409")
    void calificarOrdenNoCompletadaDa409() throws Exception {
        String token = tokenDe(CLIENTE);
        Long ordenId = crearOrdenPropia(token); // Nace en PENDIENTE

        mvc.perform(post("/api/mis-ordenes/{id}/calificacion", ordenId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                 {
                                   "puntaje": 5,
                                   "comentario": "Aún no termina"
                                 }
                                 """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.mensaje").value("Solo se puede calificar un servicio completado"));
    }

    @Test
    @DisplayName("Puntaje fuera de 1..5 devuelve 400 por validación")
    void puntajeFueraDeRangoDa400() throws Exception {
        String token = tokenDe(CLIENTE);
        Long ordenId = crearOrdenPropia(token);
        llevarACompletada(ordenId);

        // Puntaje 0 (< 1)
        mvc.perform(post("/api/mis-ordenes/{id}/calificacion", ordenId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                 {
                                   "puntaje": 0,
                                   "comentario": "Inválido"
                                 }
                                 """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.puntaje").exists());

        // Puntaje 6 (> 5)
        mvc.perform(post("/api/mis-ordenes/{id}/calificacion", ordenId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                 {
                                   "puntaje": 6,
                                   "comentario": "Inválido"
                                 }
                                 """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.puntaje").exists());
    }

    @Test
    @DisplayName("El promedio del taller cambia al calificar: baja tras registrar una calificación de 1")
    void promedioDelTallerCambiaAlCalificar() throws Exception {
        Long taller = tallerDelgado();
        double promedioAntes = calificaciones.promedioDeLaMype(taller);
        assertThat(promedioAntes).isGreaterThan(1.0);

        String token = tokenDe(CLIENTE);
        Long ordenId = crearOrdenPropia(token);
        llevarACompletada(ordenId);

        mvc.perform(post("/api/mis-ordenes/{id}/calificacion", ordenId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                 {
                                   "puntaje": 1,
                                   "comentario": "Demoraron mucho"
                                 }
                                 """))
                .andExpect(status().isOk());

        double promedioDespues = calificaciones.promedioDeLaMype(taller);
        assertThat(promedioDespues).isLessThan(promedioAntes);
    }

    @Test
    @DisplayName("GET calificación de orden sin calificar devuelve 204 sin cuerpo")
    void consultaCalificacionSinCalificarDa204() throws Exception {
        String token = tokenDe(CLIENTE);
        Long ordenId = crearOrdenPropia(token);

        mvc.perform(get("/api/mis-ordenes/{id}/calificacion", ordenId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("GET calificación de orden de otro cliente devuelve 404")
    void consultaCalificacionDeOtroClienteDa404() throws Exception {
        String tokenRosa = tokenDe(CLIENTE);
        String tokenMiguel = tokenDe(OTRO_CLIENTE);
        Long ordenRosa = crearOrdenPropia(tokenRosa);

        mvc.perform(get("/api/mis-ordenes/{id}/calificacion", ordenRosa)
                        .header("Authorization", "Bearer " + tokenMiguel))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.estado").value(404));
    }

    @Test
    @DisplayName("GET calificación de orden calificada devuelve 200 con puntaje, comentario y creadaEn")
    void consultaCalificacionCalificadaDevuelve200() throws Exception {
        String token = tokenDe(CLIENTE);
        Long ordenId = crearOrdenPropia(token);
        llevarACompletada(ordenId);

        mvc.perform(post("/api/mis-ordenes/{id}/calificacion", ordenId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                 {
                                   "puntaje": 5,
                                   "comentario": "Excelente trabajo y trato"
                                 }
                                 """))
                .andExpect(status().isOk());

        mvc.perform(get("/api/mis-ordenes/{id}/calificacion", ordenId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.puntaje").value(5))
                .andExpect(jsonPath("$.comentario").value("Excelente trabajo y trato"))
                .andExpect(jsonPath("$.creadaEn").isNotEmpty());
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
}
