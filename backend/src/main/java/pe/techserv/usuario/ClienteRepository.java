package pe.techserv.usuario;

import org.springframework.data.jpa.repository.JpaRepository;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

public interface ClienteRepository extends JpaRepository<Cliente, Long> {

    Optional<Cliente> findByUsuarioId(Long usuarioId);

    Optional<Cliente> findByUsuarioEmailIgnoreCase(String email);

    /** Las desactivadas antes de {@code limite} que aún no se eliminaron. */
    List<Cliente> findByDesactivadaEnBeforeAndEliminadaEnIsNull(OffsetDateTime limite);
}
