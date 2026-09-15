package pe.techserv.mype;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface AdministradorRepository extends JpaRepository<Administrador, Long> {

    Optional<Administrador> findByUsuarioId(Long usuarioId);

    Optional<Administrador> findByUsuarioEmailIgnoreCase(String email);
}
