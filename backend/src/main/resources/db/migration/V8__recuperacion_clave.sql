-- Enlaces de recuperación: solo su SHA-256, nunca el token del correo.
CREATE TABLE recuperacion_clave (
    id         BIGINT      NOT NULL AUTO_INCREMENT PRIMARY KEY,
    usuario_id BIGINT      NOT NULL,
    hash_token VARCHAR(64) NOT NULL UNIQUE,
    expira_en  DATETIME(6) NOT NULL,
    usado_en   DATETIME(6),
    creado_en  DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT recuperacion_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id) ON DELETE CASCADE
);

CREATE INDEX idx_recuperacion_clave_usuario
    ON recuperacion_clave (usuario_id, creado_en DESC);

-- Solo la recuperación revoca las sesiones anteriores; los cambios desde
-- Mi cuenta o Ajustes conservan la sesión de quien los hace.
ALTER TABLE usuario ADD COLUMN clave_cambiada_en DATETIME(6);
