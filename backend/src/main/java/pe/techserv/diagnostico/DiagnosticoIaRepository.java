package pe.techserv.diagnostico;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.Optional;

/**
 * Sin rutas por mypeId aqui a proposito: quien llega a este repositorio ya
 * cargo la orden con {@code findByIdAndMypeId}. El ordenId que se pasa es uno
 * ya comprobado.
 */
public interface DiagnosticoIaRepository extends JpaRepository<DiagnosticoIa, Long> {

    Optional<DiagnosticoIa> findByOrdenId(Long ordenId);

    /**
     * Crea la fila si no existe, sin estrellarse si otra peticion la crea a la
     * vez: el UNIQUE de orden_id decide y la segunda no hace nada. El UPDATE que
     * se asigna a si mismo es el "no hagas nada" de MySQL; INSERT IGNORE no vale
     * porque callaria tambien un fallo de clave foranea.
     */
    @Modifying
    @Query(value = """
                   INSERT INTO orden_diagnostico_ia (orden_id, estado)
                   VALUES (:ordenId, 'PENDIENTE')
                   ON DUPLICATE KEY UPDATE orden_id = orden_id
                   """, nativeQuery = true)
    int crearSiFalta(@Param("ordenId") Long ordenId);

    /** La fila bloqueada hasta el final de la transaccion: dos lanzamientos se ponen en fila. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT d FROM DiagnosticoIa d WHERE d.ordenId = :ordenId")
    Optional<DiagnosticoIa> bloquear(@Param("ordenId") Long ordenId);

    /**
     * Guarda el resultado solo si el intento sigue siendo el vigente.
     * Devuelve 0 si otro lanzamiento lo sustituyo mientras tanto.
     */
    @Modifying
    @Query("""
           UPDATE DiagnosticoIa d
              SET d.estado = :estado, d.modelo = :modelo, d.resultado = :resultado,
                  d.error = :error, d.fotosAnalizadas = :analizadas,
                  d.fotosOmitidas = :omitidas, d.generadoEn = :generadoEn
            WHERE d.ordenId = :ordenId AND d.intento = :intento
           """)
    int guardarSiVigente(@Param("ordenId") Long ordenId,
                         @Param("intento") String intento,
                         @Param("estado") EstadoDiagnostico estado,
                         @Param("modelo") String modelo,
                         @Param("resultado") String resultado,
                         @Param("error") String error,
                         @Param("analizadas") int analizadas,
                         @Param("omitidas") int omitidas,
                         @Param("generadoEn") OffsetDateTime generadoEn);
}
