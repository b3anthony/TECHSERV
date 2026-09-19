-- Consultas SQL para los KPIs y reportes del taller (panel de administración).
-- Parámetros por defecto para ejecución directa en psql (MYPE 1: Servicios Delgado, septiembre 2026):
\set mype_id 1
\set desde '\'2026-09-01 00:00:00-05\''
\set hasta '\'2026-09-30 23:59:59.999999-05\''

-- 1. Ingresos: suma de los pagos PAGADO en el periodo
SELECT COALESCE(SUM(p.monto), 0) AS ingresos
FROM pago p
JOIN orden_servicio os ON os.id = p.orden_id
WHERE os.mype_id = :mype_id
  AND p.estado = 'PAGADO'
  AND p.pagado_en BETWEEN :desde AND :hasta;

-- 2. Órdenes por estado: desglose de órdenes creadas en el periodo por cada estado (incluidos ceros)
SELECT e.estado, COUNT(os.id) AS total
FROM (VALUES
  ('PENDIENTE'), ('ASIGNADA'), ('CONFIRMADA'), ('EN_CAMINO'),
  ('EN_PROCESO'), ('COMPLETADA'), ('CALIFICADA'), ('CANCELADA')
) AS e(estado)
LEFT JOIN orden_servicio os
  ON os.estado = e.estado
 AND os.mype_id = :mype_id
 AND os.creada_en BETWEEN :desde AND :hasta
GROUP BY e.estado
ORDER BY e.estado;

-- 3. Órdenes creadas: total de órdenes registradas dentro del periodo
SELECT COUNT(os.id) AS ordenes_creadas
FROM orden_servicio os
WHERE os.mype_id = :mype_id
  AND os.creada_en BETWEEN :desde AND :hasta;

-- 4. Horas medias de atención: media de horas entre creación y paso a COMPLETADA en el periodo
SELECT CAST(AVG(EXTRACT(EPOCH FROM (h.ocurrido_en - os.creada_en)) / 3600.0) AS double precision) AS horas_medias_de_atencion
FROM orden_historial h
JOIN orden_servicio os ON os.id = h.orden_id
WHERE os.mype_id = :mype_id
  AND h.estado_nuevo = 'COMPLETADA'
  AND h.ocurrido_en BETWEEN :desde AND :hasta;

-- 5. Calificación promedio: promedio histórico de calificaciones del taller
SELECT COALESCE(AVG(c.puntaje), 0) AS calificacion_promedio
FROM calificacion c
JOIN orden_servicio os ON os.id = c.orden_id
WHERE os.mype_id = :mype_id;

-- 6. Servicios calificados: total histórico de calificaciones recibidas por el taller
SELECT COUNT(c.id) AS servicios_calificados
FROM calificacion c
JOIN orden_servicio os ON os.id = c.orden_id
WHERE os.mype_id = :mype_id;

-- 7. Ranking de técnicos: técnicos con órdenes completadas e ingreso generado en el periodo
SELECT
    t.id AS tecnico_id,
    CONCAT(u.nombres, ' ', u.apellidos) AS nombre_completo,
    COUNT(h.id) AS ordenes_completadas,
    COALESCE(SUM(p.monto), 0) AS ingreso_generado
FROM orden_servicio os
JOIN tecnico t ON t.id = os.tecnico_id
JOIN usuario u ON u.id = t.usuario_id
JOIN orden_historial h ON h.orden_id = os.id AND h.estado_nuevo = 'COMPLETADA'
LEFT JOIN pago p ON p.orden_id = os.id AND p.estado = 'PAGADO'
WHERE os.mype_id = :mype_id
  AND h.ocurrido_en BETWEEN :desde AND :hasta
GROUP BY t.id, u.nombres, u.apellidos
ORDER BY COUNT(h.id) DESC, nombre_completo ASC;
