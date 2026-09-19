package pe.techserv.seguridad;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public interface AccionTokenRepository extends JpaRepository<AccionToken, UUID> {

    List<AccionToken> findByOrdenId(Long ordenId);

    /**
     * Marca el token como usado SOLO si nadie lo habia usado ya. Devuelve 1 si esta
     * peticion se lo quedo y 0 si llego segunda: es la base quien arbitra, porque
     * comprobar en Java y escribir despues deja un hueco por el que caben dos clics
     * simultaneos.
     */
    @Modifying
    @Query("UPDATE AccionToken t SET t.usadoEn = :ahora WHERE t.jti = :jti AND t.usadoEn IS NULL")
    int marcarUsado(@Param("jti") UUID jti, @Param("ahora") OffsetDateTime ahora);
}
