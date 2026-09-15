package pe.techserv.orden;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface OrdenFotoRepository extends JpaRepository<OrdenFoto, Long> {

    List<OrdenFoto> findByOrdenIdOrderByIdAsc(Long ordenId);
}
