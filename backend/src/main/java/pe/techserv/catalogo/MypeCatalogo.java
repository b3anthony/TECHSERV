package pe.techserv.catalogo;

import java.math.BigDecimal;

/**
 * Un taller como lo ve quien va a contratarlo.
 *
 * {@code promedio} y {@code servicios} vienen de un AVG y un COUNT sobre las
 * calificaciones reales. No hay ninguna columna guardada que alguien pueda dejar
 * desactualizada: es justo el problema del cuaderno de papel que esto viene a
 * resolver.
 */
public record MypeCatalogo(Long id,
                           String razonSocial,
                           String descripcion,
                           String direccion,
                           String distrito,
                           BigDecimal tarifaBase,
                           Double promedio,
                           long servicios,
                           boolean atiendeHoy) {
}
