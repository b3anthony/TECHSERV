package pe.techserv.visita;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EnlaceTecnicoRepository extends JpaRepository<EnlaceTecnico, Long> {

    Optional<EnlaceTecnico> findByHashToken(String hashToken);

    List<EnlaceTecnico> findByOrdenId(Long ordenId);
}
