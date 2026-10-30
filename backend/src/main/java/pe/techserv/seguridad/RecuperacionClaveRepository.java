package pe.techserv.seguridad;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.OffsetDateTime;
import java.util.Optional;

public interface RecuperacionClaveRepository extends JpaRepository<RecuperacionClave, Long> {

    Optional<RecuperacionClave> findByHashToken(String hashToken);

    Optional<RecuperacionClave> findFirstByUsuarioIdOrderByCreadoEnDesc(Long usuarioId);

    /** La base decide quién consume el enlace, incluida su caducidad. */
    @Modifying
    @Query("""
           UPDATE RecuperacionClave r SET r.usadoEn = :ahora
           WHERE r.hashToken = :hashToken AND r.usadoEn IS NULL AND r.expiraEn > :ahora
           """)
    int marcarUsado(@Param("hashToken") String hashToken, @Param("ahora") OffsetDateTime ahora);

    @Modifying
    @Query("""
           UPDATE RecuperacionClave r SET r.usadoEn = :ahora
           WHERE r.usuario.id = :usuarioId AND r.usadoEn IS NULL
           """)
    int invalidarDelUsuario(@Param("usuarioId") Long usuarioId, @Param("ahora") OffsetDateTime ahora);
}
