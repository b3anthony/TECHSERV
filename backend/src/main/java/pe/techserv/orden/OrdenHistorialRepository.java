package pe.techserv.orden;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface OrdenHistorialRepository extends JpaRepository<OrdenHistorial, Long> {

    List<OrdenHistorial> findByOrdenIdOrderByOcurridoEnAsc(Long ordenId);
}
