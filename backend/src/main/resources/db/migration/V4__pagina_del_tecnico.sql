-- La pagina del tecnico: un enlace por orden en vez de un boton por accion.
--
-- El correo lleva un enlace a /visita/<token>. Desde esa pagina el tecnico
-- confirma, sale, empieza, cierra, cobra y sube fotos del trabajo. El token es
-- aleatorio (256 bits) y en la base solo se guarda su SHA-256: quien lea esta
-- tabla no puede reconstruir ningun enlace.
--
-- El enlace deja de valer solo, sin tocar esta tabla, si la orden se reasigna a
-- otro tecnico o si el tecnico se da de baja: el servicio lo comprueba en cada
-- peticion contra orden_servicio.tecnico_id y usuario.activo.

CREATE TABLE enlace_tecnico (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    hash_token VARCHAR(64) NOT NULL UNIQUE,
    orden_id   BIGINT      NOT NULL REFERENCES orden_servicio (id) ON DELETE CASCADE,
    tecnico_id BIGINT      NOT NULL REFERENCES tecnico (id) ON DELETE CASCADE,
    expira_en  TIMESTAMPTZ NOT NULL,
    creado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_enlace_tecnico_orden ON enlace_tecnico (orden_id);

-- Las fotos de la averia las sube el cliente; las del trabajo, el tecnico.
ALTER TABLE orden_foto
    ADD COLUMN origen VARCHAR(20) NOT NULL DEFAULT 'CLIENTE',
    ADD CONSTRAINT foto_origen_valido CHECK (origen IN ('CLIENTE', 'TECNICO'));

-- Quien tuvo el dinero en la mano. NULL = lo registro el taller desde el panel.
ALTER TABLE pago
    ADD COLUMN cobrado_por_tecnico_id BIGINT REFERENCES tecnico (id) ON DELETE SET NULL;
