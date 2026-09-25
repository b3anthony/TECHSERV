package pe.techserv.mype;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface AdministradorRepository extends JpaRepository<Administrador, Long> {

    Optional<Administrador> findByUsuarioId(Long usuarioId);

    Optional<Administrador> findByUsuarioEmailIgnoreCase(String email);

    List<Administrador> findByMypeId(Long mypeId);
}
