package pe.techserv.mype;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

public interface TecnicoRepository extends JpaRepository<Tecnico, Long> {

    List<Tecnico> findByMypeIdOrderByIdAsc(Long mypeId);

    Optional<Tecnico> findByUsuarioEmailIgnoreCase(String email);

    /**
     * Siempre acotado por mype: un administrador no puede alcanzar al tecnico de
     * otro taller ni sabiendo su id. Esta es la forma que tiene el multi-inquilino
     * en la practica.
     */
    Optional<Tecnico> findByIdAndMypeId(Long id, Long mypeId);

    long countByMypeIdAndDisponibleTrue(Long mypeId);

    /** Los que siguen en el equipo, disponibles o no. Los dados de baja no cuentan. */
    long countByMypeIdAndUsuarioActivoTrue(Long mypeId);

    /**
     * La calificacion de cada tecnico del taller: el promedio y el numero de
     * servicios calificados que hizo el. Se calcula sobre las calificaciones
     * reales, igual que el promedio del taller en el catalogo.
     */
    @Query("""
           SELECT os.tecnico.id AS tecnicoId,
                  AVG(cal.puntaje) AS promedio,
                  COUNT(cal.id) AS calificaciones
           FROM Calificacion cal
                JOIN cal.orden os
           WHERE os.mype.id = :mypeId
             AND os.tecnico IS NOT NULL
           GROUP BY os.tecnico.id
           """)
    List<CalificacionTecnico> calificaciones(@Param("mypeId") Long mypeId);

    interface CalificacionTecnico {
        Long getTecnicoId();
        Double getPromedio();
        Long getCalificaciones();
    }

    /** Cuantas ordenes sin cerrar lleva hoy cada tecnico del taller. */
    @Query("""
           SELECT t.id AS tecnicoId, COUNT(os.id) AS abiertas
           FROM Tecnico t
                LEFT JOIN OrdenServicio os
                       ON os.tecnico = t
                      AND os.fechaProgramada = CURRENT_DATE
                      AND os.estado NOT IN (pe.techserv.orden.EstadoOrden.COMPLETADA,
                                            pe.techserv.orden.EstadoOrden.CALIFICADA,
                                            pe.techserv.orden.EstadoOrden.CANCELADA)
           WHERE t.mype = (SELECT m FROM Mype m WHERE m.id = :mypeId)
           GROUP BY t.id
           """)
    List<CargaTecnico> cargaDeHoy(Long mypeId);

    interface CargaTecnico {
        Long getTecnicoId();
        Long getAbiertas();
    }

    @Query(value = """
           SELECT
               t.id AS "tecnicoId",
               CONCAT(u.nombres, ' ', u.apellidos) AS "nombreCompleto",
               COUNT(h.id) AS "ordenesCompletadas",
               COALESCE(SUM(p.monto), 0) AS "ingresoGenerado"
           FROM orden_servicio os
           JOIN tecnico t ON t.id = os.tecnico_id
           JOIN usuario u ON u.id = t.usuario_id
           JOIN orden_historial h ON h.orden_id = os.id AND h.estado_nuevo = 'COMPLETADA'
           LEFT JOIN pago p ON p.orden_id = os.id AND p.estado = 'PAGADO'
           WHERE os.mype_id = :mypeId
             AND h.ocurrido_en BETWEEN :desde AND :hasta
           GROUP BY t.id, u.nombres, u.apellidos
           ORDER BY COUNT(h.id) DESC, "nombreCompleto" ASC
           """, nativeQuery = true)
    List<RankingTecnicoProyeccion> rankingTecnicos(@Param("mypeId") Long mypeId,
                                                   @Param("desde") OffsetDateTime desde,
                                                   @Param("hasta") OffsetDateTime hasta);

    interface RankingTecnicoProyeccion {
        Long getTecnicoId();
        String getNombreCompleto();
        Long getOrdenesCompletadas();
        BigDecimal getIngresoGenerado();
    }
}
