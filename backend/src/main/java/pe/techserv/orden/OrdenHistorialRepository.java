package pe.techserv.orden;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.List;

public interface OrdenHistorialRepository extends JpaRepository<OrdenHistorial, Long> {

    List<OrdenHistorial> findByOrdenIdOrderByOcurridoEnAsc(Long ordenId);

    @Query(value = """
           SELECT CAST(AVG(EXTRACT(EPOCH FROM (h.ocurrido_en - os.creada_en)) / 3600.0) AS double precision)
           FROM orden_historial h
           JOIN orden_servicio os ON os.id = h.orden_id
           WHERE os.mype_id = :mypeId
             AND h.estado_nuevo = 'COMPLETADA'
             AND h.ocurrido_en BETWEEN :desde AND :hasta
           """, nativeQuery = true)
    Double horasMediasDeAtencion(@Param("mypeId") Long mypeId,
                                 @Param("desde") OffsetDateTime desde,
                                 @Param("hasta") OffsetDateTime hasta);
}
