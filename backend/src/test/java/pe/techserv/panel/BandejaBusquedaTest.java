package pe.techserv.panel;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import pe.techserv.BasePruebaIntegracion;
import pe.techserv.comun.Especialidad;
import pe.techserv.mype.MypeRepository;
import pe.techserv.mype.Tecnico;
import pe.techserv.mype.TecnicoRepository;
import pe.techserv.orden.EstadoOrden;
import pe.techserv.orden.OrdenServicio;
import pe.techserv.orden.OrdenServicioRepository;
import pe.techserv.usuario.Cliente;
import pe.techserv.usuario.ClienteRepository;
import pe.techserv.usuario.UsuarioRepository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * El buscador y los filtros de la bandeja del taller.
 *
 * Cada prueba registra SU taller y le fabrica las órdenes: así lo que se
 * cuenta es exactamente lo que la prueba sembró, aunque las demás clases
 * compartan la base.
 */
@AutoConfigureMockMvc
class BandejaBusquedaTest extends BasePruebaIntegracion {

    private static final String CLAVE = "demo1234";

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired MypeRepository mypes;
    @Autowired TecnicoRepository tecnicos;
    @Autowired UsuarioRepository usuarios;
    @Autowired ClienteRepository clientes;
    @Autowired OrdenServicioRepository ordenes;

    private record Taller(Long mypeId, String token) {}

    @Test
    @DisplayName("Busca por código, número suelto, cliente sin tilde, distrito y texto de la falla")
    void buscaEnVariosCampos() throws Exception {
        Taller t = registrar();
        OrdenServicio lavadora = orden(t, "Rosa", "Chávez", "La lavadora no centrifuga", "Víctor Larco", LocalDate.now().plusDays(1));
        OrdenServicio cocina = orden(t, "Luis", "Paredes", "La cocina no prende", "Huanchaco", LocalDate.now().plusDays(2));

        assertThat(codigos(t, "q", lavadora.getCodigo())).containsExactly(lavadora.getCodigo());
        assertThat(codigos(t, "q", lavadora.getCodigo().substring(5))).containsExactly(lavadora.getCodigo());
        assertThat(codigos(t, "q", "CHAVEZ")).containsExactly(lavadora.getCodigo());
        assertThat(codigos(t, "q", "rosa chávez")).containsExactly(lavadora.getCodigo());
        assertThat(codigos(t, "q", "victor larco")).containsExactly(lavadora.getCodigo());
        assertThat(codigos(t, "q", "COCINA")).containsExactly(cocina.getCodigo());
        assertThat(codigos(t, "q", "no ")).containsExactlyInAnyOrder(lavadora.getCodigo(), cocina.getCodigo());
        assertThat(codigos(t, "q", "refrigeradora")).isEmpty();
    }

    @Test
    @DisplayName("El nombre del técnico también se busca, sin tildes")
    void buscaPorTecnico() throws Exception {
        Taller t = registrar();
        Tecnico tec = altaTecnico(t, "Begoña", "Núñez");
        OrdenServicio asignada = orden(t, "Rosa", "Chávez", "Sin agua caliente", "Trujillo", LocalDate.now().plusDays(1));
        asignar(asignada, tec);
        orden(t, "Rosa", "Chávez", "Gotea el caño", "Trujillo", LocalDate.now().plusDays(1));

        assertThat(codigos(t, "q", "begona nunez")).containsExactly(asignada.getCodigo());
    }

    @Test
    @DisplayName("% y _ se buscan como texto, no como comodines")
    void comodinesLiterales() throws Exception {
        Taller t = registrar();
        OrdenServicio conPorcentaje = orden(t, "Rosa", "Chávez", "Batería al 5% y no carga", "Trujillo", LocalDate.now().plusDays(1));
        orden(t, "Rosa", "Chávez", "Batería al 50 y no carga", "Trujillo", LocalDate.now().plusDays(1));
        orden(t, "Rosa", "Chávez", "Pantalla azul", "Trujillo", LocalDate.now().plusDays(1));

        assertThat(codigos(t, "q", "5%")).containsExactly(conPorcentaje.getCodigo());
        assertThat(codigos(t, "q", "%")).containsExactly(conPorcentaje.getCodigo());
        assertThat(codigos(t, "q", "_")).isEmpty();
    }

    @Test
    @DisplayName("Una búsqueda que solo coincide en OTRO taller no devuelve ni cuenta nada")
    void otroTallerNoAparece() throws Exception {
        Taller mio = registrar();
        Taller otro = registrar();
        String marca = "Zx" + UUID.randomUUID().toString().substring(0, 8);
        OrdenServicio ajena = orden(otro, "Rosa", "Chávez", "Equipo " + marca, "Trujillo", LocalDate.now().plusDays(1));

        assertThat(codigos(mio, "q", marca)).isEmpty();
        assertThat(codigos(mio, "q", ajena.getCodigo())).isEmpty();
        conteos(mio, "q", marca)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(0))
                .andExpect(jsonPath("$.porEstado.PENDIENTE").value(0));
        // y el dueño sí la ve
        assertThat(codigos(otro, "q", marca)).containsExactly(ajena.getCodigo());
    }

    @Test
    @DisplayName("Filtrar por un técnico de otro taller responde 404")
    void tecnicoAjeno() throws Exception {
        Taller mio = registrar();
        Taller otro = registrar();
        Tecnico ajeno = altaTecnico(otro, "Pepe", "Ajeno");

        mvc.perform(conSesion(mio, get("/api/panel/ordenes")).param("tecnicoId", ajeno.getId().toString()))
                .andExpect(status().isNotFound());
        mvc.perform(conSesion(mio, get("/api/panel/ordenes/conteos")).param("tecnicoId", ajeno.getId().toString()))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Por técnico, sin técnico y por rango de fechas inclusivo")
    void filtrosDeTecnicoYFecha() throws Exception {
        Taller t = registrar();
        Tecnico tec = altaTecnico(t, "Ana", "Ríos");
        LocalDate base = LocalDate.now().plusDays(10);
        OrdenServicio d0 = orden(t, "Rosa", "Chávez", "Uno", "Trujillo", base);
        OrdenServicio d1 = orden(t, "Rosa", "Chávez", "Dos", "Trujillo", base.plusDays(1));
        OrdenServicio d2 = orden(t, "Rosa", "Chávez", "Tres", "Trujillo", base.plusDays(2));
        asignar(d1, tec);

        assertThat(codigos(t, "tecnicoId", tec.getId().toString())).containsExactly(d1.getCodigo());
        assertThat(codigos(t, "sinTecnico", "true")).containsExactlyInAnyOrder(d0.getCodigo(), d2.getCodigo());
        assertThat(codigos(t, "desde", base.plusDays(1).toString(), "hasta", base.plusDays(2).toString()))
                .containsExactlyInAnyOrder(d1.getCodigo(), d2.getCodigo());
        assertThat(codigos(t, "desde", base.toString(), "hasta", base.toString())).containsExactly(d0.getCodigo());
    }

    @Test
    @DisplayName("Recientes primero por defecto; próximas primero si se pide")
    void ordenDeLaLista() throws Exception {
        Taller t = registrar();
        LocalDate base = LocalDate.now().plusDays(20);
        OrdenServicio a = orden(t, "Rosa", "Chávez", "A", "Trujillo", base);
        OrdenServicio b = orden(t, "Rosa", "Chávez", "B", "Trujillo", base.plusDays(3));
        OrdenServicio c = orden(t, "Rosa", "Chávez", "C", "Trujillo", base.plusDays(1));

        assertThat(codigos(t)).containsExactly(b.getCodigo(), c.getCodigo(), a.getCodigo());
        assertThat(codigos(t, "orden", "PROXIMAS")).containsExactly(a.getCodigo(), c.getCodigo(), b.getCodigo());
    }

    @Test
    @DisplayName("Parámetros inválidos: 400, nunca 500")
    void parametrosInvalidos() throws Exception {
        Taller t = registrar();
        LocalDate hoy = LocalDate.now();

        lista(t, "q", "x".repeat(81)).andExpect(status().isBadRequest());
        lista(t, "q", "x".repeat(80)).andExpect(status().isOk());
        lista(t, "desde", hoy.plusDays(1).toString(), "hasta", hoy.toString()).andExpect(status().isBadRequest());
        lista(t, "orden", "AL_REVES").andExpect(status().isBadRequest());
        lista(t, "estado", "NADA").andExpect(status().isBadRequest());
        lista(t, "desde", "ayer").andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Los conteos por etapa coinciden con lo que devuelve la lista con el mismo filtro")
    void conteosCuadranConLaLista() throws Exception {
        Taller t = registrar();
        Tecnico tec = altaTecnico(t, "Ana", "Ríos");
        String marca = "Kq" + UUID.randomUUID().toString().substring(0, 6);
        orden(t, "Rosa", "Chávez", marca + " uno", "Trujillo", LocalDate.now().plusDays(1));
        orden(t, "Rosa", "Chávez", marca + " dos", "Trujillo", LocalDate.now().plusDays(1));
        OrdenServicio asignada = orden(t, "Rosa", "Chávez", marca + " tres", "Trujillo", LocalDate.now().plusDays(2));
        asignar(asignada, tec);
        orden(t, "Rosa", "Chávez", "otra cosa", "Trujillo", LocalDate.now().plusDays(1));

        JsonNode conteo = json.readTree(conteos(t, "q", marca)
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertThat(conteo.get("total").asLong()).isEqualTo(3);
        for (EstadoOrden e : EstadoOrden.values()) {
            long enLista = codigos(t, "q", marca, "estado", e.name()).size();
            assertThat(conteo.at("/porEstado/" + e.name()).asLong()).as(e.name()).isEqualTo(enLista);
        }
        assertThat(conteo.at("/porEstado/PENDIENTE").asLong()).isEqualTo(2);
        assertThat(conteo.at("/porEstado/ASIGNADA").asLong()).isEqualTo(1);
    }

    // ───────────────────────────── ayudas ─────────────────────────────

    private List<String> codigos(Taller t, String... params) throws Exception {
        JsonNode pagina = json.readTree(lista(t, params)
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        List<String> codigos = new ArrayList<>();
        pagina.get("content").forEach(o -> codigos.add(o.get("codigo").asText()));
        return codigos;
    }

    private ResultActions lista(Taller t, String... params) throws Exception {
        return mvc.perform(conParams(conSesion(t, get("/api/panel/ordenes")).param("tamano", "100"), params));
    }

    private ResultActions conteos(Taller t, String... params) throws Exception {
        return mvc.perform(conParams(conSesion(t, get("/api/panel/ordenes/conteos")), params));
    }

    private static MockHttpServletRequestBuilder conParams(MockHttpServletRequestBuilder peticion, String... params) {
        for (int i = 0; i < params.length; i += 2) {
            peticion.param(params[i], params[i + 1]);
        }
        return peticion;
    }

    private static MockHttpServletRequestBuilder conSesion(Taller t, MockHttpServletRequestBuilder peticion) {
        return peticion.header("Authorization", "Bearer " + t.token());
    }

    private Taller registrar() throws Exception {
        String email = "admin." + UUID.randomUUID() + "@taller.pe";
        String ruc = "10" + String.format("%09d", ThreadLocalRandom.current().nextLong(1_000_000_000L));
        String cuerpo = mvc.perform(post("/api/auth/registro/negocio")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                 {
                                   "nombres": "Ana", "apellidos": "Prueba",
                                   "email": "%s", "clave": "%s", "telefono": "987654321",
                                   "razonSocial": "Taller de búsqueda", "ruc": "%s",
                                   "direccion": "Av. Larco 100", "distrito": "Trujillo",
                                   "especialidad": "SERVICIOS_HOGAR", "tarifaBase": 55.00,
                                   "horarios": [{"dia":1,"abre":"08:00","cierra":"18:00"}]
                                 }
                                 """.formatted(email, CLAVE, ruc)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        JsonNode sesion = json.readTree(cuerpo);
        return new Taller(sesion.get("usuario").get("mypeId").asLong(), sesion.get("token").asText());
    }

    private Tecnico altaTecnico(Taller t, String nombres, String apellidos) throws Exception {
        String email = "tec." + UUID.randomUUID() + "@taller.pe";
        mvc.perform(conSesion(t, post("/api/panel/tecnicos"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                 {"nombres": "%s", "apellidos": "%s", "email": "%s", "telefono": ""}
                                 """.formatted(nombres, apellidos, email)))
                .andExpect(status().isCreated());
        return tecnicos.findByUsuarioEmailIgnoreCase(email).orElseThrow();
    }

    /** Un cliente propio por orden: el nombre buscado es exactamente el sembrado. */
    private OrdenServicio orden(Taller t, String nombres, String apellidos, String falla,
                                String distrito, LocalDate fecha) throws Exception {
        String email = "cli." + UUID.randomUUID() + "@correo.pe";
        mvc.perform(post("/api/auth/registro/cliente")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                 {"nombres": "%s", "apellidos": "%s", "email": "%s", "clave": "%s", "telefono": ""}
                                 """.formatted(nombres, apellidos, email, CLAVE)))
                .andExpect(status().isCreated());
        Cliente cliente = clientes.findByUsuarioId(usuarios.findByEmailIgnoreCase(email).orElseThrow().getId())
                .orElseThrow();

        OrdenServicio orden = new OrdenServicio();
        orden.setCodigo("ORD-B" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase());
        orden.setCliente(cliente);
        orden.setMype(mypes.findById(t.mypeId()).orElseThrow());
        orden.setEspecialidad(Especialidad.SERVICIOS_HOGAR);
        orden.setDescripcionFalla(falla);
        orden.setDireccion("Calle Las Palmeras 123");
        orden.setDistrito(distrito);
        orden.setFechaProgramada(fecha);
        orden.setHoraProgramada(LocalTime.of(10, 0));
        orden.setEstado(EstadoOrden.PENDIENTE);
        orden.setCreadaEn(OffsetDateTime.now());
        orden.setActualizadaEn(OffsetDateTime.now());
        return ordenes.save(orden);
    }

    private void asignar(OrdenServicio orden, Tecnico tecnico) {
        OrdenServicio o = ordenes.findById(orden.getId()).orElseThrow();
        o.setTecnico(tecnico);
        o.setEstado(EstadoOrden.ASIGNADA);
        ordenes.save(o);
    }
}
