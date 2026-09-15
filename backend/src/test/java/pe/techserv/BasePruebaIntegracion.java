package pe.techserv;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;

/**
 * Base de las pruebas de integracion.
 *
 * Levanta un PostgreSQL de verdad y deja que Flyway aplique las mismas
 * migraciones que en desarrollo, semilla incluida. Dos razones para no usar una
 * base en memoria: el esquema tiene CHECK y tipos de Postgres que H2 no
 * reproduce, y probar contra otro motor significa probar otra cosa.
 *
 * El contenedor es SUYO: no toca la base de desarrollo del puerto 55432, y
 * ninguna prueba se acerca a datos reales.
 *
 * ── Por que el contenedor se arranca a mano y no con @Container ──
 *
 * Con @Testcontainers + @Container, JUnit para el contenedor al terminar CADA
 * clase de pruebas. Spring, en cambio, cachea el contexto y lo reutiliza en la
 * clase siguiente: la segunda clase se encuentra con un DataSource que apunta a
 * una base ya apagada y falla con "Could not open JPA EntityManager", despues de
 * 30 s esperando en el pool.
 *
 * Medido aqui el 15 set 2026: cada clase pasaba en verde por separado y la suite
 * completa daba 5 fallos y 2 errores. Arrancandolo en un bloque static, el
 * contenedor vive lo que vive la JVM y todas las clases comparten el mismo, que
 * es ademas lo que hace que la suite tarde segundos y no minutos.
 */
@SpringBootTest
public abstract class BasePruebaIntegracion {

    @ServiceConnection
    static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("postgres:16-alpine")
                    .withDatabaseName("techserv_pruebas")
                    .withUsername("pruebas")
                    .withPassword("pruebas");

    static {
        POSTGRES.start();
    }

    @DynamicPropertySource
    static void propiedades(DynamicPropertyRegistry registro) {
        // El correo no sale a ningún sitio durante las pruebas.
        registro.add("spring.mail.host", () -> "localhost");
        registro.add("spring.mail.port", () -> 1025);
    }
}
