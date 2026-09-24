package pe.techserv.panel;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
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
import pe.techserv.orden.OrdenRepuesto;
import pe.techserv.orden.OrdenRepuestoRepository;
import pe.techserv.orden.OrdenServicio;
import pe.techserv.orden.OrdenServicioRepository;
import pe.techserv.pago.EstadoPago;
import pe.techserv.pago.MetodoPago;
import pe.techserv.pago.Pago;
import pe.techserv.pago.PagoRepository;
import pe.techserv.usuario.Cliente;
import pe.techserv.usuario.ClienteRepository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class CierreTest extends BasePruebaIntegracion {

    private static final String ADMIN_DELGADO    = "jorge@serviciosdelgado.pe";
    private static final String ADMIN_TECNOHOGAR = "silvia@tecnohogar.pe";
    private static final String CLAVE            = "demo1234";

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired OrdenServicioRepository ordenes;
    @Autowired RepuestoRepository repuestos;
    @Autowired PagoRepository pagos;
    @Autowired MypeRepository mypes;
    @Autowired ClienteRepository clientes;
    @Autowired TecnicoRepository tecnicos;
    @Autowired OrdenHistorialRepository historialRepo;
    @Autowired OrdenRepuestoRepository ordenRepuestos;

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

    private OrdenServicio fabricarOrden(Long mypeId, EstadoOrden estado) {
        Mype mype = mypes.findById(mypeId).orElseThrow();
        Cliente cliente = clientes.findAll().stream().findFirst().orElseThrow();
        Tecnico tecnico = tecnicos.findByMypeIdOrderByIdAsc(mypeId).stream().findFirst().orElseThrow();

        OrdenServicio orden = new OrdenServicio();
        orden.setCodigo("ORD-C" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase());
        orden.setCliente(cliente);
        orden.setMype(mype);
        orden.setTecnico(tecnico);
        orden.setEspecialidad(Especialidad.REPARACION_ELECTRODOMESTICOS);
        orden.setDescripcionFalla("Falla de prueba para cierre");
        orden.setDireccion("Calle Las Palmeras 123");
        orden.setDistrito("Trujillo");
        orden.setFechaProgramada(LocalDate.now());
        orden.setHoraProgramada(LocalTime.of(10, 0));
        orden.setEstado(estado);
        orden.setCreadaEn(OffsetDateTime.now());
        orden.setActualizadaEn(OffsetDateTime.now());
        return ordenes.save(orden);
    }

    @Test
    @DisplayName("El total cuadra con mano de obra y repuestos")
    void elTotalCuadra() throws Exception {
        OrdenServicio orden = fabricarOrden(mypeDelgado(), EstadoOrden.EN_PROCESO);

        List<Repuesto> repuestosDelgado = repuestos.findByMypeIdAndActivoTrueOrderByNombreAsc(mypeDelgado());
        Repuesto r1 = repuestosDelgado.get(0);
        Repuesto r2 = repuestosDelgado.get(1);
        r1.setStock(50);
        repuestos.save(r1);
        r2.setStock(50);
        repuestos.save(r2);

        BigDecimal manoDeObra = new BigDecimal("80.00");
        int cant1 = 2;
        int cant2 = 1;

        BigDecimal subtotal1 = r1.getPrecio().multiply(BigDecimal.valueOf(cant1));
        BigDecimal subtotal2 = r2.getPrecio().multiply(BigDecimal.valueOf(cant2));
        BigDecimal totalEsperado = manoDeObra.add(subtotal1).add(subtotal2);

        mvc.perform(post("/api/panel/ordenes/{id}/cerrar", orden.getId())
                        .header("Authorization", "Bearer " + tokenDe(ADMIN_DELGADO))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                 {
                                   "diagnostico": "Se realizó cambio de piezas y ajuste general",
                                   "precioManoObra": 80.00,
                                   "repuestos": [
                                     {"repuestoId": %d, "cantidad": %d},
                                     {"repuestoId": %d, "cantidad": %d}
                                   ]
                                 }
                                 """.formatted(r1.getId(), cant1, r2.getId(), cant2)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(orden.getId()))
                .andExpect(jsonPath("$.estado").value("COMPLETADA"))
                .andExpect(jsonPath("$.diagnostico").value("Se realizó cambio de piezas y ajuste general"))
                .andExpect(jsonPath("$.repuestos", hasSize(2)));

        OrdenServicio guardada = ordenes.findById(orden.getId()).orElseThrow();
        assertThat(guardada.getTotal()).isNotNull();
        assertThat(guardada.getTotal().compareTo(totalEsperado)).isZero();
        assertThat(guardada.getPrecioManoObra().compareTo(manoDeObra)).isZero();
    }

    @Test
    @DisplayName("El stock baja exactamente en la cantidad usada")
    void stockBajaExactamenteEnCantidadUsada() throws Exception {
        OrdenServicio orden = fabricarOrden(mypeDelgado(), EstadoOrden.EN_PROCESO);

        List<Repuesto> repuestosDelgado = repuestos.findByMypeIdAndActivoTrueOrderByNombreAsc(mypeDelgado());
        Repuesto r1 = repuestosDelgado.get(0);
        r1.setStock(50);
        repuestos.save(r1);
        int stockInicial = 50;
        int cantidadUsada = 2;

        mvc.perform(post("/api/panel/ordenes/{id}/cerrar", orden.getId())
                        .header("Authorization", "Bearer " + tokenDe(ADMIN_DELGADO))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                 {
                                   "diagnostico": "Reemplazo de repuesto por desgaste",
                                   "precioManoObra": 50.00,
                                   "repuestos": [
                                     {"repuestoId": %d, "cantidad": %d}
                                   ]
                                 }
                                 """.formatted(r1.getId(), cantidadUsada)))
                .andExpect(status().isOk());

        Repuesto r1Actualizado = repuestos.findById(r1.getId()).orElseThrow();
        assertThat(r1Actualizado.getStock()).isEqualTo(stockInicial - cantidadUsada);
    }

    @Test
    @DisplayName("Cerrar sin repuestos deja total igual a mano de obra")
    void cerrarSinRepuestosDejaTotalIgualManoObra() throws Exception {
        OrdenServicio orden = fabricarOrden(mypeDelgado(), EstadoOrden.EN_PROCESO);
        BigDecimal manoDeObra = new BigDecimal("65.00");

        mvc.perform(post("/api/panel/ordenes/{id}/cerrar", orden.getId())
                        .header("Authorization", "Bearer " + tokenDe(ADMIN_DELGADO))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                 {
                                   "diagnostico": "Mantenimiento preventivo sin cambio de piezas",
                                   "precioManoObra": 65.00,
                                   "repuestos": []
                                 }
                                 """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.repuestos", hasSize(0)));

        OrdenServicio guardada = ordenes.findById(orden.getId()).orElseThrow();
        assertThat(guardada.getTotal().compareTo(manoDeObra)).isZero();
        assertThat(guardada.getPrecioManoObra().compareTo(manoDeObra)).isZero();
    }

    @Test
    @DisplayName("Pedir más cantidad que el stock devuelve 409 y no descuenta nada ni queda media orden cerrada")
    void pedirMasCantidadQueStockDa409YNoModificaNada() throws Exception {
        OrdenServicio orden = fabricarOrden(mypeDelgado(), EstadoOrden.EN_PROCESO);

        Repuesto r = repuestos.findByMypeIdAndActivoTrueOrderByNombreAsc(mypeDelgado()).get(0);
        int stockInicial = r.getStock();
        int cantidadExcesiva = stockInicial + 10;

        mvc.perform(post("/api/panel/ordenes/{id}/cerrar", orden.getId())
                        .header("Authorization", "Bearer " + tokenDe(ADMIN_DELGADO))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                 {
                                   "diagnostico": "Intento de usar más del stock",
                                   "precioManoObra": 40.00,
                                   "repuestos": [
                                     {"repuestoId": %d, "cantidad": %d}
                                   ]
                                 }
                                 """.formatted(r.getId(), cantidadExcesiva)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.estado").value(409))
                .andExpect(jsonPath("$.mensaje").value("No hay stock suficiente de " + r.getNombre()));

        Repuesto rReleido = repuestos.findById(r.getId()).orElseThrow();
        assertThat(rReleido.getStock()).isEqualTo(stockInicial);

        OrdenServicio ordenReleida = ordenes.findById(orden.getId()).orElseThrow();
        assertThat(ordenReleida.getEstado()).isEqualTo(EstadoOrden.EN_PROCESO);
        assertThat(ordenReleida.getTotal()).isNull();
        assertThat(ordenReleida.getDiagnostico()).isNull();
    }

    @Test
    @DisplayName("Un repuesto de otro taller devuelve 404")
    void repuestoDeOtroTallerDa404() throws Exception {
        OrdenServicio ordenDelgado = fabricarOrden(mypeDelgado(), EstadoOrden.EN_PROCESO);

        Repuesto repuestoAjeno = repuestos.findByMypeIdAndActivoTrueOrderByNombreAsc(mypeTecnoHogar()).get(0);

        mvc.perform(post("/api/panel/ordenes/{id}/cerrar", ordenDelgado.getId())
                        .header("Authorization", "Bearer " + tokenDe(ADMIN_DELGADO))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                 {
                                   "diagnostico": "Uso de repuesto ajeno",
                                   "precioManoObra": 70.00,
                                   "repuestos": [
                                     {"repuestoId": %d, "cantidad": 1}
                                   ]
                                 }
                                 """.formatted(repuestoAjeno.getId())))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.estado").value(404))
                .andExpect(jsonPath("$.mensaje").value("No se encontró el repuesto " + repuestoAjeno.getId()));
    }

    @Test
    @DisplayName("Cerrar una orden que no está en un estado que lo admita devuelve 409")
    void cerrarOrdenEnEstadoNoAdmitidoDa409() throws Exception {
        OrdenServicio ordenPendiente = fabricarOrden(mypeDelgado(), EstadoOrden.PENDIENTE);

        mvc.perform(post("/api/panel/ordenes/{id}/cerrar", ordenPendiente.getId())
                        .header("Authorization", "Bearer " + tokenDe(ADMIN_DELGADO))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                 {
                                   "diagnostico": "Cierre inválido desde pendiente",
                                   "precioManoObra": 80.00
                                 }
                                 """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.estado").value(409))
                .andExpect(jsonPath("$.mensaje").value("Una orden pendiente no se puede cerrar"));
    }

    @Test
    @DisplayName("Cerrar dos veces la misma orden devuelve 409 en la segunda")
    void cerrarDosVecesDa409() throws Exception {
        OrdenServicio orden = fabricarOrden(mypeDelgado(), EstadoOrden.EN_PROCESO);

        String body = """
                      {
                        "diagnostico": "Primer cierre exitoso",
                        "precioManoObra": 60.00
                      }
                      """;

        mvc.perform(post("/api/panel/ordenes/{id}/cerrar", orden.getId())
                        .header("Authorization", "Bearer " + tokenDe(ADMIN_DELGADO))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk());

        mvc.perform(post("/api/panel/ordenes/{id}/cerrar", orden.getId())
                        .header("Authorization", "Bearer " + tokenDe(ADMIN_DELGADO))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.estado").value(409))
                .andExpect(jsonPath("$.mensaje").value("Una orden completada no se puede cerrar"));
    }

    @Test
    @DisplayName("Pago: registrar cobro de orden cerrada deja el Pago en PAGADO; registrarlo otra vez o sin cerrar da 409")
    void registrarPago() throws Exception {
        // Orden sin cerrar: intentar registrar pago da 409
        OrdenServicio ordenSinCerrar = fabricarOrden(mypeDelgado(), EstadoOrden.EN_PROCESO);

        mvc.perform(post("/api/panel/ordenes/{id}/pago", ordenSinCerrar.getId())
                        .header("Authorization", "Bearer " + tokenDe(ADMIN_DELGADO))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                 {"metodo": "YAPE"}
                                 """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.estado").value(409))
                .andExpect(jsonPath("$.mensaje").value("Cierra la orden antes de registrar el pago"));

        // Cerramos la orden
        mvc.perform(post("/api/panel/ordenes/{id}/cerrar", ordenSinCerrar.getId())
                        .header("Authorization", "Bearer " + tokenDe(ADMIN_DELGADO))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                 {
                                   "diagnostico": "Trabajo listo para cobrar",
                                   "precioManoObra": 85.00
                                 }
                                 """))
                .andExpect(status().isOk());

        OrdenServicio ordenCerrada = ordenes.findById(ordenSinCerrar.getId()).orElseThrow();

        // Registrar pago exitoso
        mvc.perform(post("/api/panel/ordenes/{id}/pago", ordenCerrada.getId())
                        .header("Authorization", "Bearer " + tokenDe(ADMIN_DELGADO))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                 {"metodo": "YAPE"}
                                 """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("PAGADO"))
                .andExpect(jsonPath("$.metodo").value("YAPE"))
                .andExpect(jsonPath("$.pagadoEn").isNotEmpty());

        Pago pagoEnBd = pagos.findByOrdenId(ordenCerrada.getId()).orElseThrow();
        assertThat(pagoEnBd.getEstado()).isEqualTo(EstadoPago.PAGADO);
        assertThat(pagoEnBd.getMetodo()).isEqualTo(MetodoPago.YAPE);
        assertThat(pagoEnBd.getMonto().compareTo(ordenCerrada.getTotal())).isZero();
        assertThat(pagoEnBd.getPagadoEn()).isNotNull();

        // Intentar registrar pago por segunda vez da 409
        mvc.perform(post("/api/panel/ordenes/{id}/pago", ordenCerrada.getId())
                        .header("Authorization", "Bearer " + tokenDe(ADMIN_DELGADO))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                 {"metodo": "EFECTIVO"}
                                 """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.estado").value(409))
                .andExpect(jsonPath("$.mensaje").value("Esa orden ya tiene un pago registrado"));
    }

    @Test
    @DisplayName("Consultar el pago: 204 si aún no se cobró, 200 con el método tras cobrar y 404 si la orden es de otro taller")
    void consultarPago() throws Exception {
        OrdenServicio orden = fabricarOrden(mypeDelgado(), EstadoOrden.EN_PROCESO);
        String token = tokenDe(ADMIN_DELGADO);

        mvc.perform(post("/api/panel/ordenes/{id}/cerrar", orden.getId())
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                 {"diagnostico": "Listo", "precioManoObra": 40.00}
                                 """))
                .andExpect(status().isOk());

        mvc.perform(get("/api/panel/ordenes/{id}/pago", orden.getId())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        mvc.perform(post("/api/panel/ordenes/{id}/pago", orden.getId())
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                 {"metodo": "PLIN"}
                                 """))
                .andExpect(status().isOk());

        mvc.perform(get("/api/panel/ordenes/{id}/pago", orden.getId())
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.metodo").value("PLIN"))
                .andExpect(jsonPath("$.ordenId").value(orden.getId()));

        mvc.perform(get("/api/panel/ordenes/{id}/pago", orden.getId())
                        .header("Authorization", "Bearer " + tokenDe(ADMIN_TECNOHOGAR)))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Aislamiento: cerrar una orden de otro taller devuelve 404 nunca 403")
    void ordenDeOtroTallerDa404() throws Exception {
        OrdenServicio ordenTecnoHogar = fabricarOrden(mypeTecnoHogar(), EstadoOrden.EN_PROCESO);

        mvc.perform(post("/api/panel/ordenes/{id}/cerrar", ordenTecnoHogar.getId())
                        .header("Authorization", "Bearer " + tokenDe(ADMIN_DELGADO))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                 {
                                   "diagnostico": "Intento de cerrar orden ajena",
                                   "precioManoObra": 70.00
                                 }
                                 """))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.estado").value(404))
                .andExpect(jsonPath("$.mensaje").value("No se encontró la orden " + ordenTecnoHogar.getId()));
    }

    @Test
    @DisplayName("Repuesto repetido en la lista suma las cantidades en una sola línea")
    void repuestoRepetidoSumaCantidadesEnUnaSolaLinea() throws Exception {
        OrdenServicio orden = fabricarOrden(mypeDelgado(), EstadoOrden.EN_PROCESO);

        Repuesto r = repuestos.findByMypeIdAndActivoTrueOrderByNombreAsc(mypeDelgado()).get(0);
        r.setStock(50);
        repuestos.save(r);
        int stockInicial = 50;

        mvc.perform(post("/api/panel/ordenes/{id}/cerrar", orden.getId())
                        .header("Authorization", "Bearer " + tokenDe(ADMIN_DELGADO))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                 {
                                   "diagnostico": "Repuesto repetido en formulario",
                                   "precioManoObra": 40.00,
                                   "repuestos": [
                                     {"repuestoId": %d, "cantidad": 1},
                                     {"repuestoId": %d, "cantidad": 2}
                                   ]
                                 }
                                 """.formatted(r.getId(), r.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.repuestos", hasSize(1)))
                .andExpect(jsonPath("$.repuestos[0].cantidad").value(3));

        Repuesto rActualizado = repuestos.findById(r.getId()).orElseThrow();
        assertThat(rActualizado.getStock()).isEqualTo(stockInicial - 3);

        List<OrdenRepuesto> lineas = ordenRepuestos.findByOrdenIdOrderByIdAsc(orden.getId());
        assertThat(lineas).hasSize(1);
        OrdenRepuesto linea = lineas.get(0);
        assertThat(linea.getCantidad()).isEqualTo(3);
    }

    @Test
    @DisplayName("Pasar orden a en proceso cuando está en camino actualiza estado y anota historial")
    void pasarAEnProcesoDesdeEnCamino() throws Exception {
        OrdenServicio orden = fabricarOrden(mypeDelgado(), EstadoOrden.EN_CAMINO);
        int historialAntes = historialRepo.findByOrdenIdOrderByOcurridoEnAsc(orden.getId()).size();

        mvc.perform(post("/api/panel/ordenes/{id}/en-proceso", orden.getId())
                        .header("Authorization", "Bearer " + tokenDe(ADMIN_DELGADO)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(orden.getId()))
                .andExpect(jsonPath("$.estado").value("EN_PROCESO"));

        OrdenServicio actualizada = ordenes.findById(orden.getId()).orElseThrow();
        assertThat(actualizada.getEstado()).isEqualTo(EstadoOrden.EN_PROCESO);

        List<OrdenHistorial> pasos = historialRepo.findByOrdenIdOrderByOcurridoEnAsc(orden.getId());
        assertThat(pasos).hasSize(historialAntes + 1);
        OrdenHistorial ultimoPaso = pasos.get(pasos.size() - 1);
        assertThat(ultimoPaso.getActor()).isEqualTo(ActorHistorial.ADMIN_MYPE);
        assertThat(ultimoPaso.getEstadoAnterior()).isEqualTo(EstadoOrden.EN_CAMINO);
        assertThat(ultimoPaso.getEstadoNuevo()).isEqualTo(EstadoOrden.EN_PROCESO);
        assertThat(ultimoPaso.getNota()).isEqualTo("El técnico empezó el trabajo");
    }

    @Test
    @DisplayName("Pasar a en proceso una orden que no lo admite devuelve 409")
    void pasarAEnProcesoDesdePendienteDa409() throws Exception {
        OrdenServicio orden = fabricarOrden(mypeDelgado(), EstadoOrden.PENDIENTE);

        mvc.perform(post("/api/panel/ordenes/{id}/en-proceso", orden.getId())
                        .header("Authorization", "Bearer " + tokenDe(ADMIN_DELGADO)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.estado").value(409))
                .andExpect(jsonPath("$.mensaje").value("Una orden pendiente no puede pasar a en proceso"));
    }

    @Test
    @DisplayName("Cerrar orden completada con total null guarda datos sin cambiar de estado ni duplicar historial")
    void cerrarOrdenCompletadaConTotalNull() throws Exception {
        OrdenServicio orden = fabricarOrden(mypeDelgado(), EstadoOrden.COMPLETADA);
        int historialAntes = historialRepo.findByOrdenIdOrderByOcurridoEnAsc(orden.getId()).size();

        mvc.perform(post("/api/panel/ordenes/{id}/cerrar", orden.getId())
                        .header("Authorization", "Bearer " + tokenDe(ADMIN_DELGADO))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                 {
                                   "diagnostico": "Rellenado posterior por el taller",
                                   "precioManoObra": 75.00
                                 }
                                 """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("COMPLETADA"))
                .andExpect(jsonPath("$.diagnostico").value("Rellenado posterior por el taller"));

        OrdenServicio guardada = ordenes.findById(orden.getId()).orElseThrow();
        assertThat(guardada.getEstado()).isEqualTo(EstadoOrden.COMPLETADA);
        assertThat(guardada.getTotal().compareTo(new BigDecimal("75.00"))).isZero();

        List<OrdenHistorial> pasos = historialRepo.findByOrdenIdOrderByOcurridoEnAsc(orden.getId());
        assertThat(pasos).hasSize(historialAntes);
    }
}
