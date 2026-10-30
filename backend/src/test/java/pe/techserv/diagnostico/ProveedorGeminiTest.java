package pe.techserv.diagnostico;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;
import pe.techserv.comun.PropiedadesTechServ;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * El cliente de Gemini contra un servidor HTTP falso (el del JDK): forma de la
 * peticion, donde va la clave, y el salto al modelo de respaldo. Sin red.
 */
class ProveedorGeminiTest {

    private static final String CLAVE = "clave-de-prueba-123";

    private HttpServer servidor;
    /** Que responde cada modelo: codigo HTTP. */
    private final Map<String, Integer> codigoPorModelo = new ConcurrentHashMap<>();
    private final List<String> rutasPedidas = new CopyOnWriteArrayList<>();
    private final List<String> clavesRecibidas = new CopyOnWriteArrayList<>();
    private final List<JsonNode> cuerposRecibidos = new CopyOnWriteArrayList<>();
    private final ObjectMapper json = new ObjectMapper();

    private static final String RESPUESTA_OK = """
            {"candidates":[{"finishReason":"STOP","content":{"parts":[{"text":
              "{\\"equipo\\":{\\"tipo\\":\\"Lavadora\\",\\"marca\\":null,\\"modelo\\":null,\\"fuente\\":\\"NO_IDENTIFICADO\\"},\\"resumen\\":\\"Rodaje gastado\\",\\"posiblesFallas\\":[],\\"repuestosInventario\\":[{\\"repuestoId\\":1,\\"motivo\\":\\"m\\"}],\\"otrosRepuestos\\":[],\\"precauciones\\":[]}"
            }]}}]}
            """;

    @BeforeEach
    void arrancar() throws IOException {
        servidor = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        servidor.createContext("/", intercambio -> {
            String ruta = intercambio.getRequestURI().toString();
            rutasPedidas.add(ruta);
            clavesRecibidas.add(intercambio.getRequestHeaders().getFirst("x-goog-api-key"));
            cuerposRecibidos.add(json.readTree(intercambio.getRequestBody()));
            String modelo = ruta.replaceAll(".*/models/([^:]+):generateContent.*", "$1");
            int codigo = codigoPorModelo.getOrDefault(modelo, 200);
            byte[] cuerpo = (codigo == 200 ? RESPUESTA_OK : "{\"error\":{\"code\":" + codigo + "}}")
                    .getBytes(StandardCharsets.UTF_8);
            intercambio.getResponseHeaders().add("Content-Type", "application/json");
            intercambio.sendResponseHeaders(codigo, cuerpo.length);
            intercambio.getResponseBody().write(cuerpo);
            intercambio.close();
        });
        servidor.start();
    }

    @AfterEach
    void parar() {
        servidor.stop(0);
    }

    private ProveedorGemini proveedor(String respaldo) {
        var ia = new PropiedadesTechServ.Ia(CLAVE, "principal", respaldo,
                "http://127.0.0.1:" + servidor.getAddress().getPort() + "/v1beta", 14_000_000);
        var props = new PropiedadesTechServ(null, null, null, null, null, ia);
        return new ProveedorGemini(props, RestClient.builder(), json);
    }

    private static ProveedorDiagnostico.Peticion peticion() {
        return new ProveedorDiagnostico.Peticion("Reparación de electrodomésticos",
                "La lavadora suena fuerte",
                List.of(new ProveedorDiagnostico.Foto("image/jpeg", new byte[]{1, 2, 3})),
                List.of(new ProveedorDiagnostico.RepuestoCatalogo(1L, "Rodaje 6205", "Rodaje sellado")));
    }

    @Test
    @DisplayName("La petición lleva la foto, el esquema y la clave en la cabecera, nunca en la URL")
    void formaDeLaPeticion() {
        var hecho = proveedor("respaldo").diagnosticar(peticion());

        assertThat(hecho.modelo()).isEqualTo("principal");
        assertThat(hecho.respuesta().resumen()).isEqualTo("Rodaje gastado");
        assertThat(rutasPedidas).containsExactly("/v1beta/models/principal:generateContent");
        assertThat(rutasPedidas.get(0)).doesNotContain(CLAVE);
        assertThat(clavesRecibidas).containsExactly(CLAVE);

        JsonNode cuerpo = cuerposRecibidos.get(0);
        JsonNode partes = cuerpo.at("/contents/0/parts");
        assertThat(partes.get(0).get("text").asText()).contains("La lavadora suena fuerte").contains("1 | Rodaje 6205");
        assertThat(partes.get(1).at("/inlineData/mimeType").asText()).isEqualTo("image/jpeg");
        assertThat(partes.get(1).at("/inlineData/data").asText()).isEqualTo("AQID");
        assertThat(cuerpo.at("/generationConfig/responseMimeType").asText()).isEqualTo("application/json");
        assertThat(cuerpo.at("/generationConfig/responseJsonSchema/properties/repuestosInventario").isMissingNode()).isFalse();
        assertThat(cuerpo.at("/systemInstruction/parts/0/text").asText()).contains("No inventes ids");
    }

    @Test
    @DisplayName("Si el modelo principal está saturado (503), responde el de respaldo")
    void saturadoPasaAlRespaldo() {
        codigoPorModelo.put("principal", 503);

        var hecho = proveedor("respaldo").diagnosticar(peticion());

        assertThat(hecho.modelo()).isEqualTo("respaldo");
        assertThat(rutasPedidas).containsExactly(
                "/v1beta/models/principal:generateContent",
                "/v1beta/models/respaldo:generateContent");
    }

    @Test
    @DisplayName("Con los dos saturados, el error dice que Gemini está saturado")
    void ambosSaturados() {
        codigoPorModelo.put("principal", 503);
        codigoPorModelo.put("respaldo", 503);

        assertThatThrownBy(() -> proveedor("respaldo").diagnosticar(peticion()))
                .isInstanceOf(FalloProveedorIa.class)
                .hasMessageContaining("saturado");
        assertThat(rutasPedidas).hasSize(2);
    }

    @Test
    @DisplayName("Un error que no es de saturación (clave mala) no prueba el respaldo")
    void claveMalaNoSaltaAlRespaldo() {
        codigoPorModelo.put("principal", 403);

        assertThatThrownBy(() -> proveedor("respaldo").diagnosticar(peticion()))
                .isInstanceOf(FalloProveedorIa.class)
                .hasMessageContaining("clave");
        assertThat(rutasPedidas).hasSize(1);
    }

    @Test
    @DisplayName("Sin respaldo configurado, un 503 se informa sin más")
    void sinRespaldo() {
        codigoPorModelo.put("principal", 503);

        assertThatThrownBy(() -> proveedor("").diagnosticar(peticion()))
                .isInstanceOf(FalloProveedorIa.class);
        assertThat(rutasPedidas).hasSize(1);
    }
}
