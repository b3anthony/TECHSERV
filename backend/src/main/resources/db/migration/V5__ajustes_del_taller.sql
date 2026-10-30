-- Ajustes del taller: una sola especialidad, horario de atencion y metodos de
-- pago aceptados.

-- ───────────────────── una especialidad por taller ─────────────────────
--
-- Un taller atiende UNA especialidad. Los tres de la semilla atendian varias;
-- se queda la que cuadra con su descripcion y con el guion de la demo, y asi
-- cada especialidad sigue teniendo al menos un taller en el catalogo:
--   Servicios Delgado         -> Reparacion de Electrodomesticos
--   TecnoHogar Trujillo       -> Soporte Tecnico e Informatico
--   Reparaciones La Libertad  -> Servicios del Hogar

DELETE me
  FROM mype_especialidad me
  JOIN mype m ON m.id = me.mype_id
 WHERE ((m.ruc = '20601234567' AND me.especialidad <> 'REPARACION_ELECTRODOMESTICOS')
     OR (m.ruc = '20609876543' AND me.especialidad <> 'SOPORTE_INFORMATICO')
     OR (m.ruc = '20605554443' AND me.especialidad <> 'SERVICIOS_HOGAR'));

-- Cualquier otro taller con varias: se queda la que mas ordenes tiene.
-- La subconsulta va envuelta en una tabla derivada porque MySQL no deja leer en
-- un DELETE la misma tabla que se borra; la ventana obliga a materializarla.
DELETE FROM mype_especialidad
 WHERE id NOT IN (
       SELECT id FROM (
           SELECT me.id,
                  ROW_NUMBER() OVER (
                      PARTITION BY me.mype_id
                      ORDER BY (SELECT count(*) FROM orden_servicio os
                                 WHERE os.mype_id = me.mype_id
                                   AND os.especialidad = me.especialidad) DESC,
                               me.id) AS puesto
             FROM mype_especialidad me
       ) AS ranking
        WHERE puesto = 1);

-- Primero el UNIQUE nuevo y despues fuera el viejo: la clave foranea de mype_id
-- necesita siempre un indice que empiece por esa columna.
ALTER TABLE mype_especialidad ADD CONSTRAINT mype_esp_una_por_taller UNIQUE (mype_id);
ALTER TABLE mype_especialidad DROP INDEX mype_esp_unica;

-- Los tecnicos atienden lo que atiende su taller. Las ordenes historicas de
-- otras especialidades conservan la suya en orden_servicio.especialidad.
DELETE FROM tecnico_especialidad;
INSERT INTO tecnico_especialidad (tecnico_id, especialidad)
SELECT t.id, me.especialidad
  FROM tecnico t
  JOIN mype_especialidad me ON me.mype_id = t.mype_id;

-- ───────────────────────── horario de atencion ─────────────────────────
--
-- Un tramo por dia (1 = lunes ... 7 = domingo, como ISO-8601 y DayOfWeek). Un
-- dia sin fila es un dia cerrado. Las franjas de la agenda que caen fuera del
-- tramo no se ofrecen.

CREATE TABLE mype_horario (
    mype_id    BIGINT  NOT NULL,
    dia_semana INTEGER NOT NULL,
    abre       TIME    NOT NULL,
    cierra     TIME    NOT NULL,
    PRIMARY KEY (mype_id, dia_semana),
    CONSTRAINT horario_mype FOREIGN KEY (mype_id) REFERENCES mype (id) ON DELETE CASCADE,
    CONSTRAINT horario_dia_valido CHECK (dia_semana BETWEEN 1 AND 7),
    CONSTRAINT horario_abre_antes_de_cerrar CHECK (abre < cierra)
);

-- Los talleres que ya existen reciben el horario que la plataforma les
-- aplicaba sin decirlo: todos los dias, de la primera a la ultima franja. Asi
-- la agenda no cambia hasta que cada taller ajuste el suyo.
INSERT INTO mype_horario (mype_id, dia_semana, abre, cierra)
SELECT m.id, d.dia, TIME '08:00:00', TIME '17:00:00'
  FROM mype m
 CROSS JOIN (VALUES ROW(1), ROW(2), ROW(3), ROW(4), ROW(5), ROW(6), ROW(7)) AS d (dia);

-- ─────────────────────── metodos de pago aceptados ───────────────────────

CREATE TABLE mype_metodo_pago (
    mype_id BIGINT      NOT NULL,
    metodo  VARCHAR(20) NOT NULL,
    PRIMARY KEY (mype_id, metodo),
    CONSTRAINT metodo_pago_mype FOREIGN KEY (mype_id) REFERENCES mype (id) ON DELETE CASCADE,
    CONSTRAINT mype_metodo_valido CHECK (metodo IN ('EFECTIVO', 'YAPE', 'PLIN', 'TRANSFERENCIA'))
);

-- Hasta hoy todo taller aceptaba los cuatro.
INSERT INTO mype_metodo_pago (mype_id, metodo)
SELECT m.id, metodo
  FROM mype m
 CROSS JOIN (VALUES ROW('EFECTIVO'), ROW('YAPE'), ROW('PLIN'), ROW('TRANSFERENCIA')) AS v (metodo);
