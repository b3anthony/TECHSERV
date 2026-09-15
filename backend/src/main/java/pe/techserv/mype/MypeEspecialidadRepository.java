package pe.techserv.mype;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.techserv.comun.Especialidad;
import java.util.List;
import java.util.Optional;

public interface MypeEspecialidadRepository extends JpaRepository<MypeEspecialidad, Long> {

    List<MypeEspecialidad> findByMypeId(Long mypeId);

    Optional<MypeEspecialidad> findByMypeIdAndEspecialidad(Long mypeId, Especialidad especialidad);
}
