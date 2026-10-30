package pe.techserv.mype;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MypeCobroRepository extends JpaRepository<MypeCobro, Long> {
    /** La PK es el taller: la consulta no recibe ningún identificador ajeno a él. */
    Optional<MypeCobro> findByMypeId(Long mypeId);
}
