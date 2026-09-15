package pe.techserv;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Base de las pruebas de integracion.
 *
 * Levanta un PostgreSQL de verdad en un contenedor propio y deja que Flyway
 * aplique las mismas migraciones que en desarrollo, semilla incluida. Dos
 * razones para no usar una base en memoria: el esquema tiene CHECK y tipos de
 * Postgres que H2 no reproduce, y probar contra otro motor significa probar otra
 * cosa.
 *
 * El contenedor es SUYO: no toca la base de desarrollo del puerto 55432, y
 * ninguna prueba se acerca a datos reales.
 */
@SpringBootTest
@Testcontainers
public abstract class BasePruebaIntegracion {

    @Container
    @ServiceConnection
    static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("postgres:16-alpine")
                    .withDatabaseName("techserv_pruebas")
                    .withUsername("pruebas")
                    .withPassword("pruebas");

    @DynamicPropertySource
    static void propiedades(DynamicPropertyRegistry registro) {
        // El correo no sale a ningún sitio durante las pruebas.
        registro.add("spring.mail.host", () -> "localhost");
        registro.add("spring.mail.port", () -> 1025);
    }
}
