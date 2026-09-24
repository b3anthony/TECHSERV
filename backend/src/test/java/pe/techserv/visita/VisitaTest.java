package pe.techserv.visita;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.support.TransactionTemplate;
import pe.techserv.BasePruebaIntegracion;
import pe.techserv.comun.Especialidad;
import pe.techserv.mype.Mype;
import pe.techserv.mype.MypeRepository;
import pe.techserv.mype.Repuesto;
import pe.techserv.mype.RepuestoRepository;
import pe.techserv.mype.Tecnico;
import pe.techserv.mype.TecnicoRepository;
import pe.techserv.orden.ActorHistorial;
import pe.techserv.orden.EstadoOrden;
import pe.techserv.orden.OrdenHistorial;
import pe.techserv.orden.OrdenHistorialRepository;
import pe.techserv.orden.OrdenServicio;
import pe.techserv.orden.OrdenServicioRepository;
import pe.techserv.pago.PagoRepository;
import pe.techserv.usuario.ClienteRepository;
import pe.techserv.usuario.Usuario;
import pe.techserv.usuario.UsuarioRepository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * La pagina del tecnico: lo que puede hacer con su enlace y, sobre todo, lo que
 * NO puede hacer con un enlace que no vale.
 */
@AutoConfigureMockMvc
class VisitaTest extends BasePruebaIntegracion {

    private static final String RUC_DELGADO    = "20601234567";
    private static final String RUC_TECNOHOGAR = "20609876543";

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired ServicioEnlaces servicioEnlaces;
    @Autowired EnlaceTecnicoRepository enlaces;
    @Autowired OrdenServicioRepository ordenes;
    @Autowired OrdenHistorialRepository historial;
    @Autowired MypeRepository mypes;
    @Autowired ClienteRepository clientes;
    @Autowired TecnicoRepository tecnicos;
    @Autowired UsuarioRepository usuarios;
    @Autowired RepuestoRepository repuestos;
    @Autowired PagoRepository pagos;
    @Autowired TransactionTemplate tx;

    // ── preparacion ──

    private Long mype(String ruc) {
        return mypes.findAll().stream().filter(m -> ruc.equals(m.getRuc())).findFirst().orElseThrow().getId();
    }

    /** Los tecnicos en activo: otra clase de pruebas da de baja a alguno en la base compartida. */
    private List<Tecnico> activos(Long mypeId) {
        return tx.execute(estado -> tecnicos.findByMypeIdOrderByIdAsc(mypeId).stream()
                .filter(t -> t.getUsuario().isActivo())
                .toList());
    }

    /** El usuario del tecnico de la orden, leido dentro de una transaccion (la relacion es perezosa). */
    private Usuario usuarioDelTecnico(OrdenServicio orden) {
        return tx.execute(estado -> {
            Usuario u = ordenes.findById(orden.getId()).orElseThrow().getTecnico().getUsuario();
            u.getNombres();
            return u;
        });
    }

    private OrdenServicio fabricarOrden(Long mypeId, Tecnico tecnico, EstadoOrden estado) {
        Mype mype = mypes.findById(mypeId).orElseThrow();
        OrdenServicio orden = new OrdenServicio();
        orden.setCodigo("ORD-V" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase());
        orden.setCliente(clientes.findAll().stream().findFirst().orElseThrow());
        orden.setMype(mype);
        orden.setTecnico(tecnico);
        orden.setEspecialidad(Especialidad.REPARACION_ELECTRODOMESTICOS);
        orden.setDescripcionFalla("La lavadora no centrifuga");
        orden.setDireccion("Av. España 1234");
        orden.setDistrito("Trujillo");
        orden.setFechaProgramada(LocalDate.now());
        orden.setHoraProgramada(LocalTime.of(10, 0));
        orden.setEstado(estado);
        orden.setCreadaEn(OffsetDateTime.now());
        orden.setActualizadaEn(OffsetDateTime.now());
        return ordenes.save(orden);
    }

    private OrdenServicio ordenDelgado(EstadoOrden estado) {
        Long mypeId = mype(RUC_DELGADO);
        return fabricarOrden(mypeId, activos(mypeId).get(0), estado);
    }

    /** El token es lo que va detras de /visita/ en la URL que devuelve el servicio. */
    private String tokenPara(OrdenServicio orden) {
        String url = servicioEnlaces.crear(orden);
        return url.substring(url.indexOf("/visita/") + "/visita/".length());
    }

    private String sesion(String email) throws Exception {
        String cuerpo = mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\": \"%s\", \"clave\": \"demo1234\"}".formatted(email)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return json.readTree(cuerpo).get("token").asText();
    }

    private EstadoOrden estadoDe(OrdenServicio orden) {
        return ordenes.findById(orden.getId()).orElseThrow().getEstado();
    }

    // ── el recorrido ──

    @Test
    @DisplayName("Con su enlace, el técnico lleva la orden de asignada a cobrada y todo queda a su nombre")
    void recorridoCompleto() throws Exception {
        OrdenServicio orden = ordenDelgado(EstadoOrden.ASIGNADA);
        String token = tokenPara(orden);
        Usuario tecnico = usuarioDelTecnico(orden);
        String nombres = tecnico.getNombres();

        mvc.perform(get("/api/visita/{t}", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.codigo").value(orden.getCodigo()))
                .andExpect(jsonPath("$.tecnicoNombres").value(nombres))
                .andExpect(jsonPath("$.estado").value("ASIGNADA"))
                .andExpect(jsonPath("$.catalogo", hasSize(0)));

        mvc.perform(post("/api/visita/{t}/confirmar", token)).andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("CONFIRMADA"));
        mvc.perform(post("/api/visita/{t}/en-camino", token)).andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("EN_CAMINO"));
        mvc.perform(post("/api/visita/{t}/llegue", token)).andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("EN_PROCESO"));

        Repuesto repuesto = repuestos.findByMypeIdAndActivoTrueOrderByNombreAsc(mype(RUC_DELGADO)).get(0);
        repuesto.setStock(40);
        repuestos.save(repuesto);
        BigDecimal total = new BigDecimal("70.00").add(repuesto.getPrecio());

        mvc.perform(post("/api/visita/{t}/terminar", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                 {"diagnostico": "Cambio de faja", "precioManoObra": 70.00,
                                  "repuestos": [{"repuestoId": %d, "cantidad": 1}]}
                                 """.formatted(repuesto.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("COMPLETADA"))
                .andExpect(jsonPath("$.total").value(total.doubleValue()));
        assertThat(repuestos.findById(repuesto.getId()).orElseThrow().getStock()).isEqualTo(39);

        mvc.perform(post("/api/visita/{t}/cobro", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"metodo\": \"YAPE\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pago.metodo").value("YAPE"))
                .andExpect(jsonPath("$.pago.cobradoPor").value(tecnico.getNombreCompleto()));

        // El taller lo ve en su panel: quien cobro, y cada paso anotado al tecnico.
        mvc.perform(get("/api/panel/ordenes/{id}/pago", orden.getId())
                        .header("Authorization", "Bearer " + sesion("jorge@serviciosdelgado.pe")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cobradoPor").value(tecnico.getNombreCompleto()));

        List<OrdenHistorial> pasos = historial.findByOrdenIdOrderByOcurridoEnAsc(orden.getId());
        assertThat(pasos).extracting(OrdenHistorial::getEstadoNuevo).containsExactly(
                EstadoOrden.CONFIRMADA, EstadoOrden.EN_CAMINO, EstadoOrden.EN_PROCESO, EstadoOrden.COMPLETADA);
        assertThat(pasos).allMatch(p -> p.getActor() == ActorHistorial.TECNICO);
    }

    @Test
    @DisplayName("Un doble toque no anota dos veces el mismo paso")
    void dobleToque() throws Exception {
        OrdenServicio orden = ordenDelgado(EstadoOrden.ASIGNADA);
        String token = tokenPara(orden);

        mvc.perform(post("/api/visita/{t}/confirmar", token)).andExpect(status().isOk());
        mvc.perform(post("/api/visita/{t}/confirmar", token)).andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("CONFIRMADA"));

        assertThat(historial.findByOrdenIdOrderByOcurridoEnAsc(orden.getId())).hasSize(1);
    }

    @Test
    @DisplayName("No se puede saltar un paso ni cobrar dos veces")
    void pasosFueraDeOrden() throws Exception {
        OrdenServicio orden = ordenDelgado(EstadoOrden.ASIGNADA);
        String token = tokenPara(orden);

        mvc.perform(post("/api/visita/{t}/llegue", token)).andExpect(status().isConflict());
        mvc.perform(post("/api/visita/{t}/cobro", token)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"metodo\": \"EFECTIVO\"}"))
                .andExpect(status().isConflict());
        assertThat(estadoDe(orden)).isEqualTo(EstadoOrden.ASIGNADA);

        OrdenServicio cerrada = ordenDelgado(EstadoOrden.COMPLETADA);
        cerrada.setTotal(new BigDecimal("50.00"));
        cerrada.setPrecioManoObra(new BigDecimal("50.00"));
        ordenes.save(cerrada);
        String otro = tokenPara(cerrada);
        mvc.perform(post("/api/visita/{t}/cobro", otro)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"metodo\": \"EFECTIVO\"}"))
                .andExpect(status().isOk());
        mvc.perform(post("/api/visita/{t}/cobro", otro)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"metodo\": \"PLIN\"}"))
                .andExpect(status().isConflict());
        assertThat(pagos.findByOrdenId(cerrada.getId()).orElseThrow().getMetodo().name()).isEqualTo("EFECTIVO");
    }

    // ── los enlaces que no valen ──

    @Test
    @DisplayName("Un token inventado, vencido o de una orden reasignada responde 404 y no toca nada")
    void enlacesQueNoValen() throws Exception {
        mvc.perform(get("/api/visita/{t}", "a".repeat(43))).andExpect(status().isNotFound());
        mvc.perform(get("/api/visita/{t}", "corto")).andExpect(status().isNotFound());

        // Vencido
        OrdenServicio vencida = ordenDelgado(EstadoOrden.ASIGNADA);
        String tokenVencido = tokenPara(vencida);
        tx.executeWithoutResult(estado -> {
            EnlaceTecnico fila = enlaces.findByOrdenId(vencida.getId()).get(0);
            fila.setExpiraEn(OffsetDateTime.now().minusMinutes(1));
        });
        mvc.perform(post("/api/visita/{t}/confirmar", tokenVencido)).andExpect(status().isNotFound());
        assertThat(estadoDe(vencida)).isEqualTo(EstadoOrden.ASIGNADA);

        // La orden paso a otro tecnico: el enlace del primero deja de valer
        Long mypeId = mype(RUC_DELGADO);
        List<Tecnico> equipo = activos(mypeId);
        assertThat(equipo).hasSizeGreaterThanOrEqualTo(2);
        OrdenServicio reasignada = fabricarOrden(mypeId, equipo.get(0), EstadoOrden.ASIGNADA);
        String tokenDelPrimero = tokenPara(reasignada);
        reasignada.setTecnico(equipo.get(1));
        ordenes.save(reasignada);
        mvc.perform(get("/api/visita/{t}", tokenDelPrimero)).andExpect(status().isNotFound());
        mvc.perform(post("/api/visita/{t}/confirmar", tokenDelPrimero)).andExpect(status().isNotFound());
        assertThat(estadoDe(reasignada)).isEqualTo(EstadoOrden.ASIGNADA);
    }

    @Test
    @DisplayName("Si el técnico se da de baja, su enlace deja de valer")
    void tecnicoDadoDeBaja() throws Exception {
        OrdenServicio orden = ordenDelgado(EstadoOrden.ASIGNADA);
        String token = tokenPara(orden);
        Usuario usuario = usuarioDelTecnico(orden);

        usuario.setActivo(false);
        usuarios.save(usuario);
        try {
            mvc.perform(post("/api/visita/{t}/confirmar", token)).andExpect(status().isNotFound());
            assertThat(estadoDe(orden)).isEqualTo(EstadoOrden.ASIGNADA);
        } finally {
            usuario.setActivo(true);
            usuarios.save(usuario);
        }
    }

    // ── fotos ──

    @Test
    @DisplayName("Las fotos del trabajo se suben al empezar y el taller las ve aparte de las del cliente")
    void fotosDelTrabajo() throws Exception {
        OrdenServicio orden = ordenDelgado(EstadoOrden.EN_CAMINO);
        String token = tokenPara(orden);
        MockMultipartFile foto = new MockMultipartFile("fotos", "trabajo.png", "image/png", new byte[] {(byte) 0x89, 'P', 'N', 'G'});

        mvc.perform(multipart("/api/visita/{t}/fotos", token).file(foto)).andExpect(status().isConflict());

        mvc.perform(post("/api/visita/{t}/llegue", token)).andExpect(status().isOk());
        mvc.perform(multipart("/api/visita/{t}/fotos", token).file(foto))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fotosTrabajo", hasSize(1)))
                .andExpect(jsonPath("$.fotosCliente", hasSize(0)));

        mvc.perform(get("/api/panel/ordenes/{id}", orden.getId())
                        .header("Authorization", "Bearer " + sesion("jorge@serviciosdelgado.pe")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fotosTrabajo", hasSize(1)))
                .andExpect(jsonPath("$.fotos", hasSize(0)));
    }

    // ── el enlace desde el panel ──

    @Test
    @DisplayName("El taller puede pedir el enlace de su orden, pero no el de una orden de otro taller")
    void enlaceDesdeElPanel() throws Exception {
        OrdenServicio propia = ordenDelgado(EstadoOrden.ASIGNADA);
        Long otroTaller = mype(RUC_TECNOHOGAR);
        OrdenServicio ajena = fabricarOrden(otroTaller, activos(otroTaller).get(0), EstadoOrden.ASIGNADA);
        String jorge = sesion("jorge@serviciosdelgado.pe");

        String cuerpo = mvc.perform(post("/api/panel/ordenes/{id}/enlace-tecnico", propia.getId())
                        .header("Authorization", "Bearer " + jorge))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.url", containsString("/visita/")))
                .andReturn().getResponse().getContentAsString();
        String url = json.readTree(cuerpo).get("url").asText();
        mvc.perform(get("/api/visita/{t}", url.substring(url.indexOf("/visita/") + 8)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.codigo").value(propia.getCodigo()));

        int antes = enlaces.findByOrdenId(ajena.getId()).size();
        mvc.perform(post("/api/panel/ordenes/{id}/enlace-tecnico", ajena.getId())
                        .header("Authorization", "Bearer " + jorge))
                .andExpect(status().isNotFound());
        assertThat(enlaces.findByOrdenId(ajena.getId())).hasSize(antes);
    }
}
