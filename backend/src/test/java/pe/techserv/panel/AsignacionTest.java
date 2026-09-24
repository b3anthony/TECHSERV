package pe.techserv.panel;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import pe.techserv.BasePruebaIntegracion;
import pe.techserv.comun.Especialidad;
import pe.techserv.mype.MypeRepository;
import pe.techserv.mype.Tecnico;
import pe.techserv.mype.TecnicoRepository;
import pe.techserv.orden.ActorHistorial;
import pe.techserv.orden.EstadoOrden;
import pe.techserv.orden.OrdenHistorial;
import pe.techserv.orden.OrdenHistorialRepository;
import pe.techserv.orden.OrdenServicio;
import pe.techserv.orden.OrdenServicioRepository;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class AsignacionTest extends BasePruebaIntegracion {

    private static final String ADMIN_DELGADO    = "jorge@serviciosdelgado.pe";
    private static final String ADMIN_TECNOHOGAR = "silvia@tecnohogar.pe";
    private static final String CLAVE            = "demo1234";

    // El correo va mockeado a proposito. Sin esto la suite exige un SMTP vivo en
    // localhost:1025 (Mailpit, via docker compose) y falla en cualquier maquina
    // que no lo tenga levantado. Medido el 19 sep 2026: dos pruebas en rojo sobre
    // master limpio por esta causa, no por la logica que decian probar.
    // Por defecto NO falla: cada prueba que quiera un correo roto lo dice.
    @MockitoBean JavaMailSender correo;

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired OrdenServicioRepository ordenes;
    @Autowired OrdenHistorialRepository historialRepo;
    @Autowired TecnicoRepository tecnicos;
    @Autowired MypeRepository mypes;

    @BeforeEach
    void correoQueNoRevienta() {
        when(correo.createMimeMessage())
                .thenAnswer(inv -> new JavaMailSenderImpl().createMimeMessage());
    }

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

    private Tecnico tecnico(String email) {
        return tecnicos.findByUsuarioEmailIgnoreCase(email).orElseThrow();
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
    @Order(1)
    @DisplayName("Asignar un técnico válido a una orden PENDIENTE propia")
    void asignarTecnicoValidoAOrdenPendientePropia() throws Exception {
        OrdenServicio orden = ordenes.findAll().stream()
                .filter(o -> o.getMype().getId().equals(mypeDelgado())
                        && o.getEstado() == EstadoOrden.PENDIENTE
                        && o.getEspecialidad() == Especialidad.SOPORTE_INFORMATICO)
                .findFirst().orElseThrow();

        Tecnico carlos = tecnico("carlos.nunez@serviciosdelgado.pe");
        int historialAntes = historialRepo.findByOrdenIdOrderByOcurridoEnAsc(orden.getId()).size();

        mvc.perform(post("/api/panel/ordenes/{id}/asignar", orden.getId())
                        .header("Authorization", "Bearer " + tokenDe(ADMIN_DELGADO))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                 {"tecnicoId": %d}
                                 """.formatted(carlos.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(orden.getId()))
                .andExpect(jsonPath("$.estado").value("ASIGNADA"))
                .andExpect(jsonPath("$.tecnicoId").value(carlos.getId()))
                .andExpect(jsonPath("$.tecnicoNombre").value("Carlos Núñez"))
                .andExpect(jsonPath("$.historial").isArray());

        OrdenServicio actualizada = ordenes.findById(orden.getId()).orElseThrow();
        assertThat(actualizada.getEstado()).isEqualTo(EstadoOrden.ASIGNADA);
        assertThat(actualizada.getTecnico().getId()).isEqualTo(carlos.getId());

        List<OrdenHistorial> pasos = historialRepo.findByOrdenIdOrderByOcurridoEnAsc(orden.getId());
        assertThat(pasos).hasSize(historialAntes + 1);
        OrdenHistorial ultimoPaso = pasos.get(pasos.size() - 1);
        assertThat(ultimoPaso.getActor()).isEqualTo(ActorHistorial.ADMIN_MYPE);
        assertThat(ultimoPaso.getEstadoAnterior()).isEqualTo(EstadoOrden.PENDIENTE);
        assertThat(ultimoPaso.getEstadoNuevo()).isEqualTo(EstadoOrden.ASIGNADA);
        assertThat(ultimoPaso.getNota()).isEqualTo("Se asignó a Carlos Núñez");
    }

    @Test
    @Order(2)
    @DisplayName("Asignar un técnico de otro taller (Pedro Salazar, de TecnoHogar, desde la sesión de Jorge) da 404")
    void tecnicoDeOtroTallerDa404() throws Exception {
        OrdenServicio orden = ordenes.findAll().stream()
                .filter(o -> o.getMype().getId().equals(mypeDelgado())
                        && o.getEstado() == EstadoOrden.PENDIENTE
                        && o.getEspecialidad() == Especialidad.REPARACION_ELECTRODOMESTICOS)
                .findFirst().orElseThrow();

        Tecnico pedro = tecnico("pedro.salazar@tecnohogar.pe");

        mvc.perform(post("/api/panel/ordenes/{id}/asignar", orden.getId())
                        .header("Authorization", "Bearer " + tokenDe(ADMIN_DELGADO))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                 {"tecnicoId": %d}
                                 """.formatted(pedro.getId())))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.estado").value(404))
                .andExpect(jsonPath("$.mensaje").value("No se encontró el técnico " + pedro.getId()));
    }

    @Test
    @Order(3)
    @DisplayName("Asignar a una orden de otro taller da 404")
    void ordenDeOtroTallerDa404() throws Exception {
        OrdenServicio ordenAjena = ordenes.findAll().stream()
                .filter(o -> o.getMype().getId().equals(mypeTecnoHogar()))
                .findFirst().orElseThrow();

        Tecnico luis = tecnico("luis.ramirez@serviciosdelgado.pe");

        mvc.perform(post("/api/panel/ordenes/{id}/asignar", ordenAjena.getId())
                        .header("Authorization", "Bearer " + tokenDe(ADMIN_DELGADO))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                 {"tecnicoId": %d}
                                 """.formatted(luis.getId())))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.estado").value(404))
                .andExpect(jsonPath("$.mensaje").value("No se encontró la orden " + ordenAjena.getId()));
    }

    @Test
    @Order(4)
    @DisplayName("Asignar un técnico que no atiende esa especialidad da 400")
    void tecnicoNoAtiendeEspecialidadDa400() throws Exception {
        OrdenServicio orden = ordenes.findAll().stream()
                .filter(o -> o.getMype().getId().equals(mypeDelgado())
                        && o.getEspecialidad() == Especialidad.REPARACION_ELECTRODOMESTICOS)
                .findFirst().orElseThrow();

        Tecnico carlos = tecnico("carlos.nunez@serviciosdelgado.pe");

        mvc.perform(post("/api/panel/ordenes/{id}/asignar", orden.getId())
                        .header("Authorization", "Bearer " + tokenDe(ADMIN_DELGADO))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                 {"tecnicoId": %d}
                                 """.formatted(carlos.getId())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.estado").value(400))
                .andExpect(jsonPath("$.mensaje").value(
                        "Carlos Núñez no atiende " + orden.getEspecialidad().getTitulo()));
    }

    @Test
    @Order(5)
    @DisplayName("Asignar un técnico marcado como no disponible (Ana Quispe) da 400")
    void tecnicoNoDisponibleDa400() throws Exception {
        OrdenServicio orden = ordenes.findAll().stream()
                .filter(o -> o.getMype().getId().equals(mypeDelgado())
                        && o.getEspecialidad() == Especialidad.SERVICIOS_HOGAR)
                .findFirst().orElseThrow();

        Tecnico ana = tecnico("ana.quispe@serviciosdelgado.pe");

        mvc.perform(post("/api/panel/ordenes/{id}/asignar", orden.getId())
                        .header("Authorization", "Bearer " + tokenDe(ADMIN_DELGADO))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                 {"tecnicoId": %d}
                                 """.formatted(ana.getId())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.estado").value(400))
                .andExpect(jsonPath("$.mensaje").value("Ese técnico está marcado como no disponible"));
    }

    @Test
    @Order(6)
    @DisplayName("Reasignar una orden que ya quedó ASIGNADA da 409")
    void reasignarOrdenAsignadaDa409() throws Exception {
        Tecnico luis = tecnico("luis.ramirez@serviciosdelgado.pe");

        // La orden ASIGNADA se fabrica AQUI en vez de buscarla en la base. Buscarla
        // hacia que esta prueba dependiera del estado que dejaran las demas clases:
        // TokenAccionTest mueve ordenes de estado en la misma base compartida, y la
        // "primera ASIGNADA que aparezca" dejaba de ser la que esta prueba esperaba.
        OrdenServicio ordenAsignada = ordenes.findAll().stream()
                .filter(o -> o.getMype().getId().equals(mypeDelgado())
                        && o.getEstado() == EstadoOrden.PENDIENTE
                        && (o.getEspecialidad() == Especialidad.SERVICIOS_HOGAR
                         || o.getEspecialidad() == Especialidad.REPARACION_ELECTRODOMESTICOS))
                .findFirst().orElseThrow();

        mvc.perform(post("/api/panel/ordenes/{id}/asignar", ordenAsignada.getId())
                        .header("Authorization", "Bearer " + tokenDe(ADMIN_DELGADO))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                 {"tecnicoId": %d}
                                 """.formatted(luis.getId())))
                .andExpect(status().isOk());

        mvc.perform(post("/api/panel/ordenes/{id}/asignar", ordenAsignada.getId())
                        .header("Authorization", "Bearer " + tokenDe(ADMIN_DELGADO))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                 {"tecnicoId": %d}
                                 """.formatted(luis.getId())))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.estado").value(409))
                .andExpect(jsonPath("$.mensaje").value("Una orden asignada ya no se puede asignar"));
    }

    @Test
    @Order(7)
    @DisplayName("GET /api/panel/tecnicos devuelve solo los del taller con su carga de hoy")
    void listarTecnicosDevuelveSoloLosDelTallerConCarga() throws Exception {
        String cuerpo = mvc.perform(get("/api/panel/tecnicos")
                        .header("Authorization", "Bearer " + tokenDe(ADMIN_DELGADO)))
                .andExpect(status().isOk())
                // Los tres de la semilla siguen estando y no se cuela nadie de otro
                // taller: eso es lo que sujeta esta prueba. El TOTAL no se fija,
                // porque AdministracionTest da de alta tecnicos en este mismo taller
                // y las dos clases comparten la base.
                .andExpect(jsonPath("$", hasSize(greaterThanOrEqualTo(3))))
                .andExpect(jsonPath("$[?(@.email=='luis.ramirez@serviciosdelgado.pe')]").exists())
                .andExpect(jsonPath("$[?(@.email=='ana.quispe@serviciosdelgado.pe')]").exists())
                .andExpect(jsonPath("$[?(@.email=='carlos.nunez@serviciosdelgado.pe')]").exists())
                .andExpect(jsonPath("$[?(@.email=='pedro.salazar@tecnohogar.pe')]").doesNotExist())
                .andExpect(jsonPath("$[?(@.email=='marta.ibanez@reparacionesll.pe')]").doesNotExist())
                .andExpect(jsonPath("$[0].ordenesHoy").isNumber())
                .andExpect(jsonPath("$[1].ordenesHoy").isNumber())
                .andExpect(jsonPath("$[2].ordenesHoy").isNumber())
                .andReturn().getResponse().getContentAsString();

        var lista = json.readTree(cuerpo);
        long id0 = lista.get(0).get("id").asLong();
        long id1 = lista.get(1).get("id").asLong();
        long id2 = lista.get(2).get("id").asLong();
        assertThat(id0).isLessThan(id1);
        assertThat(id1).isLessThan(id2);
    }

    @Test
    @Order(8)
    @DisplayName("Petición de asignar sin técnico devuelve 400 por validación")
    void peticionSinTecnicoDa400() throws Exception {
        OrdenServicio orden = ordenes.findAll().stream()
                .filter(o -> o.getMype().getId().equals(mypeDelgado()))
                .findFirst().orElseThrow();

        mvc.perform(post("/api/panel/ordenes/{id}/asignar", orden.getId())
                        .header("Authorization", "Bearer " + tokenDe(ADMIN_DELGADO))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.tecnicoId").value("Elige un técnico"));
    }

    @Test
    @Order(9)
    @DisplayName("Asignar sigue en pie aunque el envío del correo falle")
    void asignarSigueEnPieAunqueElCorreoFalle() throws Exception {
        // Esta prueba existe por un fallo real, no por completitud.
        //
        // El 19 sep 2026 un correo caido tumbaba la asignacion entera con un 500.
        // No porque la excepcion llegara al controlador —ServicioPanel la captura
        // y la registra— sino porque `avisarAsignacion` era @Transactional: al
        // reventar, el interceptor marcaba la transaccion del panel como
        // rollback-only, y tragarse la excepcion despues ya no servia de nada.
        // El commit saltaba con UnexpectedRollbackException.
        //
        // Si alguien vuelve a poner @Transactional en avisarAsignacion, esta
        // prueba se pone roja. Es su unico trabajo.
        doThrow(new MailSendException("SMTP caido a proposito"))
                .when(correo).send(any(jakarta.mail.internet.MimeMessage.class));

        // Se busca SIN filtrar por estado y se fuerza a PENDIENTE. Filtrar por
        // PENDIENTE aqui haria la prueba dependiente de lo que dejaron las ocho
        // anteriores: ya las habian asignado todas y esto reventaba con un
        // NoSuchElement, que se parece a un fallo pero no es el que vigilamos.
        OrdenServicio orden = ordenes.findAll().stream()
                .filter(o -> o.getMype().getId().equals(mypeDelgado())
                        && o.getEspecialidad() == Especialidad.SOPORTE_INFORMATICO)
                .findFirst().orElseThrow();
        orden.setEstado(EstadoOrden.PENDIENTE);
        orden.setTecnico(null);
        ordenes.save(orden);

        Tecnico carlos = tecnico("carlos.nunez@serviciosdelgado.pe");

        mvc.perform(post("/api/panel/ordenes/{id}/asignar", orden.getId())
                        .header("Authorization", "Bearer " + tokenDe(ADMIN_DELGADO))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                 {"tecnicoId": %d}
                                 """.formatted(carlos.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("ASIGNADA"));

        // Y que quede asignada de verdad en la base, no solo en la respuesta:
        // si la transaccion se hubiera deshecho, esto seguiria en PENDIENTE.
        OrdenServicio actualizada = ordenes.findById(orden.getId()).orElseThrow();
        assertThat(actualizada.getEstado()).isEqualTo(EstadoOrden.ASIGNADA);
        assertThat(actualizada.getTecnico().getId()).isEqualTo(carlos.getId());
    }
}
