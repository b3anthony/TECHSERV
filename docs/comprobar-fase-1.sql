-- Comprobacion de la Fase 1. No mira que "haya filas": mira que el historial de
-- cada orden sea una cadena sin huecos y que termine donde dice el estado actual.
--
--   docker exec -i techserv-db psql -U techserv -d techserv -f - < docs/comprobar-fase-1.sql

\echo '── 1. Las doce ordenes de la demo, con su estado y sus pasos ──'
SELECT os.codigo,
       os.estado,
       count(h.id)                      AS pasos,
       max(h.estado_nuevo::text)        FILTER (WHERE h.ocurrido_en =
              (SELECT max(h2.ocurrido_en) FROM orden_historial h2 WHERE h2.orden_id = os.id))
                                        AS ultimo_paso
FROM orden_servicio os
LEFT JOIN orden_historial h ON h.orden_id = os.id
WHERE os.codigo LIKE 'ORD-01%'
GROUP BY os.id, os.codigo, os.estado
ORDER BY os.codigo DESC;

\echo ''
\echo '── 2. Ordenes cuyo ultimo paso NO coincide con su estado actual (debe salir vacio) ──'
WITH ultimo AS (
    SELECT DISTINCT ON (h.orden_id) h.orden_id, h.estado_nuevo
    FROM orden_historial h ORDER BY h.orden_id, h.ocurrido_en DESC, h.id DESC)
SELECT os.codigo, os.estado AS estado_orden, u.estado_nuevo AS ultimo_historial
FROM orden_servicio os JOIN ultimo u ON u.orden_id = os.id
WHERE os.estado::text <> u.estado_nuevo::text;

\echo ''
\echo '── 3. Saltos imposibles en el historial (debe salir vacio) ──'
WITH cadena AS (
    SELECT h.orden_id, h.estado_anterior, h.estado_nuevo,
           lag(h.estado_nuevo) OVER (PARTITION BY h.orden_id ORDER BY h.ocurrido_en, h.id) AS previo_real
    FROM orden_historial h)
SELECT os.codigo, c.previo_real, c.estado_anterior, c.estado_nuevo
FROM cadena c JOIN orden_servicio os ON os.id = c.orden_id
WHERE os.codigo LIKE 'ORD-01%'
  AND c.previo_real IS DISTINCT FROM c.estado_anterior;

\echo ''
\echo '── 4. Ordenes asignadas o mas alla que se quedaron sin tecnico (debe salir vacio) ──'
SELECT codigo, estado FROM orden_servicio
WHERE tecnico_id IS NULL AND estado NOT IN ('PENDIENTE', 'CANCELADA');

\echo ''
\echo '── 5. Totales que no cuadran con mano de obra + repuestos (debe salir vacio) ──'
SELECT os.codigo, os.precio_mano_obra, os.total,
       os.precio_mano_obra + COALESCE(sum(orp.cantidad * orp.precio_unitario), 0) AS deberia_ser
FROM orden_servicio os
LEFT JOIN orden_repuesto orp ON orp.orden_id = os.id
WHERE os.total IS NOT NULL AND os.codigo LIKE 'ORD-01%'
GROUP BY os.id, os.codigo, os.precio_mano_obra, os.total
HAVING os.total <> os.precio_mano_obra + COALESCE(sum(orp.cantidad * orp.precio_unitario), 0);

\echo ''
\echo '── 6. Catalogo publico: promedio y servicios, calculados ──'
SELECT m.razon_social, count(c.id) AS servicios, round(avg(c.puntaje), 2) AS promedio
FROM mype m
JOIN orden_servicio os ON os.mype_id = m.id
JOIN calificacion c ON c.orden_id = os.id
GROUP BY m.razon_social ORDER BY 2 DESC;
