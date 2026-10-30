package pe.techserv.garantia;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.support.TransactionTemplate;
import pe.techserv.BasePruebaIntegracion;
import pe.techserv.comun.Especialidad;
import pe.techserv.mype.*;
import pe.techserv.orden.*;
import pe.techserv.pago.PagoRepository;
import pe.techserv.reserva.ValidadorAgenda;
import pe.techserv.seguridad.ServicioJwt;
import pe.techserv.usuario.*;
import pe.techserv.visita.ServicioEnlaces;

import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Datos propios por prueba: ninguna depende de que la base compartida esté vacía. */
@AutoConfigureMockMvc
class GarantiaTest extends BasePruebaIntegracion {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;
    @Autowired TransactionTemplate tx;
    @Autowired ServicioJwt jwt;
    @Autowired ServicioEnlaces enlaces;
    @Autowired MypeRepository mypes;
    @Autowired AdministradorRepository administradores;
    @Autowired MypeEspecialidadRepository especialidades;
    @Autowired UsuarioRepository usuarios;
    @Autowired ClienteRepository clientes;
    @Autowired TecnicoRepository tecnicos;
    @Autowired RepuestoRepository repuestos;
    @Autowired OrdenServicioRepository ordenes;
    @Autowired OrdenFotoRepository fotos;
    @Autowired GarantiaRepository garantias;
    @Autowired PagoRepository pagos;
    @MockitoBean JavaMailSender correo;
    @MockitoSpyBean ValidadorAgenda agenda;

    private final List<Long> usuariosCreados = new ArrayList<>();
    private Mype taller, otroTaller;
    private Cliente cliente, otroCliente;
    private Tecnico tecnico;
    private Repuesto instalado, distinto;
    private String sesionCliente, sesionOtroCliente, sesionAdmin, sesionOtroAdmin;

    @BeforeEach
    void preparar() {
        when(correo.createMimeMessage()).thenAnswer(i -> new MimeMessage((Session) null));
        taller = taller();
        otroTaller = taller();
        sesionAdmin = administrador(taller);
        sesionOtroAdmin = administrador(otroTaller);
        cliente = cliente();
        otroCliente = cliente();
        sesionCliente = jwt.paraSesion(cliente.getUsuario());
        sesionOtroCliente = jwt.paraSesion(otroCliente.getUsuario());
        tecnico = new Tecnico();
        tecnico.setMype(taller);
        tecnico.setUsuario(usuario(Rol.TECNICO));
        tecnico.getEspecialidades().add(Especialidad.REPARACION_ELECTRODOMESTICOS);
        tecnico = tecnicos.save(tecnico);
        instalado = repuesto(taller, "Motor instalado", "25.00");
        distinto = repuesto(taller, "Cable nuevo", "12.00");
    }

    @AfterEach
    void limpiar() {
        // InnoDB comprueba garantia_de_id fila a fila (PostgreSQL, al final de la
        // sentencia): primero las garantías y después las órdenes que cubren.
        jdbc.update("DELETE FROM orden_servicio WHERE mype_id IN (?, ?) AND garantia_de_id IS NOT NULL",
                taller.getId(), otroTaller.getId());
        jdbc.update("DELETE FROM orden_servicio WHERE mype_id IN (?, ?)", taller.getId(), otroTaller.getId());
        jdbc.update("DELETE FROM mype WHERE id IN (?, ?)", taller.getId(), otroTaller.getId());
        for (Long id : usuariosCreados) jdbc.update("DELETE FROM usuario WHERE id = ?", id);
        usuariosCreados.clear();
    }

    @Test
    void panelYTecnicoSellanPlazoCongeladoAlCerrar() throws Exception {
        ajuste(60).andExpect(status().isOk());
        OrdenServicio panel = fabricar(EstadoOrden.EN_PROCESO);
        cerrarPanel(panel, "40.00", "[]").andExpect(status().isOk())
                .andExpect(jsonPath("$.garantia.dias").value(60));
        assertPlazo(panel, 60);

        ajuste(90).andExpect(status().isOk());
        OrdenServicio visita = fabricar(EstadoOrden.EN_PROCESO);
        mvc.perform(post("/api/visita/{token}/terminar", token(visita))
                        .contentType("application/json").content(cierre("35.00", "[]")))
                .andExpect(status().isOk());
        assertPlazo(visita, 90);

        ajuste(30).andExpect(status().isOk());
        assertPlazo(panel, 60);
        assertPlazo(visita, 90);
        mvc.perform(get("/api/mis-ordenes/{id}/seguimiento", panel.getId()).header("Authorization", bearer(sesionCliente)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.garantia.dias").value(60));
    }

    @Test
    void reclamarCopiaLaReparacionYEnlazaLaNuevaOrden() throws Exception {
        OrdenServicio original = reparar(2);
        cliente.setDireccion("El cliente se mudó");
        cliente.setLatitud(new BigDecimal("-8.0000000"));
        clientes.save(cliente);
        JsonNode respuesta = cuerpo(reclamar(original, sesionCliente, "09:00").andExpect(status().isCreated())
                .andExpect(jsonPath("$.tipo").value("GARANTIA"))
                .andExpect(jsonPath("$.estado").value("PENDIENTE"))
                .andExpect(jsonPath("$.atencionGarantia.codigoOriginal").value(original.getCodigo()))
                .andExpect(jsonPath("$.atencionGarantia.repuestosInstalados[0].cantidad").value(2)));
        Long id = respuesta.get("id").asLong();
        tx.executeWithoutResult(s -> {
            OrdenServicio nueva = ordenes.findByIdAndClienteId(id, cliente.getId()).orElseThrow();
            assertThat(nueva.getGarantiaDe().getId()).isEqualTo(original.getId());
            assertThat(nueva.getMype().getId()).isEqualTo(taller.getId());
            assertThat(nueva.getCliente().getId()).isEqualTo(cliente.getId());
            assertThat(nueva.getEspecialidad()).isEqualTo(original.getEspecialidad());
            assertThat(nueva.getDireccion()).isEqualTo(original.getDireccion());
            assertThat(nueva.getReferencia()).isEqualTo(original.getReferencia());
            assertThat(nueva.getDistrito()).isEqualTo(original.getDistrito());
            assertThat(nueva.getLatitud()).isEqualByComparingTo(original.getLatitud());
            assertThat(nueva.getLongitud()).isEqualByComparingTo(original.getLongitud());
            assertThat(nueva.getMetodoPago()).isEqualTo(original.getMetodoPago());
            assertThat(nueva.getTecnico()).isNull();
            assertThat(nueva.getDescripcionFalla()).isEqualTo("Volvió a fallar el motor instalado");
            assertThat(nueva.getHistorial()).singleElement().extracting(OrdenHistorial::getNota)
                    .isEqualTo("Atención por garantía de " + original.getCodigo());
        });
        assertThat(respuesta.get("codigo").asText()).matches("ORD-\\d+").isNotEqualTo(original.getCodigo());
        mvc.perform(get("/api/mis-ordenes/{id}/seguimiento", original.getId()).header("Authorization", bearer(sesionCliente)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.garantia.vigente").value(true))
                .andExpect(jsonPath("$.garantia.atencionAbierta.id").value(id));
        mvc.perform(get("/api/mis-ordenes").header("Authorization", bearer(sesionCliente)))
                .andExpect(status().isOk()).andExpect(jsonPath("$[?(@.id == " + original.getId() + ")].garantia.repuestos[0].cantidad")
                        .value(contains(2)));
    }

    @Test
    void otroClienteYOtroTallerNoVenNiModificanLaGarantia() throws Exception {
        OrdenServicio original = reparar(1);
        reclamar(original, sesionOtroCliente, "09:00").andExpect(status().isNotFound());
        JsonNode creada = cuerpo(reclamar(original, sesionCliente, "09:00").andExpect(status().isCreated()));
        Long nuevaId = creada.get("id").asLong();
        for (Long id : List.of(original.getId(), nuevaId)) {
            mvc.perform(get("/api/panel/ordenes/{id}", id).header("Authorization", bearer(sesionOtroAdmin)))
                    .andExpect(status().isNotFound());
            mvc.perform(get("/api/mis-ordenes/{id}/seguimiento", id).header("Authorization", bearer(sesionOtroCliente)))
                    .andExpect(status().isNotFound());
            mvc.perform(post("/api/panel/ordenes/{id}/cerrar", id).header("Authorization", bearer(sesionOtroAdmin))
                            .contentType("application/json").content(cierre("0", "[]")))
                    .andExpect(status().isNotFound());
        }
        mvc.perform(get("/api/panel/ordenes").header("Authorization", bearer(sesionOtroAdmin)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.content", hasSize(0)));
        assertThat(ordenes.findById(nuevaId).orElseThrow().getEstado()).isEqualTo(EstadoOrden.PENDIENTE);
    }

    @Test
    void vencidaDevuelve409ConCodigoYFechaYElServidorMarcaVigencia() throws Exception {
        OrdenServicio original = reparar(0);
        OffsetDateTime vencimiento = LocalDate.now(ZoneId.of("America/Lima")).minusDays(1)
                .atStartOfDay(ZoneId.of("America/Lima")).toOffsetDateTime();
        jdbc.update("UPDATE garantia SET vence_en = ? WHERE orden_id = ?", vencimiento, original.getId());
        reclamar(original, sesionCliente, "09:00").andExpect(status().isConflict())
                .andExpect(jsonPath("$.mensaje", allOf(containsString("La garantía de " + original.getCodigo() + " venció el "),
                        containsString(String.valueOf(vencimiento.getDayOfMonth())))));
        mvc.perform(get("/api/mis-ordenes/{id}", original.getId()).header("Authorization", bearer(sesionCliente)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.garantia.vigente").value(false));
    }

    @Test
    void soloLaReparacionNormalCompletadaOCalificadaConGarantiaAdmiteReclamo() throws Exception {
        for (EstadoOrden estado : List.of(EstadoOrden.PENDIENTE, EstadoOrden.EN_PROCESO, EstadoOrden.CANCELADA)) {
            reclamar(fabricar(estado), sesionCliente, "09:00").andExpect(status().isConflict());
        }
        reclamar(fabricar(EstadoOrden.COMPLETADA), sesionCliente, "09:00").andExpect(status().isConflict());
        OrdenServicio original = reparar(0);
        jdbc.update("UPDATE orden_servicio SET estado = 'CALIFICADA' WHERE id = ?", original.getId());
        JsonNode creada = cuerpo(reclamar(original, sesionCliente, "09:00").andExpect(status().isCreated()));
        OrdenServicio garantia = ordenes.findById(creada.get("id").asLong()).orElseThrow();
        reclamar(garantia, sesionCliente, "10:00").andExpect(status().isConflict());
        reclamar(original, sesionCliente, "10:00").andExpect(status().isConflict())
                .andExpect(jsonPath("$.mensaje", containsString("Ya hay una atención por garantía abierta")));
    }

    @Test
    void tallerInactivoNoAdmiteGarantias() throws Exception {
        OrdenServicio original = reparar(0);
        jdbc.update("UPDATE mype SET activo = false WHERE id = ?", taller.getId());
        reclamar(original, sesionCliente, "09:00").andExpect(status().isConflict())
                .andExpect(jsonPath("$.mensaje", containsString("ya no está activo")));
    }

    @Test
    void agendaYLimitesSonLosMismosQueUnaReserva() throws Exception {
        OrdenServicio original = reparar(0);
        reclamar(original, sesionCliente, "09:15").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensaje").value("Esa hora no es una franja de atención"));
        jdbc.update("DELETE FROM mype_horario WHERE mype_id = ? AND dia_semana = ?",
                taller.getId(), diaReclamo().getDayOfWeek().getValue());
        reclamar(original, sesionCliente, "09:00").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensaje").value("El taller no atiende ese día a esa hora"));
        jdbc.update("INSERT INTO mype_horario VALUES (?, ?, '08:00', '17:00')",
                taller.getId(), diaReclamo().getDayOfWeek().getValue());
        reservar("09:00").andExpect(status().isCreated());
        JsonNode reservaError = cuerpo(reservar("09:00").andExpect(status().isConflict()));
        reclamar(original, sesionCliente, "09:00").andExpect(status().isConflict())
                .andExpect(jsonPath("$.mensaje").value(reservaError.get("mensaje").asText()));

        for (String descripcion : List.of("", "corta", "x".repeat(2001))) {
            mvc.perform(post("/api/mis-ordenes/{id}/garantia", original.getId()).header("Authorization", bearer(sesionCliente))
                            .contentType("application/json").content(json.writeValueAsString(Map.of(
                                    "descripcionFalla", descripcion, "fecha", diaReclamo().toString(), "hora", "11:00"))))
                    .andExpect(status().isBadRequest()).andExpect(jsonPath("$.campos.descripcionFalla").exists());
        }
        mvc.perform(post("/api/mis-ordenes/{id}/garantia", original.getId()).header("Authorization", bearer(sesionCliente))
                        .contentType("application/json").content(reclamo(LocalDate.now().minusDays(1), "11:00")))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.campos.fecha").exists());
    }

    @Test
    void dosClicsSimultaneosLleganAlIndiceYElPerdedorRecibe409() throws Exception {
        OrdenServicio original = reparar(0);
        CyclicBarrier ambosValidaron = new CyclicBarrier(2);
        doAnswer(i -> {
            i.callRealMethod();
            ambosValidaron.await(15, TimeUnit.SECONDS);
            return null;
        }).when(agenda).validar(any(), any(), any());
        try (ExecutorService pool = Executors.newFixedThreadPool(2)) {
            Callable<org.springframework.mock.web.MockHttpServletResponse> solicitud = () ->
                    reclamar(original, sesionCliente, "09:00").andReturn().getResponse();
            Future<org.springframework.mock.web.MockHttpServletResponse> primera = pool.submit(solicitud);
            Future<org.springframework.mock.web.MockHttpServletResponse> segunda = pool.submit(solicitud);
            var a = primera.get(25, TimeUnit.SECONDS);
            var b = segunda.get(25, TimeUnit.SECONDS);
            assertThat(List.of(a.getStatus(), b.getStatus())).containsExactlyInAnyOrder(201, 409);
            var rechazada = a.getStatus() == 409 ? a : b;
            assertThat(json.readTree(rechazada.getContentAsString()).get("mensaje").asText())
                    .isEqualTo("Ya hay una atención por garantía abierta para " + original.getCodigo());
        }
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM orden_servicio WHERE garantia_de_id = ?", Long.class, original.getId()))
                .isEqualTo(1L);
    }

    @Test
    void garantiaNoCobraManoDeObraNiEnElPanelNiEnLaVisita() throws Exception {
        OrdenServicio original = reparar(2);
        OrdenServicio atencion = atencion(original);
        ponerEnProceso(atencion);
        cerrarPanel(atencion, "1.00", "[]").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensaje").value("Una atención por garantía no cobra mano de obra"));
        mvc.perform(post("/api/visita/{t}/terminar", token(atencion)).contentType("application/json").content(cierre("1.00", "[]")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensaje").value("Una atención por garantía no cobra mano de obra"));
        assertThat(ordenes.findById(atencion.getId()).orElseThrow().getTotal()).isNull();
        assertThat(pagos.findByOrdenId(atencion.getId())).isEmpty();
        assertThat(garantias.findByOrdenIdAndMypeId(atencion.getId(), taller.getId())).isEmpty();
    }

    @Test
    void cubreHastaCantidadOriginalYSumaExcesoYRepuestoDistintoSinAlterarStock() throws Exception {
        OrdenServicio original = reparar(2);
        OrdenServicio atencion = atencion(original);
        ponerEnProceso(atencion);
        // Dos líneas del mismo id no permiten renovar dos veces la cantidad cubierta.
        String piezas = "[{\"repuestoId\":%d,\"cantidad\":1},{\"repuestoId\":%d,\"cantidad\":3},{\"repuestoId\":%d,\"cantidad\":1}]"
                .formatted(instalado.getId(), instalado.getId(), distinto.getId());
        cerrarPanel(atencion, "0", piezas).andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(62))
                .andExpect(jsonPath("$.repuestos", hasSize(3)))
                .andExpect(jsonPath("$.repuestos[0].cantidad").value(2))
                .andExpect(jsonPath("$.repuestos[0].precioUnitario").value(0))
                .andExpect(jsonPath("$.repuestos[1].cantidad").value(2))
                .andExpect(jsonPath("$.repuestos[1].precioUnitario").value(25))
                .andExpect(jsonPath("$.repuestos[2].precioUnitario").value(12));
        assertThat(repuestos.findById(instalado.getId()).orElseThrow().getStock()).isEqualTo(14);
        assertThat(repuestos.findById(distinto.getId()).orElseThrow().getStock()).isEqualTo(19);
        assertThat(pagos.findByOrdenId(atencion.getId())).isEmpty();
        assertThat(garantias.findByOrdenIdAndMypeId(atencion.getId(), taller.getId())).isEmpty();
        mvc.perform(post("/api/panel/ordenes/{id}/pago", atencion.getId()).header("Authorization", bearer(sesionAdmin))
                        .contentType("application/json").content("{\"metodo\":\"YAPE\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.monto").value(62));
        assertIngresos(62);
    }

    @Test
    void coberturaUsaElIdAunqueOtroRepuestoTengaIgualNombreYExcesoUsaPrecioActual() throws Exception {
        OrdenServicio original = reparar(1);
        instalado.setPrecio(new BigDecimal("30.00"));
        instalado.setStock(19);
        repuestos.save(instalado);
        distinto.setNombre(instalado.getNombre());
        repuestos.save(distinto);
        OrdenServicio atencion = atencion(original);
        ponerEnProceso(atencion);
        cerrarPanel(atencion, "0", "[{\"repuestoId\":%d,\"cantidad\":2},{\"repuestoId\":%d,\"cantidad\":1}]"
                .formatted(instalado.getId(), distinto.getId()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(42))
                .andExpect(jsonPath("$.repuestos[0].precioUnitario").value(0))
                .andExpect(jsonPath("$.repuestos[1].precioUnitario").value(30))
                .andExpect(jsonPath("$.repuestos[2].precioUnitario").value(12));
    }

    @Test
    void repuestoAjenoOStockInsuficienteNoDejanPagoNiCierreParcial() throws Exception {
        OrdenServicio original = reparar(1);
        OrdenServicio atencion = atencion(original);
        ponerEnProceso(atencion);
        Repuesto ajeno = repuesto(otroTaller, "Repuesto de otro taller", "10.00");
        cerrarPanel(atencion, "0", pieza(ajeno, 1)).andExpect(status().isNotFound());
        // La primera línea cubierta tampoco queda descontada si la segunda no tiene stock.
        cerrarPanel(atencion, "0", "[{\"repuestoId\":%d,\"cantidad\":1},{\"repuestoId\":%d,\"cantidad\":21}]"
                .formatted(instalado.getId(), distinto.getId()))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.mensaje").value("No hay stock suficiente de " + distinto.getNombre()));
        assertThat(repuestos.findById(instalado.getId()).orElseThrow().getStock()).isEqualTo(19);
        assertThat(repuestos.findById(distinto.getId()).orElseThrow().getStock()).isEqualTo(20);
        assertThat(ordenes.findById(atencion.getId()).orElseThrow().getEstado()).isEqualTo(EstadoOrden.EN_PROCESO);
        assertThat(pagos.findByOrdenId(atencion.getId())).isEmpty();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM orden_repuesto WHERE orden_id = ?", Integer.class, atencion.getId())).isZero();
    }

    @Test
    void totalCeroSePagaAlCerrarYTecnicoRecibeLaVisitaCobradaSinNuevaGarantia() throws Exception {
        OrdenServicio original = reparar(2);
        Garantia emitida = garantias.findByOrdenIdAndMypeId(original.getId(), taller.getId()).orElseThrow();
        OrdenServicio atencion = atencion(original);
        ponerEnProceso(atencion);
        String token = token(atencion);
        mvc.perform(get("/api/visita/{t}", token)).andExpect(status().isOk())
                .andExpect(jsonPath("$.tarifaSugerida").value(0))
                .andExpect(jsonPath("$.catalogo[?(@.id == " + instalado.getId() + ")].cantidadCubierta").value(contains(2)));
        assertThat(pagos.findByOrdenId(atencion.getId())).isEmpty();
        mvc.perform(post("/api/visita/{t}/terminar", token).contentType("application/json")
                        .content(cierre("0", pieza(instalado, 2))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(0))
                .andExpect(jsonPath("$.pago.estado").value("PAGADO"))
                .andExpect(jsonPath("$.pago.monto").value(0))
                .andExpect(jsonPath("$.pago.metodo").value("YAPE"));
        mvc.perform(get("/api/visita/{t}", token)).andExpect(status().isOk())
                .andExpect(jsonPath("$.pago.estado").value("PAGADO"));
        mvc.perform(post("/api/visita/{t}/cobro", token).contentType("application/json").content("{\"metodo\":\"YAPE\"}"))
                .andExpect(status().isConflict());
        assertThat(garantias.findByOrdenIdAndMypeId(atencion.getId(), taller.getId())).isEmpty();
        assertThat(garantias.findByOrdenIdAndMypeId(original.getId(), taller.getId()).orElseThrow().getVenceEn())
                .isEqualTo(emitida.getVenceEn());
        assertThat(repuestos.findById(instalado.getId()).orElseThrow().getStock()).isEqualTo(16);
        assertIngresos(0);
        // Cerrar una atención permite otra dentro del plazo original.
        reclamar(original, sesionCliente, "10:00").andExpect(status().isCreated());
    }

    @Test
    void pagoAutomaticoDesdePanelUsaEfectivoSiNoHabiaMetodo() throws Exception {
        OrdenServicio original = reparar(0);
        jdbc.update("UPDATE orden_servicio SET metodo_pago = NULL WHERE id = ?", original.getId());
        OrdenServicio atencion = atencion(original);
        ponerEnProceso(atencion);
        cerrarPanel(atencion, "0", "[]").andExpect(status().isOk());
        mvc.perform(get("/api/panel/ordenes/{id}/pago", atencion.getId()).header("Authorization", bearer(sesionAdmin)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.monto").value(0))
                .andExpect(jsonPath("$.estado").value("PAGADO"))
                .andExpect(jsonPath("$.metodo").value("EFECTIVO"));
    }

    @Test
    void vistaYDetalleTraenSoloTrabajoDeLaOriginalYNormalNoTieneAntecedentes() throws Exception {
        OrdenServicio original = reparar(1);
        foto(original, OrigenFoto.CLIENTE, "falla-cliente.png");
        foto(original, OrigenFoto.TECNICO, "reparacion-original.png");
        OrdenServicio otra = fabricar(EstadoOrden.EN_PROCESO);
        foto(otra, OrigenFoto.TECNICO, "otro-trabajo.png");
        OrdenServicio atencion = atencion(original);
        ponerEnProceso(atencion);
        foto(atencion, OrigenFoto.CLIENTE, "falla-nueva.png");
        String rutaEsperada = "/uploads/" + original.getCodigo() + "/reparacion-original.png";
        mvc.perform(get("/api/visita/{t}", token(atencion))).andExpect(status().isOk())
                .andExpect(jsonPath("$.garantia.codigoOriginal").value(original.getCodigo()))
                .andExpect(jsonPath("$.garantia.diagnosticoAnterior").value("Reparación del motor instalado"))
                .andExpect(jsonPath("$.garantia.fechaReparacion").isNotEmpty())
                .andExpect(jsonPath("$.garantia.fotosAnteriores", contains(rutaEsperada)))
                .andExpect(jsonPath("$.garantia.repuestosInstalados[0].nombre").value(instalado.getNombre()));
        mvc.perform(get("/api/visita/{t}", token(original))).andExpect(status().isOk())
                .andExpect(jsonPath("$.garantia").doesNotExist())
                .andExpect(jsonPath("$.tarifaSugerida").value(50));
        mvc.perform(get("/api/panel/ordenes/{id}", atencion.getId()).header("Authorization", bearer(sesionAdmin)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.atencionGarantia.ordenOriginalId").value(original.getId()))
                .andExpect(jsonPath("$.atencionGarantia.fotosAnteriores", contains(rutaEsperada)));
        mvc.perform(get("/api/mis-ordenes/{id}/seguimiento", atencion.getId()).header("Authorization", bearer(sesionCliente)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.garantia.repuestos[0].cantidad").value(1));
    }

    @Test
    void bandejaPriorizaAntesDePaginarYFiltrar() throws Exception {
        OrdenServicio original = reparar(0);
        OrdenServicio atencion = atencion(original);
        OrdenServicio masReciente = fabricar(EstadoOrden.PENDIENTE);
        jdbc.update("UPDATE orden_servicio SET fecha_programada = ? WHERE id = ?", diaReclamo().plusDays(5), masReciente.getId());
        for (String filtro : List.of("", "PENDIENTE")) {
            var peticion = get("/api/panel/ordenes").param("tamano", "1").param("pagina", "0")
                    .header("Authorization", bearer(sesionAdmin));
            if (!filtro.isEmpty()) peticion.param("estado", filtro);
            mvc.perform(peticion).andExpect(status().isOk()).andExpect(jsonPath("$.content[0].id").value(atencion.getId()))
                    .andExpect(jsonPath("$.content[0].tipo").value("GARANTIA"));
        }
    }

    @Test
    void ajustesSonIndependientesValidanDiasYAislanTalleres() throws Exception {
        mvc.perform(get("/api/panel/ajustes/garantia").header("Authorization", bearer(sesionAdmin)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.dias").value(30));
        for (int dias : List.of(60, 90, 30)) ajuste(dias).andExpect(status().isOk()).andExpect(jsonPath("$.dias").value(dias));
        for (int dias : List.of(-1, 0, 31, 120)) ajuste(dias).andExpect(status().isBadRequest());
        mvc.perform(put("/api/panel/ajustes/garantia").header("Authorization", bearer(sesionAdmin))
                        .contentType("application/json").content("{}"))
                .andExpect(status().isBadRequest());
        ajuste(90).andExpect(status().isOk());
        mvc.perform(get("/api/panel/ajustes/garantia").header("Authorization", bearer(sesionOtroAdmin)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.dias").value(30));
        assertThat(mypes.findById(otroTaller.getId()).orElseThrow().getGarantiaDias()).isEqualTo(30);
    }

    @Test
    void fotosOpcionalesDeLaGarantiaUsanLaRutaExistente() throws Exception {
        OrdenServicio atencion = atencion(reparar(0));
        MockMultipartFile archivo = new MockMultipartFile("fotos", "falla.png", "image/png", new byte[]{(byte) 0x89, 'P', 'N', 'G'});
        mvc.perform(multipart("/api/mis-ordenes/{id}/fotos", atencion.getId()).file(archivo)
                        .header("Authorization", bearer(sesionCliente)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.tipo").value("GARANTIA"))
                .andExpect(jsonPath("$.fotos", hasSize(1)));
    }

    private Usuario usuario(Rol rol) {
        Usuario u = new Usuario();
        u.setNombres("Prueba"); u.setApellidos("Garantía");
        u.setEmail("garantia-" + UUID.randomUUID() + "@pruebas.invalid");
        u.setClaveHash("$2a$10$ejemploSoloSeFirmaJwtNoSeUsaParaEntrar");
        u.setRol(rol);
        usuarios.save(u);
        usuariosCreados.add(u.getId());
        return u;
    }

    private Mype taller() {
        Mype m = new Mype();
        m.setRazonSocial("Taller garantía " + UUID.randomUUID());
        m.setRuc(String.valueOf(ThreadLocalRandom.current().nextLong(10_000_000_000L, 99_999_999_999L)));
        m.setDireccion("Calle Taller 123"); m.setDistrito("Trujillo");
        m.setTelefono("999123456");
        m.getMetodosPago().addAll(List.of(pe.techserv.pago.MetodoPago.EFECTIVO, pe.techserv.pago.MetodoPago.YAPE));
        for (int dia = 1; dia <= 7; dia++) m.getHorarios().add(new HorarioAtencion(dia, LocalTime.of(8, 0), LocalTime.of(17, 0)));
        mypes.save(m);
        MypeEspecialidad tarifa = new MypeEspecialidad();
        tarifa.setMype(m); tarifa.setEspecialidad(Especialidad.REPARACION_ELECTRODOMESTICOS); tarifa.setTarifaBase(new BigDecimal("50.00"));
        especialidades.save(tarifa);
        return m;
    }

    private String administrador(Mype mype) {
        Usuario u = usuario(Rol.ADMIN_MYPE);
        Administrador admin = new Administrador(); admin.setUsuario(u); admin.setMype(mype);
        administradores.save(admin);
        return jwt.paraSesion(u);
    }

    private Cliente cliente() {
        Cliente c = new Cliente(); c.setUsuario(usuario(Rol.CLIENTE));
        c.setDireccion("Dirección actual del perfil"); c.setDistrito("Trujillo");
        return clientes.save(c);
    }

    private Repuesto repuesto(Mype mype, String nombre, String precio) {
        Repuesto r = new Repuesto(); r.setMype(mype); r.setNombre(nombre); r.setPrecio(new BigDecimal(precio)); r.setStock(20);
        return repuestos.save(r);
    }

    private OrdenServicio fabricar(EstadoOrden estado) {
        OrdenServicio o = new OrdenServicio();
        o.setCodigo("ORD-G" + UUID.randomUUID().toString().replace("-", "").substring(0, 10));
        o.setMype(taller); o.setCliente(cliente); o.setTecnico(tecnico);
        o.setEspecialidad(Especialidad.REPARACION_ELECTRODOMESTICOS);
        o.setDescripcionFalla("El motor de la lavadora no funciona");
        o.setDireccion("Dirección de la reparación 321"); o.setReferencia("Frente al parque"); o.setDistrito("La Esperanza");
        o.setLatitud(new BigDecimal("-8.1234567")); o.setLongitud(new BigDecimal("-79.1234567"));
        o.setFechaProgramada(LocalDate.now().plusDays(1)); o.setHoraProgramada(LocalTime.of(10, 0));
        o.setMetodoPago(pe.techserv.pago.MetodoPago.YAPE); o.setEstado(estado);
        return ordenes.save(o);
    }

    private OrdenServicio reparar(int cantidad) throws Exception {
        OrdenServicio o = fabricar(EstadoOrden.EN_PROCESO);
        cerrarPanel(o, "50.00", cantidad == 0 ? "[]" : pieza(instalado, cantidad)).andExpect(status().isOk());
        return o;
    }

    private OrdenServicio atencion(OrdenServicio original) throws Exception {
        Long id = cuerpo(reclamar(original, sesionCliente, "09:00").andExpect(status().isCreated())).get("id").asLong();
        return ordenes.findById(id).orElseThrow();
    }

    private void ponerEnProceso(OrdenServicio o) {
        jdbc.update("UPDATE orden_servicio SET estado = 'EN_PROCESO', tecnico_id = ? WHERE id = ?", tecnico.getId(), o.getId());
        o.setTecnico(tecnico); o.setEstado(EstadoOrden.EN_PROCESO);
    }

    private ResultActions reclamar(OrdenServicio o, String sesion, String hora) throws Exception {
        return mvc.perform(post("/api/mis-ordenes/{id}/garantia", o.getId()).header("Authorization", bearer(sesion))
                .contentType("application/json").content(reclamo(diaReclamo(), hora)));
    }

    private static LocalDate diaReclamo() { return LocalDate.now().plusDays(2); }
    private static String bearer(String sesion) { return "Bearer " + sesion; }
    private static String reclamo(LocalDate fecha, String hora) {
        return "{\"descripcionFalla\":\"  Volvió a fallar el motor instalado  \",\"fecha\":\"%s\",\"hora\":\"%s\"}".formatted(fecha, hora);
    }
    private ResultActions reservar(String hora) throws Exception {
        return mvc.perform(post("/api/mis-ordenes").header("Authorization", bearer(sesionCliente)).contentType("application/json")
                .content("""
                        {"mypeId":%d,"especialidad":"REPARACION_ELECTRODOMESTICOS","descripcionFalla":"El motor no funciona otra vez",
                         "direccion":"Calle 123","distrito":"Trujillo","fecha":"%s","hora":"%s","metodoPago":"YAPE"}
                        """.formatted(taller.getId(), diaReclamo(), hora)));
    }
    private ResultActions ajuste(int dias) throws Exception {
        return mvc.perform(put("/api/panel/ajustes/garantia").header("Authorization", bearer(sesionAdmin))
                .contentType("application/json").content("{\"dias\":%d}".formatted(dias)));
    }
    private ResultActions cerrarPanel(OrdenServicio orden, String mano, String piezas) throws Exception {
        return mvc.perform(post("/api/panel/ordenes/{id}/cerrar", orden.getId()).header("Authorization", bearer(sesionAdmin))
                .contentType("application/json").content(cierre(mano, piezas)));
    }
    private static String cierre(String mano, String piezas) {
        return "{\"diagnostico\":\"Reparación del motor instalado\",\"precioManoObra\":%s,\"repuestos\":%s}".formatted(mano, piezas);
    }
    private static String pieza(Repuesto r, int cantidad) {
        return "[{\"repuestoId\":%d,\"cantidad\":%d}]".formatted(r.getId(), cantidad);
    }
    private String token(OrdenServicio o) {
        String url = enlaces.crear(o);
        return url.substring(url.lastIndexOf('/') + 1);
    }
    private JsonNode cuerpo(ResultActions resultado) throws Exception {
        return json.readTree(resultado.andReturn().getResponse().getContentAsString());
    }
    private void assertPlazo(OrdenServicio o, int dias) {
        Garantia g = garantias.findByOrdenIdAndMypeId(o.getId(), taller.getId()).orElseThrow();
        assertThat(g.getDias()).isEqualTo(dias);
        assertThat(g.getVenceEn().toInstant()).isEqualTo(g.getIniciaEn().plusDays(dias).toInstant());
        OffsetDateTime cierre = jdbc.queryForObject("SELECT ocurrido_en FROM orden_historial WHERE orden_id = ? AND estado_nuevo = 'COMPLETADA'",
                OffsetDateTime.class, o.getId());
        assertThat(g.getIniciaEn().toInstant()).isEqualTo(cierre.toInstant());
    }
    private void foto(OrdenServicio o, OrigenFoto origen, String nombre) {
        OrdenFoto foto = new OrdenFoto(); foto.setOrden(o); foto.setOrigen(origen); foto.setNombreArchivo(nombre);
        foto.setRuta("/uploads/" + o.getCodigo() + "/" + nombre); foto.setTipoMime("image/png"); foto.setTamanoBytes(4);
        fotos.save(foto);
    }
    private void assertIngresos(int esperado) throws Exception {
        mvc.perform(get("/api/panel/reportes").header("Authorization", bearer(sesionAdmin))
                        .param("desde", LocalDate.now().minusDays(1).toString()).param("hasta", LocalDate.now().plusDays(1).toString()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.ingresos").value(esperado))
                .andExpect(jsonPath("$.ranking[0].ingresoGenerado").value(esperado));
    }
}
