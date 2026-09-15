package pe.techserv.seguridad;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface AccionTokenRepository extends JpaRepository<AccionToken, UUID> {

    List<AccionToken> findByOrdenId(Long ordenId);
}
