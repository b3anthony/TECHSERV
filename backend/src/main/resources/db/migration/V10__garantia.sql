-- La duración queda congelada al cerrar cada reparación.
ALTER TABLE mype ADD COLUMN garantia_dias INTEGER NOT NULL DEFAULT 30;
ALTER TABLE mype ADD CONSTRAINT mype_garantia_dias_validos
    CHECK (garantia_dias IN (30, 60, 90));

ALTER TABLE orden_servicio ADD COLUMN tipo VARCHAR(20) NOT NULL DEFAULT 'NORMAL';
ALTER TABLE orden_servicio ADD COLUMN garantia_de_id BIGINT;
ALTER TABLE orden_servicio ADD CONSTRAINT orden_garantia_de
    FOREIGN KEY (garantia_de_id) REFERENCES orden_servicio (id);
ALTER TABLE orden_servicio ADD CONSTRAINT orden_tipo_valido CHECK (tipo IN ('NORMAL', 'GARANTIA'));
ALTER TABLE orden_servicio ADD CONSTRAINT orden_garantia_coherente
    CHECK ((tipo = 'GARANTIA') = (garantia_de_id IS NOT NULL));

-- Arbitra incluso dos solicitudes simultáneas; las cerradas permiten otra atención.
-- MySQL no tiene índices parciales: el índice es sobre una expresión que vale
-- garantia_de_id mientras la orden está abierta y NULL cuando se cierra. Un
-- UNIQUE admite tantos NULL como haga falta, así que solo choca una segunda
-- garantía ABIERTA de la misma orden.
CREATE UNIQUE INDEX idx_orden_garantia_abierta ON orden_servicio ((
    CASE WHEN estado NOT IN ('COMPLETADA', 'CALIFICADA', 'CANCELADA') THEN garantia_de_id END
));

CREATE TABLE garantia (
    id        BIGINT      NOT NULL AUTO_INCREMENT PRIMARY KEY,
    orden_id  BIGINT      NOT NULL UNIQUE,
    mype_id   BIGINT      NOT NULL,
    dias      INTEGER     NOT NULL,
    inicia_en DATETIME(6) NOT NULL,
    vence_en  DATETIME(6) NOT NULL,
    creada_en DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT garantia_orden FOREIGN KEY (orden_id) REFERENCES orden_servicio (id) ON DELETE CASCADE,
    CONSTRAINT garantia_mype  FOREIGN KEY (mype_id)  REFERENCES mype (id),
    CONSTRAINT garantia_dias_validos CHECK (dias IN (30, 60, 90))
);
CREATE INDEX idx_garantia_mype ON garantia (mype_id);

-- Las reparaciones históricas conservan su fecha de cierre, incluso si ya vencieron.
INSERT INTO garantia (orden_id, mype_id, dias, inicia_en, vence_en)
SELECT cierre.id, cierre.mype_id, 30, cierre.inicia_en, cierre.inicia_en + INTERVAL 30 DAY
  FROM (
      SELECT o.id, o.mype_id,
             COALESCE(
                 (SELECT MIN(h.ocurrido_en) FROM orden_historial h
                   WHERE h.orden_id = o.id AND h.estado_nuevo = 'COMPLETADA'),
                 o.actualizada_en) AS inicia_en
        FROM orden_servicio o
       WHERE o.estado IN ('COMPLETADA', 'CALIFICADA')
  ) AS cierre;
