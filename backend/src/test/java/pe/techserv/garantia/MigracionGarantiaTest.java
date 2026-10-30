package pe.techserv.garantia;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import pe.techserv.BasePruebaIntegracion;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Ejecuta la migración real sobre datos anteriores, en una base aislada (en MySQL, esquema = base). */
class MigracionGarantiaTest extends BasePruebaIntegracion {
    @Autowired DataSource fuente;
    private final String esquema = "garantia_migracion_" + UUID.randomUUID().toString().replace("-", "");

    @AfterEach
    void limpiar() throws SQLException {
        try (Connection c = fuente.getConnection(); Statement s = c.createStatement()) {
            s.execute("DROP DATABASE IF EXISTS " + esquema);
        }
    }

    @Test
    void rellenaCierresHistoricosYAplicaChecksEIndiceParcial() throws Exception {
        try (Connection c = fuente.getConnection()) {
            String original = c.getCatalog();
            try (Statement crear = c.createStatement()) {
                crear.execute("CREATE DATABASE " + esquema);
            }
            c.setCatalog(esquema);
            // El Statement se crea DESPUÉS de cambiar de base: el driver de MySQL
            // ejecuta cada Statement en la base en la que se creó.
            try (Statement s = c.createStatement()) {
                ScriptUtils.executeSqlScript(c, new ClassPathResource("db/migration/V1__esquema.sql"));
                // Sin allowMultiQueries, el driver de MySQL ejecuta una sentencia por llamada.
                for (String sentencia : """
                        INSERT INTO usuario (nombres,apellidos,email,clave_hash,rol) VALUES
                            ('Cliente','Prueba','cliente@garantia.invalid','hash','CLIENTE'),
                            ('Técnico','Prueba','tecnico@garantia.invalid','hash','TECNICO');
                        INSERT INTO mype (razon_social,ruc,direccion,distrito) VALUES ('Taller','12345678901','Calle 1','Trujillo');
                        INSERT INTO cliente (usuario_id) VALUES (1);
                        INSERT INTO tecnico (usuario_id,mype_id) VALUES (2,1);
                        INSERT INTO orden_servicio (codigo,cliente_id,mype_id,tecnico_id,especialidad,descripcion_falla,
                            direccion,distrito,fecha_programada,hora_programada,estado,actualizada_en) VALUES
                            ('ORD-M1',1,1,1,'SERVICIOS_HOGAR','Falla','Calle 1','Trujillo','2026-01-01','09:00','COMPLETADA','2026-02-15 12:00:00'),
                            ('ORD-M2',1,1,1,'SERVICIOS_HOGAR','Falla','Calle 1','Trujillo','2026-01-01','09:00','CALIFICADA','2026-02-20 12:00:00'),
                            ('ORD-M3',1,1,1,'SERVICIOS_HOGAR','Falla','Calle 1','Trujillo','2026-01-01','09:00','COMPLETADA','2026-02-25 12:00:00'),
                            ('ORD-M4',1,1,NULL,'SERVICIOS_HOGAR','Falla','Calle 1','Trujillo','2026-01-01','09:00','PENDIENTE','2026-02-26 12:00:00');
                        INSERT INTO orden_historial (orden_id,estado_nuevo,actor,ocurrido_en) VALUES
                            (1,'COMPLETADA','TECNICO','2026-01-05 12:00:00'),
                            (2,'COMPLETADA','TECNICO','2026-01-10 12:00:00'),
                            (2,'CALIFICADA','CLIENTE','2026-02-20 12:00:00');
                        """.split(";")) {
                    if (!sentencia.isBlank()) s.execute(sentencia);
                }
                ScriptUtils.executeSqlScript(c, new ClassPathResource("db/migration/V10__garantia.sql"));
                try (var filas = s.executeQuery("""
                        SELECT orden_id, dias, CAST(inicia_en AS CHAR) AS inicio,
                               vence_en = inicia_en + INTERVAL 30 DAY AS plazo,
                               vence_en < NOW(6) AS vencida
                          FROM garantia ORDER BY orden_id
                        """)) {
                    for (String inicio : new String[]{"2026-01-05", "2026-01-10", "2026-02-25"}) {
                        assertThat(filas.next()).isTrue();
                        assertThat(filas.getInt("dias")).isEqualTo(30);
                        assertThat(filas.getString("inicio")).startsWith(inicio);
                        assertThat(filas.getBoolean("plazo")).isTrue();
                        assertThat(filas.getBoolean("vencida")).isTrue();
                    }
                    assertThat(filas.next()).isFalse();
                }
                assertThatThrownBy(() -> s.executeUpdate("UPDATE mype SET garantia_dias = 45"))
                        .isInstanceOf(SQLException.class).hasMessageContaining("mype_garantia_dias_validos");
                assertThatThrownBy(() -> s.executeUpdate("UPDATE orden_servicio SET tipo = 'GARANTIA' WHERE id = 4"))
                        .isInstanceOf(SQLException.class).hasMessageContaining("orden_garantia_coherente");
                assertThatThrownBy(() -> s.executeUpdate("UPDATE orden_servicio SET garantia_de_id = 1 WHERE id = 4"))
                        .isInstanceOf(SQLException.class).hasMessageContaining("orden_garantia_coherente");
                s.executeUpdate("UPDATE orden_servicio SET tipo = 'GARANTIA', garantia_de_id = 1 WHERE id = 4");
                String nueva = """
                        INSERT INTO orden_servicio (codigo,cliente_id,mype_id,especialidad,descripcion_falla,
                            direccion,distrito,fecha_programada,hora_programada,tipo,garantia_de_id)
                        VALUES ('ORD-M5',1,1,'SERVICIOS_HOGAR','Falla','Calle 1','Trujillo','2026-03-01','09:00','GARANTIA',1)
                        """;
                assertThatThrownBy(() -> s.executeUpdate(nueva)).isInstanceOf(SQLException.class)
                        .hasMessageContaining("idx_orden_garantia_abierta");
                s.executeUpdate("UPDATE orden_servicio SET estado = 'CANCELADA' WHERE id = 4");
                assertThat(s.executeUpdate(nueva)).isEqualTo(1);
                s.executeUpdate("DELETE FROM orden_servicio WHERE id = 3");
                try (var filas = s.executeQuery("SELECT COUNT(*) FROM garantia WHERE orden_id = 3")) {
                    assertThat(filas.next()).isTrue();
                    assertThat(filas.getInt(1)).isZero();
                }
            } finally {
                c.setCatalog(original);
            }
        }
    }
}
