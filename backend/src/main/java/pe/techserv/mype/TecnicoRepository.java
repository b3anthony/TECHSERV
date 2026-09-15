package pe.techserv.mype;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
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
}
