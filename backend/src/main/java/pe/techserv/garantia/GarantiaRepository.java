package pe.techserv.garantia;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface GarantiaRepository extends JpaRepository<Garantia, Long> {
    Optional<Garantia> findByOrdenIdAndMypeId(Long ordenId, Long mypeId);
}
