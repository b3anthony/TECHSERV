package pe.techserv.mype;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pe.techserv.comun.Especialidad;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface MypeRepository extends JpaRepository<Mype, Long> {

    /**
     * El taller con su fila bloqueada (SELECT ... FOR UPDATE) hasta que acabe la
     * transaccion. Lo usan las operaciones que cuentan algo del taller y luego
     * escriben segun la cuenta —el tope de tecnicos, cerrar la cuenta—: sin el
     * bloqueo, dos peticiones a la vez leerian la misma cuenta y las dos pasarian.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT m FROM Mype m WHERE m.id = :id")
    Optional<Mype> bloquear(@Param("id") Long id);

    /**
     * El catalogo publico: los talleres que atienden una especialidad, con su
     * tarifa, su promedio y cuantos servicios llevan calificados.
     *
     * El promedio y el contador se CALCULAN aqui sobre las calificaciones
     * reales. No existe ninguna columna en mype que alguien pueda dejar
     * desactualizada, que es justo el fallo que tiene el cuaderno de papel.
     */
    @Query("""
           SELECT m.id                AS id,
                  m.razonSocial       AS razonSocial,
                  m.descripcion       AS descripcion,
                  m.direccion         AS direccion,
                  m.distrito          AS distrito,
                  me.tarifaBase       AS tarifaBase,
                  COALESCE(AVG(cal.puntaje), 0) AS promedio,
                  COUNT(cal.id)       AS servicios
           FROM Mype m
                JOIN MypeEspecialidad me ON me.mype = m
                LEFT JOIN OrdenServicio os ON os.mype = m
                LEFT JOIN Calificacion cal ON cal.orden = os
           WHERE m.activo = true
             AND me.especialidad = :especialidad
             AND (:distrito IS NULL OR m.distrito = :distrito)
           GROUP BY m.id, m.razonSocial, m.descripcion, m.direccion, m.distrito, me.tarifaBase
           ORDER BY COALESCE(AVG(cal.puntaje), 0) DESC, me.tarifaBase ASC
           """)
    List<ResumenMype> buscarPorEspecialidad(@Param("especialidad") Especialidad especialidad,
                                            @Param("distrito") String distrito);

    /** Proyeccion de solo lectura para el catalogo. */
    interface ResumenMype {
        Long getId();
        String getRazonSocial();
        String getDescripcion();
        String getDireccion();
        String getDistrito();
        BigDecimal getTarifaBase();
        Double getPromedio();
        Long getServicios();
    }
}
