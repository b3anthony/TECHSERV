package pe.techserv.diagnostico;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import pe.techserv.BasePruebaIntegracion;

import java.sql.Statement;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * El diagnostico de la IA. Gemini no se llama nunca: el proveedor es falso, y
 * lo que se prueba es lo que hace la aplicacion con lo que la IA devuelve —
 * sobre todo, que no cuele repuestos de otro taller ni se lo ensene al cliente.
 */
@AutoConfigureMockMvc
class DiagnosticoIaTest extends BasePruebaIntegracion {

    private static final String ADMIN_DELGADO    = "jorge@serviciosdelgado.pe";
    private static final String ADMIN_TECNOHOGAR = "silvia@tecnohogar.pe";
    private static final String CLIENTE          = "rosa.chavez@correo.pe";
    private static final String CLAVE            = "demo1234";

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;
    @Autowired DiagnosticoIaRepository diagnosticos;
    @Autowired ServicioDiagnosticoIa servicio;

    @MockitoBean ProveedorDiagnostico proveedor;

    /** Lo que crea cada prueba se borra al final: las demas clases cuentan órdenes y repuestos. */
    private final List<Long> ordenesCreadas = new ArrayList<>();
    private final List<Long> repuestosCreados = new ArrayList<>();
    private static int diaLibre = 60;

    @AfterEach
    void limpiar() {
        ordenesCreadas.forEach(id -> jdbc.update("DELETE FROM orden_servicio WHERE id = ?", id));
        repuestosCreados.forEach(id -> jdbc.update("DELETE FROM repuesto WHERE id = ?", id));
        ordenesCreadas.clear();
        repuestosCreados.clear();
    }

    @Test
    @DisplayName("Subir fotos lanza el diagnóstico; los repuestos de otro taller, inventados o inactivos se descartan")
    void fotosLanzanDiagnosticoYFiltranRepuestos() throws Exception {
        Long delgado = mypeId("20601234567");
        Long rodaje = repuestoId(delgado, "Rodaje de lavadora 6205");
        Long deOtroTaller = repuestoId(mypeId("20609876543"), "Bomba de desagüe");
        Long inactivo = crearRepuestoInactivo(delgado);

        configurado();
        when(proveedor.diagnosticar(any())).thenReturn(respuesta("Rodaje gastado",
                List.of(rodaje, deOtroTaller, 999_999L, inactivo, rodaje)));

        Long orden = reservar(delgado);
        subirFotos(orden, 1, 2048);

        JsonNode d = esperarFin(ADMIN_DELGADO, orden);
        assertThat(d.get("estado").asText()).isEqualTo("LISTO");
        assertThat(d.get("fotosAnalizadas").asInt()).isEqualTo(1);
        // El modelo que respondió de verdad (puede ser el de respaldo), no el configurado.
        assertThat(d.get("modelo").asText()).isEqualTo("modelo-que-respondio");

        // Solo el rodaje, una vez, con precio y stock DE LA BASE DE DATOS.
        JsonNode reps = d.get("repuestosInventario");
        assertThat(reps).hasSize(1);
        assertThat(reps.get(0).get("repuestoId").asLong()).isEqualTo(rodaje);
        assertThat(reps.get(0).get("nombre").asText()).isEqualTo("Rodaje de lavadora 6205");
        assertThat(reps.get(0).get("precio").decimalValue())
                .isEqualByComparingTo(jdbc.queryForObject("SELECT precio FROM repuesto WHERE id = ?",
                                                          java.math.BigDecimal.class, rodaje));
        assertThat(reps.get(0).get("stock").asInt())
                .isEqualTo(jdbc.queryForObject("SELECT stock FROM repuesto WHERE id = ?", Integer.class, rodaje));

        // Y a la IA solo se le enseñó el inventario activo de ESE taller.
        ArgumentCaptor<ProveedorDiagnostico.Peticion> captor = ArgumentCaptor.forClass(ProveedorDiagnostico.Peticion.class);
        verify(proveedor, atLeastOnce()).diagnosticar(captor.capture());
        ProveedorDiagnostico.Peticion pedida = captor.getValue();
        Set<Long> enseñados = pedida.repuestos().stream()
                .map(ProveedorDiagnostico.RepuestoCatalogo::id).collect(Collectors.toSet());
        Set<Long> activosDelgado = Set.copyOf(jdbc.queryForList(
                "SELECT id FROM repuesto WHERE mype_id = ? AND activo", Long.class, delgado));
        assertThat(enseñados).isEqualTo(activosDelgado).doesNotContain(deOtroTaller, inactivo);
        assertThat(pedida.fotos()).hasSize(1);
        assertThat(pedida.descripcionFalla()).contains("no centrifuga");

        // Filtro 1, al guardar: en la columna solo queda el rodaje.
        JsonNode guardado = json.readTree(diagnosticos.findByOrdenId(orden).orElseThrow().getResultado());
        List<Long> idsGuardados = new ArrayList<>();
        guardado.get("repuestosInventario").forEach(r -> idsGuardados.add(r.get("repuestoId").asLong()));
        assertThat(idsGuardados).containsExactly(rodaje);

        // Filtro 2, al mostrar: si el taller desactiva el rodaje, deja de sugerirse.
        jdbc.update("UPDATE repuesto SET activo = FALSE WHERE id = ?", rodaje);
        try {
            assertThat(esperarFin(ADMIN_DELGADO, orden).get("repuestosInventario")).isEmpty();
        } finally {
            jdbc.update("UPDATE repuesto SET activo = TRUE WHERE id = ?", rodaje);
        }
    }

    @Test
    @DisplayName("El admin de otro taller recibe 404 en GET y en POST")
    void otroTallerDa404() throws Exception {
        configurado();
        when(proveedor.diagnosticar(any())).thenReturn(respuesta("x", List.of()));
        Long orden = reservar(mypeId("20601234567"));

        mvc.perform(get("/api/panel/ordenes/{id}/diagnostico-ia", orden).header("Authorization", bearer(ADMIN_TECNOHOGAR)))
           .andExpect(status().isNotFound());
        mvc.perform(post("/api/panel/ordenes/{id}/diagnostico-ia", orden).header("Authorization", bearer(ADMIN_TECNOHOGAR)))
           .andExpect(status().isNotFound());

        // Y no se lanzó nada por esas peticiones.
        assertThat(diagnosticos.findByOrdenId(orden)).isEmpty();
        verify(proveedor, never()).diagnosticar(any());
    }

    @Test
    @DisplayName("El cliente no ve el diagnóstico: ni en su orden ni por la ruta del panel")
    void clienteNoLoVe() throws Exception {
        configurado();
        when(proveedor.diagnosticar(any())).thenReturn(respuesta("RESUMEN-SECRETO-DEL-TALLER", List.of()));
        Long orden = reservar(mypeId("20601234567"));
        subirFotos(orden, 1, 1024);
        assertThat(esperarFin(ADMIN_DELGADO, orden).get("estado").asText()).isEqualTo("LISTO");

        String suya = mvc.perform(get("/api/mis-ordenes/{id}", orden).header("Authorization", bearer(CLIENTE)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertThat(suya).doesNotContain("RESUMEN-SECRETO-DEL-TALLER")
                        .doesNotContain("posiblesFallas")
                        .doesNotContain("repuestosInventario");

        mvc.perform(get("/api/panel/ordenes/{id}/diagnostico-ia", orden).header("Authorization", bearer(CLIENTE)))
           .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Sin clave: SIN_CONFIGURAR y no se llama a la IA")
    void sinClave() throws Exception {
        when(proveedor.configurado()).thenReturn(false);
        Long orden = reservar(mypeId("20601234567"));
        subirFotos(orden, 1, 1024);

        String cuerpo = mvc.perform(get("/api/panel/ordenes/{id}/diagnostico-ia", orden).header("Authorization", bearer(ADMIN_DELGADO)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertThat(json.readTree(cuerpo).get("estado").asText()).isEqualTo("SIN_CONFIGURAR");

        mvc.perform(post("/api/panel/ordenes/{id}/diagnostico-ia", orden).header("Authorization", bearer(ADMIN_DELGADO)))
           .andExpect(status().isAccepted());
        verify(proveedor, never()).diagnosticar(any());
        assertThat(diagnosticos.findByOrdenId(orden)).isEmpty();
    }

    @Test
    @DisplayName("Si la IA falla queda ERROR con su mensaje, y «volver a analizar» lo rehace")
    void errorYLuegoRehacer() throws Exception {
        configurado();
        when(proveedor.diagnosticar(any())).thenThrow(new FalloProveedorIa("Se agotó la cuota de Gemini."));
        Long orden = reservar(mypeId("20601234567"));

        JsonNode d = esperarFin(ADMIN_DELGADO, orden);
        assertThat(d.get("estado").asText()).isEqualTo("ERROR");
        assertThat(d.get("error").asText()).isEqualTo("Se agotó la cuota de Gemini.");

        // Un GET más no lo relanza: el error se queda hasta que el admin pulse el botón.
        reset(proveedor);
        configurado();
        when(proveedor.diagnosticar(any())).thenReturn(respuesta("Ahora sí", List.of()));
        assertThat(esperarFin(ADMIN_DELGADO, orden).get("estado").asText()).isEqualTo("ERROR");
        verify(proveedor, never()).diagnosticar(any());

        mvc.perform(post("/api/panel/ordenes/{id}/diagnostico-ia", orden).header("Authorization", bearer(ADMIN_DELGADO)))
           .andExpect(status().isAccepted());
        d = esperarFin(ADMIN_DELGADO, orden);
        assertThat(d.get("estado").asText()).isEqualTo("LISTO");
        assertThat(d.get("resumen").asText()).isEqualTo("Ahora sí");
    }

    @Test
    @DisplayName("La respuesta de un intento viejo no pisa la del vigente")
    void intentoViejoNoPisa() throws Exception {
        configurado();
        when(proveedor.diagnosticar(any())).thenReturn(respuesta("primero", List.of()));
        Long orden = reservar(mypeId("20601234567"));
        esperarFin(ADMIN_DELGADO, orden);
        String viejo = diagnosticos.findByOrdenId(orden).orElseThrow().getIntento();

        when(proveedor.diagnosticar(any())).thenReturn(respuesta("vigente", List.of()));
        mvc.perform(post("/api/panel/ordenes/{id}/diagnostico-ia", orden).header("Authorization", bearer(ADMIN_DELGADO)))
           .andExpect(status().isAccepted());
        assertThat(esperarFin(ADMIN_DELGADO, orden).get("resumen").asText()).isEqualTo("vigente");
        assertThat(diagnosticos.findByOrdenId(orden).orElseThrow().getIntento()).isNotEqualTo(viejo);

        // El intento viejo vuelve tarde: ni se llama a la IA ni se guarda nada.
        clearInvocations(proveedor);
        when(proveedor.diagnosticar(any())).thenReturn(respuesta("tardío", List.of()));
        servicio.generar(orden, viejo);
        verify(proveedor, never()).diagnosticar(any());

        // Y aunque llegara a guardar, el UPDATE lo rechaza.
        int filas = new org.springframework.transaction.support.TransactionTemplate(transacciones)
                .execute(s -> diagnosticos.guardarSiVigente(orden, viejo, EstadoDiagnostico.LISTO, "m",
                        "{}", null, 0, 0, OffsetDateTime.now()));
        assertThat(filas).isZero();
        assertThat(esperarFin(ADMIN_DELGADO, orden).get("resumen").asText()).isEqualTo("vigente");
    }

    @Autowired org.springframework.transaction.PlatformTransactionManager transacciones;
    @Autowired pe.techserv.visita.ServicioEnlaces enlaces;
    @Autowired pe.techserv.orden.OrdenServicioRepository ordenesRepo;

    @Test
    @DisplayName("El técnico ve la guía resumida mientras dura la visita: sin precios ni repuestos ajenos")
    void guiaDelTecnico() throws Exception {
        Long delgado = mypeId("20601234567");
        Long rodaje = repuestoId(delgado, "Rodaje de lavadora 6205");
        Long ajeno = repuestoId(mypeId("20609876543"), "Bomba de desagüe");
        configurado();
        when(proveedor.diagnosticar(any())).thenReturn(respuesta("x", List.of(rodaje, ajeno)));

        Long orden = reservar(delgado);
        subirFotos(orden, 1, 1024);
        assertThat(esperarFin(ADMIN_DELGADO, orden).get("estado").asText()).isEqualTo("LISTO");
        String token = asignarYEnlace(orden, delgado);

        JsonNode guia = visita(token).get("guiaIa");
        assertThat(guia).isNotNull();
        assertThat(guia.at("/equipo/marca").asText()).isEqualTo("LG");
        assertThat(guia.at("/equipo/modelo").asText()).isEqualTo("WM3400");
        assertThat(guia.get("repuestos")).hasSize(1);
        assertThat(guia.at("/repuestos/0/nombre").asText()).isEqualTo("Rodaje de lavadora 6205");
        assertThat(guia.at("/repuestos/0/sinStock").asBoolean()).isFalse();
        assertThat(guia.get("herramientas").toString()).contains("Llave de 10 mm", "Multímetro");
        assertThat(guia.get("quizaFalten").toString()).contains("Retén del tambor");
        assertThat(guia.at("/revisar/0/falla").asText()).isEqualTo("Rodaje desgastado");
        assertThat(guia.at("/revisar/0/queHacer").asText()).isEqualTo("Cambiar el rodaje");
        assertThat(guia.get("precauciones").toString()).contains("Desconectar la lavadora");
        // Resumida: sin precios, sin ids, y nada del inventario de otro taller.
        assertThat(guia.toString()).doesNotContain("precio").doesNotContain("repuestoId")
                                   .doesNotContain("Bomba de desagüe");

        // Sin stock en el taller: se le avisa para que no salga a buscarlo al almacén.
        Integer stockAntes = jdbc.queryForObject("SELECT stock FROM repuesto WHERE id = ?", Integer.class, rodaje);
        jdbc.update("UPDATE repuesto SET stock = 0 WHERE id = ?", rodaje);
        try {
            assertThat(visita(token).at("/guiaIa/repuestos/0/sinStock").asBoolean()).isTrue();
        } finally {
            jdbc.update("UPDATE repuesto SET stock = ? WHERE id = ?", stockAntes, rodaje);
        }
    }

    @Test
    @DisplayName("La guía sale hasta «en camino» y desaparece al entrar al domicilio; sin diagnóstico no hay guía ni se lanza nada")
    void guiaSoloDuranteLaVisita() throws Exception {
        Long delgado = mypeId("20601234567");
        when(proveedor.configurado()).thenReturn(true);

        // Sin diagnóstico: el técnico no ve guía y abrir su página no llama a la IA.
        Long sinDiagnostico = reservar(delgado);
        String token = asignarYEnlace(sinDiagnostico, delgado);
        assertThat(visita(token).has("guiaIa")).isFalse();
        verify(proveedor, never()).diagnosticar(any());
        assertThat(diagnosticos.findByOrdenId(sinDiagnostico)).isEmpty();

        // Con diagnóstico, pero la orden ya terminó: la guía ya no sirve y no se manda.
        configurado();
        when(proveedor.diagnosticar(any())).thenReturn(respuesta("x", List.of()));
        Long terminada = reservar(delgado);
        assertThat(esperarFin(ADMIN_DELGADO, terminada).get("estado").asText()).isEqualTo("LISTO");
        String token2 = asignarYEnlace(terminada, delgado);
        for (String estado : List.of("ASIGNADA", "CONFIRMADA", "EN_CAMINO")) {
            jdbc.update("UPDATE orden_servicio SET estado = ? WHERE id = ?", estado, terminada);
            assertThat(visita(token2).has("guiaIa")).as("con la orden %s", estado).isTrue();
        }
        // Ya en el domicilio ("Terminado" en su página) y después, la guía no se manda.
        for (String estado : List.of("EN_PROCESO", "COMPLETADA")) {
            jdbc.update("UPDATE orden_servicio SET estado = ? WHERE id = ?", estado, terminada);
            assertThat(visita(token2).has("guiaIa")).as("con la orden %s", estado).isFalse();
        }
    }

    /** Le da la orden a un técnico activo del taller y devuelve el token de su enlace. */
    private String asignarYEnlace(Long orden, Long mype) {
        Long tecnico = jdbc.queryForObject("""
                SELECT t.id FROM tecnico t JOIN usuario u ON u.id = t.usuario_id
                WHERE t.mype_id = ? AND u.activo ORDER BY t.id LIMIT 1
                """, Long.class, mype);
        jdbc.update("UPDATE orden_servicio SET tecnico_id = ?, estado = 'ASIGNADA' WHERE id = ?", tecnico, orden);
        String url = enlaces.crear(ordenesRepo.findById(orden).orElseThrow());
        return url.substring(url.indexOf("/visita/") + "/visita/".length());
    }

    private JsonNode visita(String token) throws Exception {
        return json.readTree(mvc.perform(get("/api/visita/{t}", token))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString());
    }

    @Test
    @DisplayName("Las fotos que no caben en el límite de bytes se omiten y se cuentan")
    void limiteDeBytes() throws Exception {
        configurado();
        when(proveedor.diagnosticar(any())).thenReturn(respuesta("x", List.of()));
        Object antes = ReflectionTestUtils.getField(servicio, "maxBytesFotos");
        ReflectionTestUtils.setField(servicio, "maxBytesFotos", 1500L);
        try {
            Long orden = reservar(mypeId("20601234567"));
            subirFotos(orden, 2, 1000);

            JsonNode d = esperarFin(ADMIN_DELGADO, orden);
            assertThat(d.get("fotosAnalizadas").asInt()).isEqualTo(1);
            assertThat(d.get("fotosOmitidas").asInt()).isEqualTo(1);
        } finally {
            ReflectionTestUtils.setField(servicio, "maxBytesFotos", antes);
        }
    }

    // ── utilidades ──

    private void configurado() {
        when(proveedor.configurado()).thenReturn(true);
        when(proveedor.modelo()).thenReturn("modelo-de-prueba");
    }

    private static ProveedorDiagnostico.Diagnostico respuesta(String resumen, List<Long> repuestos) {
        return new ProveedorDiagnostico.Diagnostico(new RespuestaIa(
                new RespuestaIa.Equipo("Lavadora", "LG", "WM3400", "FOTO"),
                resumen,
                List.of(new RespuestaIa.Falla("Rodaje desgastado", "ALTA", "Ruido al centrifugar", "Cambiar el rodaje")),
                repuestos.stream().map(id -> new RespuestaIa.RepuestoElegido(id, "Para el tambor")).toList(),
                List.of(new RespuestaIa.OtroRepuesto("Retén del tambor", "Suele cambiarse con el rodaje")),
                List.of("Desconectar la lavadora"),
                List.of("Llave de 10 mm", "Multímetro")), "modelo-que-respondio");
    }

    /** Espera a que el diagnóstico deje de estar PENDIENTE (el proveedor falso responde al instante). */
    private JsonNode esperarFin(String admin, Long orden) throws Exception {
        long limite = System.currentTimeMillis() + 10_000;
        while (true) {
            String cuerpo = mvc.perform(get("/api/panel/ordenes/{id}/diagnostico-ia", orden)
                            .header("Authorization", bearer(admin)))
                    .andExpect(status().isOk())
                    .andReturn().getResponse().getContentAsString();
            JsonNode d = json.readTree(cuerpo);
            if (!"PENDIENTE".equals(d.get("estado").asText())) return d;
            if (System.currentTimeMillis() > limite) {
                throw new AssertionError("El diagnóstico sigue PENDIENTE tras 10 s");
            }
            Thread.sleep(50);
        }
    }

    private Long reservar(Long mype) throws Exception {
        String token = bearer(CLIENTE);
        // Cada orden en un día lejano y propio: no gasta el aforo de las franjas de otras pruebas.
        for (int intento = 0; intento < 14; intento++) {
            LocalDate dia = LocalDate.now().plusDays(diaLibre++);
            var r = mvc.perform(post("/api/mis-ordenes")
                    .header("Authorization", token)
                    .contentType("application/json")
                    .content("""
                             {
                               "mypeId": %d,
                               "especialidad": "REPARACION_ELECTRODOMESTICOS",
                               "descripcionFalla": "La lavadora no centrifuga y hace un ruido fuerte",
                               "direccion": "Urb. Primavera, Mz. C Lt. 14",
                               "distrito": "Trujillo",
                               "fecha": "%s",
                               "hora": "10:00",
                               "metodoPago": "EFECTIVO"
                             }
                             """.formatted(mype, dia)))
                    .andReturn().getResponse();
            if (r.getStatus() == 201) {
                Long id = json.readTree(r.getContentAsString()).get("id").asLong();
                ordenesCreadas.add(id);
                return id;
            }
        }
        throw new AssertionError("No se pudo reservar en ningún día de prueba");
    }

    private void subirFotos(Long orden, int cuantas, int bytes) throws Exception {
        var peticion = multipart("/api/mis-ordenes/{id}/fotos", orden);
        for (int i = 0; i < cuantas; i++) {
            peticion.file(new MockMultipartFile("fotos", "averia-" + i + ".jpg", "image/jpeg", new byte[bytes]));
        }
        mvc.perform(peticion.header("Authorization", bearer(CLIENTE))).andExpect(status().isOk());
    }

    private Long mypeId(String ruc) {
        return jdbc.queryForObject("SELECT id FROM mype WHERE ruc = ?", Long.class, ruc);
    }

    private Long repuestoId(Long mype, String nombre) {
        return jdbc.queryForObject("SELECT id FROM repuesto WHERE mype_id = ? AND nombre = ?", Long.class, mype, nombre);
    }

    private Long crearRepuestoInactivo(Long mype) {
        var clave = new GeneratedKeyHolder();
        jdbc.update(conexion -> {
            var insert = conexion.prepareStatement("""
                    INSERT INTO repuesto (mype_id, nombre, descripcion, precio, stock, activo)
                    VALUES (?, 'Repuesto retirado de prueba', 'No se vende', 10.00, 3, FALSE)
                    """, Statement.RETURN_GENERATED_KEYS);
            insert.setLong(1, mype);
            return insert;
        }, clave);
        Long id = clave.getKey().longValue();
        repuestosCreados.add(id);
        return id;
    }

    private String bearer(String email) throws Exception {
        String cuerpo = mvc.perform(post("/api/auth/login")
                        .contentType("application/json")
                        .content("""
                                 {"email": "%s", "clave": "%s"}
                                 """.formatted(email, CLAVE)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return "Bearer " + json.readTree(cuerpo).get("token").asText();
    }
}
