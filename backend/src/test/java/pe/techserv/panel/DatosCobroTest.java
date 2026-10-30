package pe.techserv.panel;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.dao.DataAccessException;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.support.TransactionTemplate;
import pe.techserv.BasePruebaIntegracion;
import pe.techserv.almacen.ServicioAlmacenamiento;
import pe.techserv.comun.Especialidad;
import pe.techserv.mype.*;
import pe.techserv.orden.EstadoOrden;
import pe.techserv.orden.OrdenServicio;
import pe.techserv.orden.OrdenServicioRepository;
import pe.techserv.pago.MetodoPago;
import pe.techserv.pago.PagoRepository;
import pe.techserv.seguridad.ServicioJwt;
import pe.techserv.seguridad.UsuarioAutenticado;
import pe.techserv.usuario.*;
import pe.techserv.visita.ServicioEnlaces;

import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.containsString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Talleres, usuarios y órdenes propios: ninguna prueba modifica la semilla compartida. */
@AutoConfigureMockMvc
class DatosCobroTest extends BasePruebaIntegracion {

    private static final String RUTA = "/api/panel/ajustes/cobro";
    private static final String CCI = "00212345678901234567";
    private static final String DATOS_COMPLETOS = """
            {"yapeNumero":"987654321","plinNumero":"912345678","banco":"Banco de prueba",
             "titular":"Ana Pérez","numeroCuenta":"001-123456","cci":"%s"}
            """.formatted(CCI);

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;
    @Autowired MypeRepository mypes;
    @Autowired MypeCobroRepository cobros;
    @Autowired AdministradorRepository administradores;
    @Autowired TecnicoRepository tecnicos;
    @Autowired UsuarioRepository usuarios;
    @Autowired ClienteRepository clientes;
    @Autowired OrdenServicioRepository ordenes;
    @Autowired PagoRepository pagos;
    @Autowired ServicioJwt jwt;
    @Autowired ServicioEnlaces enlaces;
    @Autowired ServicioDatosCobro servicio;
    @Autowired ServicioAlmacenamiento almacen;
    @Autowired TransactionTemplate tx;
    @MockitoBean JavaMailSender correo;

    private final List<Long> talleresCreados = new ArrayList<>();
    private final List<Long> usuariosCreados = new ArrayList<>();
    private Cliente cliente;
    private String sesionCliente;

    private record Taller(Mype mype, Usuario admin, String sesion) {}
    private record Visita(OrdenServicio orden, String token) {}

    @BeforeEach
    void preparar() {
        when(correo.createMimeMessage()).thenAnswer(inv -> new JavaMailSenderImpl().createMimeMessage());
        Usuario usuario = usuario(Rol.CLIENTE);
        cliente = new Cliente();
        cliente.setUsuario(usuario);
        cliente = clientes.save(cliente);
        sesionCliente = jwt.paraSesion(usuario);
    }

    @AfterEach
    void limpiar() throws Exception {
        for (Long id : talleresCreados) {
            jdbc.update("DELETE FROM orden_servicio WHERE mype_id = ?", id);
            jdbc.update("DELETE FROM mype WHERE id = ?", id);
            Path carpeta = almacen.getRaiz().resolve("cobro-" + id);
            if (Files.exists(carpeta)) {
                try (var archivos = Files.walk(carpeta)) {
                    for (Path archivo : archivos.sorted(Comparator.reverseOrder()).toList()) {
                        Files.deleteIfExists(archivo);
                    }
                }
            }
        }
        for (Long id : usuariosCreados) jdbc.update("DELETE FROM usuario WHERE id = ?", id);
    }

    @Test
    void sinConfiguracionDevuelveLosOchoCamposNulosSinCrearFila() throws Exception {
        Taller taller = taller();
        JsonNode datos = cuerpo(ver(taller).andExpect(status().isOk()));
        assertThat(datos.size()).isEqualTo(8);
        datos.forEach(valor -> assertThat(valor.isNull()).isTrue());
        assertThat(cobros.findByMypeId(taller.mype().getId())).isEmpty();
    }

    @Test
    void cadaAdministradorSoloLeeYModificaSuTallerInclusoSiMandaOtroId() throws Exception {
        Taller primero = taller();
        Taller segundo = taller();
        guardar(primero, DATOS_COMPLETOS).andExpect(status().isOk());
        String qrPrimero = subir(primero, "YAPE", "image/png", new byte[]{1}).get("yapeQr").asText();

        mvc.perform(get(RUTA).header("Authorization", bearer(segundo))
                        .param("mypeId", primero.mype().getId().toString()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.yapeNumero").isEmpty());
        guardar(segundo, """
                {"mypeId":%d,"yapeNumero":"999888777"}
                """.formatted(primero.mype().getId())).andExpect(status().isOk());
        JsonNode subida = cuerpo(mvc.perform(multipart(RUTA + "/qr/YAPE")
                        .file(imagen("image/png", new byte[]{2}))
                        .param("mypeId", primero.mype().getId().toString())
                        .header("Authorization", bearer(segundo))).andExpect(status().isOk()));
        Path qrSegundo = archivo(subida.get("yapeQr").asText());
        assertThat(qrSegundo.getParent().getFileName().toString()).isEqualTo("cobro-" + segundo.mype().getId());
        mvc.perform(delete(RUTA + "/qr/YAPE").header("Authorization", bearer(segundo))
                        .param("mypeId", primero.mype().getId().toString())).andExpect(status().isOk());
        assertThat(qrSegundo).doesNotExist();
        assertThat(archivo(qrPrimero)).exists();
        ver(primero).andExpect(status().isOk())
                .andExpect(jsonPath("$.yapeNumero").value("987654321"))
                .andExpect(jsonPath("$.yapeQr").value(qrPrimero));
        ver(segundo).andExpect(status().isOk()).andExpect(jsonPath("$.yapeNumero").value("999888777"));
    }

    @Test
    void clienteRecibe403EnTodasLasRutasDeCobro() throws Exception {
        String cabecera = "Bearer " + sesionCliente;
        mvc.perform(get(RUTA).header("Authorization", cabecera)).andExpect(status().isForbidden());
        mvc.perform(put(RUTA).header("Authorization", cabecera).contentType(MediaType.APPLICATION_JSON)
                .content(DATOS_COMPLETOS)).andExpect(status().isForbidden());
        mvc.perform(multipart(RUTA + "/qr/YAPE").file(imagen("image/png", new byte[]{1}))
                .header("Authorization", cabecera)).andExpect(status().isForbidden());
        mvc.perform(delete(RUTA + "/qr/YAPE").header("Authorization", cabecera)).andExpect(status().isForbidden());
    }

    @ParameterizedTest
    @CsvSource({"yapeNumero, 887654321, Yape", "yapeNumero, 98765432, Yape",
            "plinNumero, 91234567a, Plin", "plinNumero, 9123456789, Plin"})
    void celularInvalidoDevuelve400ConErrorEnElCampo(String campo, String numero, String metodo) throws Exception {
        Taller taller = taller();
        guardar(taller, json.writeValueAsString(Map.of(campo, numero)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos." + campo).value("El celular de " + metodo
                        + " debe tener 9 dígitos y empezar por 9"));
        assertThat(cobros.findByMypeId(taller.mype().getId())).isEmpty();
    }

    @Test
    void cciDe19DigitosYTransferenciaIncompletaDevuelvenErroresPorCampo() throws Exception {
        Taller taller = taller();
        guardar(taller, """
                {"banco":"Banco","titular":"Ana","cci":"0021234567890123456"}
                """).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.cci").value("El CCI debe tener exactamente 20 dígitos"));
        guardar(taller, json.writeValueAsString(Map.of("banco", "Banco", "titular", "Ana", "cci", "0".repeat(19) + "A")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.cci").value("El CCI debe tener exactamente 20 dígitos"));
        guardar(taller, """
                {"banco":"Banco","numeroCuenta":"123-456"}
                """).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.titular").value("El titular es obligatorio para la transferencia"));
        guardar(taller, """
                {"titular":"Ana","cci":"%s"}
                """.formatted(CCI)).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.banco").value("El banco es obligatorio para la transferencia"));
        guardar(taller, """
                {"banco":"Banco","titular":"Ana"}
                """).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.numeroCuenta").value("Escribe el número de cuenta o el CCI para la transferencia"));
        assertThat(cobros.findByMypeId(taller.mype().getId())).isEmpty();
    }

    @Test
    void cuentaSoloAdmiteDigitosYGuionesYRespetaLasLongitudesDeLaTabla() throws Exception {
        Taller taller = taller();
        guardar(taller, json.writeValueAsString(Map.of("banco", "Banco", "titular", "Ana", "numeroCuenta", "123 ABC")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.numeroCuenta").value("El número de cuenta solo puede contener dígitos y guiones"));
        guardar(taller, json.writeValueAsString(Map.of("banco", "Banco", "titular", "Ana", "numeroCuenta", "1".repeat(31))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.numeroCuenta").value("El número de cuenta no puede tener más de 30 caracteres"));
        guardar(taller, json.writeValueAsString(Map.of("banco", "B".repeat(61), "titular", "T".repeat(121), "cci", CCI)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.campos.banco").value("El banco no puede tener más de 60 caracteres"))
                .andExpect(jsonPath("$.campos.titular").value("El titular no puede tener más de 120 caracteres"));
    }

    @Test
    void guardaConCuentaOCciNormalizaYVaciosQuitanDatosSinTocarElQr() throws Exception {
        Taller taller = taller();
        String qr = subir(taller, "YAPE", "image/png", new byte[]{1}).get("yapeQr").asText();
        guardar(taller, """
                {"yapeNumero":" 987654321 ","banco":" Banco ","titular":" Ana Pérez ","numeroCuenta":"001-123"}
                """).andExpect(status().isOk()).andExpect(jsonPath("$.banco").value("Banco"))
                .andExpect(jsonPath("$.titular").value("Ana Pérez")).andExpect(jsonPath("$.yapeNumero").value("987654321"))
                .andExpect(jsonPath("$.yapeQr").value(qr));
        guardar(taller, """
                {"banco":"Banco","titular":"Ana","cci":"%s"}
                """.formatted(CCI)).andExpect(status().isOk()).andExpect(jsonPath("$.cci").value(CCI));
        guardar(taller, """
                {"yapeNumero":"","plinNumero":" ","banco":"","titular":" ","numeroCuenta":"","cci":""}
                """).andExpect(status().isOk()).andExpect(jsonPath("$.yapeQr").value(qr))
                .andExpect(jsonPath("$.banco").isEmpty()).andExpect(jsonPath("$.cci").isEmpty());
        assertThat(archivo(qr)).exists();
    }

    @ParameterizedTest
    @ValueSource(strings = {"YAPE", "PLIN"})
    void subirOtroQrSustituyeYBorraElAnteriorYDeleteBorraElNuevo(String metodo) throws Exception {
        Taller taller = taller();
        String campo = metodo.equals("YAPE") ? "yapeQr" : "plinQr";
        guardar(taller, DATOS_COMPLETOS).andExpect(status().isOk());
        String primeraRuta = subir(taller, metodo, "image/png", new byte[]{1, 2}).get(campo).asText();
        Path primera = archivo(primeraRuta);
        assertThat(primera).exists();
        assertThat(primeraRuta).startsWith("/uploads/cobro-" + taller.mype().getId() + "/");
        assertThat(primera.getFileName().toString()).matches("[0-9a-f-]{36}\\.png");
        String segundaRuta = subir(taller, metodo, "image/webp", new byte[]{3, 4}).get(campo).asText();
        Path segunda = archivo(segundaRuta);
        assertThat(segundaRuta).isNotEqualTo(primeraRuta);
        assertThat(primera).doesNotExist();
        assertThat(segunda).hasBinaryContent(new byte[]{3, 4});
        mvc.perform(get(segundaRuta)).andExpect(status().isOk());
        mvc.perform(delete(RUTA + "/qr/{metodo}", metodo).header("Authorization", bearer(taller)))
                .andExpect(status().isOk()).andExpect(jsonPath("$." + campo).isEmpty())
                .andExpect(jsonPath("$.yapeNumero").value("987654321"));
        assertThat(segunda).doesNotExist();
        mvc.perform(delete(RUTA + "/qr/{metodo}", metodo).header("Authorization", bearer(taller)))
                .andExpect(status().isOk());
    }

    @Test
    void qrRechazaTipoVacioYMasDe5MbConservandoElAnterior() throws Exception {
        Taller taller = taller();
        String anterior = subir(taller, "YAPE", "image/jpeg", new byte[]{1}).get("yapeQr").asText();
        enviarImagen(taller, "YAPE", "application/pdf", new byte[]{1}).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensaje").value("Solo se admiten imágenes JPG, PNG o WEBP"));
        enviarImagen(taller, "YAPE", "image/png", new byte[0]).andExpect(status().isBadRequest());
        mvc.perform(multipart(RUTA + "/qr/YAPE").header("Authorization", bearer(taller)))
                .andExpect(status().isBadRequest());
        enviarImagen(taller, "YAPE", "image/png", new byte[5 * 1024 * 1024 + 1]).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensaje").value(containsString("máximo 5 MB")));
        ver(taller).andExpect(status().isOk()).andExpect(jsonPath("$.yapeQr").value(anterior));
        assertThat(archivo(anterior)).exists();
        try (var archivos = Files.list(archivo(anterior).getParent())) {
            assertThat(archivos.count()).isEqualTo(1);
        }
    }

    @Test
    void qrAceptaExactamente5Mb() throws Exception {
        Taller taller = taller();
        String ruta = subir(taller, "PLIN", "image/png", new byte[5 * 1024 * 1024]).get("plinQr").asText();
        assertThat(Files.size(archivo(ruta))).isEqualTo(5L * 1024 * 1024);
    }

    @ParameterizedTest
    @ValueSource(strings = {"EFECTIVO", "TRANSFERENCIA", "OTRO", "yape"})
    void metodoDeQrInvalidoDa400EnPostYDelete(String metodo) throws Exception {
        Taller taller = taller();
        enviarImagen(taller, metodo, "image/png", new byte[]{1}).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.mensaje").value("El QR debe ser de Yape o Plin"));
        mvc.perform(delete(RUTA + "/qr/{metodo}", metodo).header("Authorization", bearer(taller)))
                .andExpect(status().isBadRequest());
        assertThat(cobros.findByMypeId(taller.mype().getId())).isEmpty();
    }

    @Test
    void rollbackDeReemplazoODeleteConservaElQrVigenteYLimpiaElNuevo() throws Exception {
        Taller taller = taller();
        String anterior = subir(taller, "YAPE", "image/png", new byte[]{1}).get("yapeQr").asText();
        AtomicReference<String> nueva = new AtomicReference<>();
        tx.executeWithoutResult(estado -> {
            nueva.set(servicio.subirQr(principal(taller), "YAPE", imagen("image/png", new byte[]{2})).yapeQr());
            assertThat(archivo(nueva.get())).exists();
            assertThat(archivo(anterior)).exists();
            estado.setRollbackOnly();
        });
        assertThat(archivo(nueva.get())).doesNotExist();
        tx.executeWithoutResult(estado -> {
            servicio.quitarQr(principal(taller), "YAPE");
            estado.setRollbackOnly();
        });
        assertThat(archivo(anterior)).exists();
        ver(taller).andExpect(status().isOk()).andExpect(jsonPath("$.yapeQr").value(anterior));
    }

    @Test
    void laBaseProtegeCelularesCciCuentaYTransferenciaYElBorradoEsEnCascada() throws Exception {
        Taller taller = taller();
        guardar(taller, DATOS_COMPLETOS).andExpect(status().isOk());
        Long id = taller.mype().getId();
        // MySQL avisa de un CHECK roto con SQLState HY000, que Spring no clasifica
        // como violación de integridad: se comprueba el nombre del CHECK, que
        // además dice cuál de ellos saltó.
        for (String columna : List.of("yape", "plin")) {
            assertThatThrownBy(() -> jdbc.update("UPDATE mype_cobro SET " + columna + "_numero = '812345678' WHERE mype_id = ?", id))
                    .isInstanceOf(DataAccessException.class).hasMessageContaining("cobro_" + columna + "_celular");
        }
        assertThatThrownBy(() -> jdbc.update("UPDATE mype_cobro SET cci = '1234567890123456789' WHERE mype_id = ?", id))
                .isInstanceOf(DataAccessException.class).hasMessageContaining("cobro_cci_valido");
        assertThatThrownBy(() -> jdbc.update("UPDATE mype_cobro SET numero_cuenta = 'ABC' WHERE mype_id = ?", id))
                .isInstanceOf(DataAccessException.class).hasMessageContaining("cobro_cuenta_valida");
        assertThatThrownBy(() -> jdbc.update("UPDATE mype_cobro SET titular = NULL WHERE mype_id = ?", id))
                .isInstanceOf(DataAccessException.class).hasMessageContaining("cobro_transferencia_completa");
        jdbc.update("DELETE FROM mype WHERE id = ?", id);
        assertThat(cobros.findByMypeId(id)).isEmpty();
    }

    @ParameterizedTest
    @EnumSource(value = EstadoOrden.class, mode = EnumSource.Mode.EXCLUDE, names = {"COMPLETADA", "CALIFICADA"})
    void datosCobroSonNullEnCualquierOtroPaso(EstadoOrden estado) throws Exception {
        Taller taller = taller();
        guardar(taller, DATOS_COMPLETOS).andExpect(status().isOk());
        JsonNode visita = verVisita(visita(taller, estado, null));
        assertThat(visita.has("datosCobro")).isTrue();
        assertThat(visita.get("datosCobro").isNull()).isTrue();
    }

    @Test
    void calificadaSinCobrarSigueEnElPasoDeCobroYTraeLosDatos() throws Exception {
        // El cliente puede calificar antes de que el técnico registre el pago.
        Taller taller = taller();
        guardar(taller, DATOS_COMPLETOS).andExpect(status().isOk());
        JsonNode datos = verVisita(visita(taller, EstadoOrden.CALIFICADA, MetodoPago.YAPE)).get("datosCobro");
        assertThat(datos.get("yape").get("numero").asText()).isEqualTo("987654321");
    }

    @ParameterizedTest
    @EnumSource(MetodoPago.class)
    void alCobrarSoloEnviaElMetodoElegidoAunqueYaNoEsteAceptado(MetodoPago metodo) throws Exception {
        Taller taller = taller();
        guardar(taller, DATOS_COMPLETOS).andExpect(status().isOk());
        aceptados(taller, MetodoPago.EFECTIVO);
        JsonNode datos = verVisita(visita(taller, EstadoOrden.COMPLETADA, metodo)).get("datosCobro");
        assertThat(datos.size()).isEqualTo(metodo == MetodoPago.EFECTIVO ? 0 : 1);
        switch (metodo) {
            case YAPE -> assertThat(datos.get("yape").get("numero").asText()).isEqualTo("987654321");
            case PLIN -> assertThat(datos.get("plin").get("numero").asText()).isEqualTo("912345678");
            case TRANSFERENCIA -> assertThat(datos.get("transferencia").get("cci").asText()).isEqualTo(CCI);
            case EFECTIVO -> assertThat(datos.isEmpty()).isTrue();
        }
    }

    @Test
    void sinMetodoElegidoSoloEnviaLosAceptadosConDatos() throws Exception {
        Taller taller = taller();
        guardar(taller, DATOS_COMPLETOS).andExpect(status().isOk());
        aceptados(taller, MetodoPago.YAPE, MetodoPago.TRANSFERENCIA, MetodoPago.EFECTIVO);
        JsonNode datos = verVisita(visita(taller, EstadoOrden.COMPLETADA, null)).get("datosCobro");
        assertThat(datos.size()).isEqualTo(2);
        assertThat(datos.has("yape")).isTrue();
        assertThat(datos.has("transferencia")).isTrue();
        assertThat(datos.has("plin")).isFalse();
        assertThat(datos.has("efectivo")).isFalse();
    }

    @Test
    void metodoAceptadoSinDatosNoApareceYQrSoloSiAparece() throws Exception {
        Taller taller = taller();
        Visita visita = visita(taller, EstadoOrden.COMPLETADA, null);
        assertThat(verVisita(visita).get("datosCobro").isEmpty()).isTrue();
        String qr = subir(taller, "PLIN", "image/png", new byte[]{1}).get("plinQr").asText();
        JsonNode datos = verVisita(visita).get("datosCobro");
        assertThat(datos.size()).isEqualTo(1);
        assertThat(datos.get("plin").get("qr").asText()).isEqualTo(qr);
        assertThat(datos.get("plin").get("numero").isNull()).isTrue();
        assertThat(datos.has("yape")).isFalse();
        assertThat(datos.has("transferencia")).isFalse();
    }

    @Test
    void metodoElegidoSinDatosNoFiltraLosDatosDeLosOtrosMetodos() throws Exception {
        Taller taller = taller();
        guardar(taller, "{\"yapeNumero\":\"987654321\"}").andExpect(status().isOk());
        assertThat(verVisita(visita(taller, EstadoOrden.COMPLETADA, MetodoPago.PLIN)).get("datosCobro").isEmpty()).isTrue();
    }

    @Test
    void trasCobrarDejaDeEnviarDatosYRegistraElMontoOriginal() throws Exception {
        Taller taller = taller();
        guardar(taller, DATOS_COMPLETOS).andExpect(status().isOk());
        Visita visita = visita(taller, EstadoOrden.COMPLETADA, MetodoPago.YAPE);
        assertThat(verVisita(visita).get("datosCobro").has("yape")).isTrue();
        JsonNode cobrada = cuerpo(mvc.perform(post("/api/visita/{token}/cobro", visita.token())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"metodo\":\"YAPE\"}"))
                .andExpect(status().isOk()));
        assertThat(cobrada.has("datosCobro")).isTrue();
        assertThat(cobrada.get("datosCobro").isNull()).isTrue();
        assertThat(verVisita(visita).get("datosCobro").isNull()).isTrue();
        assertThat(pagos.findByOrdenId(visita.orden().getId()).orElseThrow().getMonto()).isEqualByComparingTo("55.00");
    }

    @Test
    void elTokenDeUnaVisitaSoloDevuelveLosDatosDeSuTaller() throws Exception {
        Taller primero = taller();
        Taller segundo = taller();
        guardar(primero, DATOS_COMPLETOS).andExpect(status().isOk());
        guardar(segundo, "{\"yapeNumero\":\"999888777\"}").andExpect(status().isOk());
        JsonNode datos = verVisita(visita(segundo, EstadoOrden.COMPLETADA, null)).get("datosCobro");
        assertThat(datos.size()).isEqualTo(1);
        assertThat(datos.get("yape").get("numero").asText()).isEqualTo("999888777");
        assertThat(datos.toString()).doesNotContain("987654321", "912345678", "Ana Pérez", CCI);
    }

    private Usuario usuario(Rol rol) {
        Usuario usuario = new Usuario();
        usuario.setNombres("Ana");
        usuario.setApellidos("Pérez");
        usuario.setEmail("cobro-" + UUID.randomUUID() + "@prueba.invalid");
        usuario.setClaveHash("clave-no-utilizada-por-estas-pruebas-de-sesion");
        usuario.setRol(rol);
        usuario = usuarios.save(usuario);
        usuariosCreados.add(usuario.getId());
        return usuario;
    }

    private Taller taller() {
        Mype mype = new Mype();
        mype.setRazonSocial("Taller de cobro " + UUID.randomUUID());
        mype.setRuc("10" + String.format("%09d", ThreadLocalRandom.current().nextLong(1_000_000_000L)));
        mype.setDireccion("Calle de prueba 123");
        mype.setDistrito("Trujillo");
        mype.getMetodosPago().addAll(EnumSet.allOf(MetodoPago.class));
        mype = mypes.save(mype);
        talleresCreados.add(mype.getId());
        Usuario admin = usuario(Rol.ADMIN_MYPE);
        Administrador administrador = new Administrador();
        administrador.setUsuario(admin);
        administrador.setMype(mype);
        administradores.save(administrador);
        return new Taller(mype, admin, jwt.paraSesion(admin));
    }

    private Visita visita(Taller taller, EstadoOrden estado, MetodoPago metodo) {
        Tecnico tecnico = new Tecnico();
        tecnico.setUsuario(usuario(Rol.TECNICO));
        tecnico.setMype(taller.mype());
        tecnico = tecnicos.save(tecnico);
        OrdenServicio orden = new OrdenServicio();
        orden.setCodigo("ORD-C" + UUID.randomUUID().toString().replace("-", "").substring(0, 10).toUpperCase());
        orden.setCliente(cliente);
        orden.setMype(taller.mype());
        orden.setTecnico(tecnico);
        orden.setEspecialidad(Especialidad.SERVICIOS_HOGAR);
        orden.setDescripcionFalla("Falla de prueba de cobro");
        orden.setDireccion("Calle de prueba 123");
        orden.setDistrito("Trujillo");
        orden.setFechaProgramada(LocalDate.now().plusDays(1));
        orden.setHoraProgramada(LocalTime.of(10, 0));
        orden.setEstado(estado);
        orden.setMetodoPago(metodo);
        orden.setPrecioManoObra(new BigDecimal("55.00"));
        orden.setTotal(new BigDecimal("55.00"));
        orden = ordenes.save(orden);
        String url = enlaces.crear(orden);
        return new Visita(orden, url.substring(url.indexOf("/visita/") + 8));
    }

    private void aceptados(Taller taller, MetodoPago... metodos) {
        tx.executeWithoutResult(estado -> {
            Mype mype = mypes.findById(taller.mype().getId()).orElseThrow();
            mype.getMetodosPago().clear();
            mype.getMetodosPago().addAll(List.of(metodos));
        });
    }

    private ResultActions guardar(Taller taller, String datos) throws Exception {
        return mvc.perform(put(RUTA).header("Authorization", bearer(taller))
                .contentType(MediaType.APPLICATION_JSON).content(datos));
    }

    private ResultActions ver(Taller taller) throws Exception {
        return mvc.perform(get(RUTA).header("Authorization", bearer(taller)));
    }

    private JsonNode verVisita(Visita visita) throws Exception {
        return cuerpo(mvc.perform(get("/api/visita/{token}", visita.token())).andExpect(status().isOk()));
    }

    private JsonNode subir(Taller taller, String metodo, String tipo, byte[] bytes) throws Exception {
        return cuerpo(enviarImagen(taller, metodo, tipo, bytes).andExpect(status().isOk()));
    }

    private ResultActions enviarImagen(Taller taller, String metodo, String tipo, byte[] bytes) throws Exception {
        return mvc.perform(multipart(RUTA + "/qr/{metodo}", metodo).file(imagen(tipo, bytes))
                .header("Authorization", bearer(taller)));
    }

    private static MockMultipartFile imagen(String tipo, byte[] bytes) {
        return new MockMultipartFile("imagen", "../../nombre-del-navegador.png", tipo, bytes);
    }

    private Path archivo(String ruta) {
        return almacen.getRaiz().resolve(ruta.substring("/uploads/".length()));
    }

    private JsonNode cuerpo(ResultActions respuesta) throws Exception {
        return json.readTree(respuesta.andReturn().getResponse().getContentAsString());
    }

    private static String bearer(Taller taller) { return "Bearer " + taller.sesion(); }

    private static UsuarioAutenticado principal(Taller taller) {
        Usuario admin = taller.admin();
        return new UsuarioAutenticado(admin.getId(), admin.getEmail(), admin.getNombreCompleto(),
                Rol.ADMIN_MYPE, taller.mype().getId(), null, null);
    }
}
