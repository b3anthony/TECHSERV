-- El diagnostico de la IA de una orden: lo que Gemini cree que falla, a partir
-- de las fotos y la descripcion del cliente. Solo lo ve el taller.
--
-- Una fila por orden. Rehacerlo pisa la fila, no crea otra.

CREATE TABLE orden_diagnostico_ia (
    id               BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
    orden_id         BIGINT       NOT NULL UNIQUE,
    estado           VARCHAR(20)  NOT NULL,
    -- El lanzamiento vigente. Una respuesta que llega con otro intento es de
    -- una peticion vieja y no se guarda: asi una lenta no pisa a una nueva.
    intento          VARCHAR(36),
    modelo           VARCHAR(80),
    -- La respuesta ya validada, en JSON. Los repuestos van solo por id: nombre,
    -- precio y stock se leen del inventario al mostrarla.
    resultado        TEXT,
    error            VARCHAR(300),
    fotos_analizadas INTEGER      NOT NULL DEFAULT 0,
    fotos_omitidas   INTEGER      NOT NULL DEFAULT 0,
    solicitado_en    DATETIME(6),
    generado_en      DATETIME(6),
    CONSTRAINT diagnostico_orden FOREIGN KEY (orden_id) REFERENCES orden_servicio (id) ON DELETE CASCADE,
    CONSTRAINT diagnostico_estado_valido CHECK (estado IN ('PENDIENTE', 'LISTO', 'ERROR'))
);
