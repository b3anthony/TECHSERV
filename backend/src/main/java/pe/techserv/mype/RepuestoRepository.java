package pe.techserv.mype;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface RepuestoRepository extends JpaRepository<Repuesto, Long> {

    List<Repuesto> findByMypeIdAndActivoTrueOrderByNombreAsc(Long mypeId);

    Optional<Repuesto> findByIdAndMypeId(Long id, Long mypeId);
}
