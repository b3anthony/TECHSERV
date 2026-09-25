package pe.techserv.catalogo;

import pe.techserv.pago.MetodoPago;

import java.math.BigDecimal;
import java.util.List;

/**
 * Un taller como lo ve quien va a contratarlo.
 *
 * {@code promedio} y {@code servicios} vienen de un AVG y un COUNT sobre las
 * calificaciones reales. No hay ninguna columna guardada que alguien pueda dejar
 * desactualizada: es justo el problema del cuaderno de papel que esto viene a
 * resolver.
 *
 * {@code metodosPago} son los que acepta el taller: entre ellos elige el
 * cliente al reservar.
 */
public record MypeCatalogo(Long id,
                           String razonSocial,
                           String descripcion,
                           String direccion,
                           String distrito,
                           BigDecimal tarifaBase,
                           Double promedio,
                           long servicios,
                           boolean atiendeHoy,
                           List<MetodoPago> metodosPago) {
}
