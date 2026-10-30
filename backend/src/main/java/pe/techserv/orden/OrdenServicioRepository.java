package pe.techserv.orden;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import pe.techserv.comun.Especialidad;

public interface OrdenServicioRepository extends JpaRepository<OrdenServicio, Long>,
                                                 JpaSpecificationExecutor<OrdenServicio> {

    Optional<OrdenServicio> findByCodigo(String codigo);

    /**
     * La consulta que usa el panel del taller. Ojo al AND m.id = :mypeId: si se
     * cae, un administrador ve las ordenes de la competencia. Por eso NO existe
     * un findById suelto en las rutas de administracion.
     */
    Optional<OrdenServicio> findByIdAndMypeId(Long id, Long mypeId);

    /**
     * La misma orden, pero con la fila bloqueada (SELECT ... FOR UPDATE) hasta
     * que termine la transaccion. La usan los pasos que cambian estado, dinero
     * o stock: dos toques seguidos del tecnico, o el tecnico y el taller a la
     * vez, se ponen en fila en vez de cerrar dos veces la misma orden.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT os FROM OrdenServicio os WHERE os.id = :id AND os.mype.id = :mypeId")
    Optional<OrdenServicio> bloquear(@Param("id") Long id, @Param("mypeId") Long mypeId);

    List<OrdenServicio> findByClienteIdOrderByCreadaEnDesc(Long clienteId);

    Optional<OrdenServicio> findByIdAndClienteId(Long id, Long clienteId);

    @Query("""
           SELECT os FROM OrdenServicio os
           WHERE os.garantiaDe.id = :originalId AND os.mype.id = :mypeId
             AND os.cliente.id = :clienteId AND os.estado NOT IN :cerradas
           """)
    Optional<OrdenServicio> atencionGarantiaAbierta(@Param("originalId") Long originalId,
                                                  @Param("mypeId") Long mypeId,
                                                  @Param("clienteId") Long clienteId,
                                                  @Param("cerradas") Collection<EstadoOrden> cerradas);

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
     * El siguiente correlativo, sacado de la tabla orden_codigo_seq (V3), que en
     * MySQL hace de secuencia.
     *
     * No es un "max(codigo) + 1": dos clientes reservando a la vez leerian el
     * mismo maximo y uno se estrellaria contra el UNIQUE. AUTO_INCREMENT es
     * atomico, y LAST_INSERT_ID() es de la conexion: otra reserva en paralelo no
     * lo pisa. Las dos consultas van en la misma transaccion para que usen la
     * misma conexion.
     */
    @Transactional
    default long siguienteCorrelativo() {
        reservarCorrelativo();
        return ultimoCorrelativo();
    }

    @Modifying
    @Query(value = "INSERT INTO orden_codigo_seq () VALUES ()", nativeQuery = true)
    void reservarCorrelativo();

    @Query(value = "SELECT LAST_INSERT_ID()", nativeQuery = true)
    long ultimoCorrelativo();

    /**
     * Solo los ids. Quien los pide los recorre con {@link #bloquear}: asi cada
     * orden se lee fresca y bloqueada, no la copia que ya estuviera en memoria.
     */
    @Query("SELECT os.id FROM OrdenServicio os WHERE os.mype.id = :mypeId AND os.estado IN :estados ORDER BY os.id")
    List<Long> idsPorEstado(@Param("mypeId") Long mypeId, @Param("estados") Collection<EstadoOrden> estados);

    /** Como {@link #idsPorEstado}, pero las de un cliente: las recorre {@link #bloquearDelCliente}. */
    @Query("SELECT os.id FROM OrdenServicio os WHERE os.cliente.id = :clienteId AND os.estado IN :estados ORDER BY os.id")
    List<Long> idsDelCliente(@Param("clienteId") Long clienteId, @Param("estados") Collection<EstadoOrden> estados);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT os FROM OrdenServicio os WHERE os.id = :id AND os.cliente.id = :clienteId")
    Optional<OrdenServicio> bloquearDelCliente(@Param("id") Long id, @Param("clienteId") Long clienteId);

    boolean existsByMypeIdAndTecnicoIdAndEstadoIn(Long mypeId, Long tecnicoId, Collection<EstadoOrden> estados);

    boolean existsByMypeIdAndEspecialidadAndEstadoIn(Long mypeId, Especialidad especialidad, Collection<EstadoOrden> estados);

    interface FranjaOcupada {
        LocalTime getHora();
        Long getOcupadas();
    }

    @Query("""
           SELECT os.estado AS estado, COUNT(os) AS total
           FROM OrdenServicio os
           WHERE os.mype.id = :mypeId
             AND os.creadaEn BETWEEN :desde AND :hasta
           GROUP BY os.estado
           """)
    List<ConteoEstado> contarPorEstadoEnPeriodo(@Param("mypeId") Long mypeId,
                                               @Param("desde") OffsetDateTime desde,
                                               @Param("hasta") OffsetDateTime hasta);

    @Query("""
           SELECT COUNT(os) FROM OrdenServicio os
           WHERE os.mype.id = :mypeId
             AND os.creadaEn BETWEEN :desde AND :hasta
           """)
    long ordenesCreadasEntre(@Param("mypeId") Long mypeId,
                             @Param("desde") OffsetDateTime desde,
                             @Param("hasta") OffsetDateTime hasta);

    interface ConteoEstado {
        EstadoOrden getEstado();
        Long getTotal();
    }
}
