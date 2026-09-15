package pe.techserv.orden;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

public interface CalificacionRepository extends JpaRepository<Calificacion, Long> {

    Optional<Calificacion> findByOrdenId(Long ordenId);

    boolean existsByOrdenId(Long ordenId);

    @Query("""
           SELECT COALESCE(AVG(c.puntaje), 0) FROM Calificacion c
           WHERE c.orden.mype.id = :mypeId
           """)
    double promedioDeLaMype(@Param("mypeId") Long mypeId);

    @Query("SELECT COUNT(c) FROM Calificacion c WHERE c.orden.mype.id = :mypeId")
    long serviciosCalificados(@Param("mypeId") Long mypeId);
}
