package pe.techserv.orden;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

public interface OrdenServicioRepository extends JpaRepository<OrdenServicio, Long> {

    Optional<OrdenServicio> findByCodigo(String codigo);

    /**
     * La consulta que usa el panel del taller. Ojo al AND m.id = :mypeId: si se
     * cae, un administrador ve las ordenes de la competencia. Por eso NO existe
     * un findById suelto en las rutas de administracion.
     */
    Optional<OrdenServicio> findByIdAndMypeId(Long id, Long mypeId);

    Page<OrdenServicio> findByMypeIdOrderByFechaProgramadaDescHoraProgramadaDesc(
            Long mypeId, Pageable pagina);

    Page<OrdenServicio> findByMypeIdAndEstadoOrderByFechaProgramadaDescHoraProgramadaDesc(
            Long mypeId, EstadoOrden estado, Pageable pagina);

    List<OrdenServicio> findByClienteIdOrderByCreadaEnDesc(Long clienteId);

    Optional<OrdenServicio> findByIdAndClienteId(Long id, Long clienteId);

    /** Cuantas ordenes vivas tiene el taller en esa franja: es su aforo ocupado. */
    @Query("""
           SELECT COUNT(os) FROM OrdenServicio os
           WHERE os.mype.id = :mypeId
             AND os.fechaProgramada = :fecha
             AND os.horaProgramada = :hora
             AND os.estado <> pe.techserv.orden.EstadoOrden.CANCELADA
           """)
    long ocupacionEnFranja(@Param("mypeId") Long mypeId,
                           @Param("fecha") LocalDate fecha,
                           @Param("hora") LocalTime hora);

    /** Las franjas que ya no admiten a nadie mas ese dia, para pintar la agenda. */
    @Query("""
           SELECT os.horaProgramada AS hora, COUNT(os) AS ocupadas
           FROM OrdenServicio os
           WHERE os.mype.id = :mypeId
             AND os.fechaProgramada = :fecha
             AND os.estado <> pe.techserv.orden.EstadoOrden.CANCELADA
           GROUP BY os.horaProgramada
           """)
    List<FranjaOcupada> ocupacionDelDia(@Param("mypeId") Long mypeId,
                                        @Param("fecha") LocalDate fecha);

    @Query("SELECT COUNT(os) FROM OrdenServicio os WHERE os.mype.id = :mypeId AND os.estado = :estado")
    long contarPorEstado(@Param("mypeId") Long mypeId, @Param("estado") EstadoOrden estado);

    @Query("""
           SELECT COUNT(os) FROM OrdenServicio os
           WHERE os.mype.id = :mypeId
             AND os.fechaProgramada = CURRENT_DATE
             AND os.estado IN (pe.techserv.orden.EstadoOrden.COMPLETADA,
                               pe.techserv.orden.EstadoOrden.CALIFICADA)
           """)
    long completadasHoy(@Param("mypeId") Long mypeId);

    /**
     * El siguiente correlativo, sacado de una secuencia de Postgres.
     *
     * No es un "max(codigo) + 1": dos clientes reservando a la vez leerian el
     * mismo maximo y uno se estrellaria contra el UNIQUE. nextval() es atomico.
     */
    @Query(value = "SELECT nextval('orden_codigo_seq')", nativeQuery = true)
    long siguienteCorrelativo();

    interface FranjaOcupada {
        LocalTime getHora();
        Long getOcupadas();
    }
}
