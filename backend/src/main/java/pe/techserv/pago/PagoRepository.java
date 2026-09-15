package pe.techserv.pago;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Optional;

public interface PagoRepository extends JpaRepository<Pago, Long> {

    Optional<Pago> findByOrdenId(Long ordenId);

    @Query("""
           SELECT COALESCE(SUM(p.monto), 0) FROM Pago p
           WHERE p.orden.mype.id = :mypeId
             AND p.estado = pe.techserv.pago.EstadoPago.PAGADO
             AND p.pagadoEn BETWEEN :desde AND :hasta
           """)
    BigDecimal ingresosEntre(@Param("mypeId") Long mypeId,
                             @Param("desde") OffsetDateTime desde,
                             @Param("hasta") OffsetDateTime hasta);
}
