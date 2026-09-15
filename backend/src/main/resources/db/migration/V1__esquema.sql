-- Esquema de TechServ.
--
-- Dos criterios que se repiten en todo el archivo:
--   1. Los enumerados se guardan como texto con CHECK, no como enum de Postgres
--      ni como ordinal. Asi una consulta a mano en psql se lee sin diccionario,
--      y anadir un valor no obliga a un ALTER TYPE.
--   2. Toda tabla de negocio lleva mype_id. Es la linea del multi-inquilino: si
--      una consulta no filtra por ella, el fallo se ve aqui.

-- ───────────────────────────── identidad ─────────────────────────────

CREATE TABLE usuario (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombres        VARCHAR(80)  NOT NULL,
    apellidos      VARCHAR(80)  NOT NULL,
    email          VARCHAR(160) NOT NULL UNIQUE,
    clave_hash     VARCHAR(100) NOT NULL,
    telefono       VARCHAR(20),
    rol            VARCHAR(20)  NOT NULL,
    activo         BOOLEAN      NOT NULL DEFAULT TRUE,
    creado_en      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT usuario_rol_valido CHECK (rol IN ('CLIENTE', 'ADMIN_MYPE', 'TECNICO'))
);

CREATE INDEX idx_usuario_rol ON usuario (rol);

-- ───────────────────────────── el negocio ─────────────────────────────

CREATE TABLE mype (
    id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    razon_social       VARCHAR(160) NOT NULL,
    ruc                VARCHAR(11)  NOT NULL UNIQUE,
    descripcion        TEXT,
    telefono           VARCHAR(20),
    direccion          VARCHAR(200) NOT NULL,
    distrito           VARCHAR(60)  NOT NULL,
    latitud            NUMERIC(10, 7),
    longitud           NUMERIC(10, 7),
    activo             BOOLEAN      NOT NULL DEFAULT TRUE,
    creado_en          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT mype_ruc_once_digitos CHECK (ruc ~ '^[0-9]{11}$')
);

CREATE INDEX idx_mype_distrito ON mype (distrito);

-- Que especialidades atiende cada taller y cuanto cobra por la visita.
CREATE TABLE mype_especialidad (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    mype_id      BIGINT        NOT NULL REFERENCES mype (id) ON DELETE CASCADE,
    especialidad VARCHAR(40)   NOT NULL,
    tarifa_base  NUMERIC(10, 2) NOT NULL,
    CONSTRAINT mype_esp_valida CHECK (especialidad IN
        ('SERVICIOS_HOGAR', 'SOPORTE_INFORMATICO', 'REPARACION_ELECTRODOMESTICOS')),
    CONSTRAINT mype_esp_tarifa_positiva CHECK (tarifa_base > 0),
    CONSTRAINT mype_esp_unica UNIQUE (mype_id, especialidad)
);

-- ───────────────────────────── perfiles por rol ─────────────────────────────

CREATE TABLE cliente (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id BIGINT       NOT NULL UNIQUE REFERENCES usuario (id) ON DELETE CASCADE,
    direccion  VARCHAR(200),
    referencia VARCHAR(200),
    distrito   VARCHAR(60),
    latitud    NUMERIC(10, 7),
    longitud   NUMERIC(10, 7)
);

CREATE TABLE administrador (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id BIGINT NOT NULL UNIQUE REFERENCES usuario (id) ON DELETE CASCADE,
    mype_id    BIGINT NOT NULL REFERENCES mype (id) ON DELETE CASCADE
);

CREATE TABLE tecnico (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id BIGINT      NOT NULL UNIQUE REFERENCES usuario (id) ON DELETE CASCADE,
    mype_id    BIGINT      NOT NULL REFERENCES mype (id) ON DELETE CASCADE,
    disponible BOOLEAN     NOT NULL DEFAULT TRUE,
    creado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tecnico_mype ON tecnico (mype_id);

CREATE TABLE tecnico_especialidad (
    tecnico_id   BIGINT      NOT NULL REFERENCES tecnico (id) ON DELETE CASCADE,
    especialidad VARCHAR(40) NOT NULL,
    PRIMARY KEY (tecnico_id, especialidad),
    CONSTRAINT tecnico_esp_valida CHECK (especialidad IN
        ('SERVICIOS_HOGAR', 'SOPORTE_INFORMATICO', 'REPARACION_ELECTRODOMESTICOS'))
);

-- ───────────────────────────── inventario ─────────────────────────────

CREATE TABLE repuesto (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    mype_id     BIGINT         NOT NULL REFERENCES mype (id) ON DELETE CASCADE,
    nombre      VARCHAR(120)   NOT NULL,
    descripcion VARCHAR(250),
    precio      NUMERIC(10, 2) NOT NULL,
    stock       INTEGER        NOT NULL DEFAULT 0,
    activo      BOOLEAN        NOT NULL DEFAULT TRUE,
    CONSTRAINT repuesto_precio_positivo CHECK (precio >= 0),
    CONSTRAINT repuesto_stock_no_negativo CHECK (stock >= 0)
);

CREATE INDEX idx_repuesto_mype ON repuesto (mype_id);

-- ───────────────────────────── la orden ─────────────────────────────

CREATE TABLE orden_servicio (
    id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo             VARCHAR(16)  NOT NULL UNIQUE,
    cliente_id         BIGINT       NOT NULL REFERENCES cliente (id),
    mype_id            BIGINT       NOT NULL REFERENCES mype (id),
    tecnico_id         BIGINT       REFERENCES tecnico (id),
    especialidad       VARCHAR(40)  NOT NULL,
    descripcion_falla  TEXT         NOT NULL,
    direccion          VARCHAR(200) NOT NULL,
    referencia         VARCHAR(200),
    distrito           VARCHAR(60)  NOT NULL,
    latitud            NUMERIC(10, 7),
    longitud           NUMERIC(10, 7),
    fecha_programada   DATE         NOT NULL,
    hora_programada    TIME         NOT NULL,
    estado             VARCHAR(20)  NOT NULL DEFAULT 'PENDIENTE',
    diagnostico        TEXT,
    precio_mano_obra   NUMERIC(10, 2),
    total              NUMERIC(10, 2),
    creada_en          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    actualizada_en     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT orden_esp_valida CHECK (especialidad IN
        ('SERVICIOS_HOGAR', 'SOPORTE_INFORMATICO', 'REPARACION_ELECTRODOMESTICOS')),
    CONSTRAINT orden_estado_valido CHECK (estado IN
        ('PENDIENTE', 'ASIGNADA', 'CONFIRMADA', 'EN_CAMINO', 'EN_PROCESO',
         'COMPLETADA', 'CALIFICADA', 'CANCELADA')),
    -- Una orden con tecnico asignado no puede seguir pendiente, y una asignada
    -- no puede estar sin tecnico. La regla vive en la base, no solo en Java.
    CONSTRAINT orden_tecnico_coherente CHECK (
        (estado IN ('PENDIENTE', 'CANCELADA')) OR (tecnico_id IS NOT NULL)
    )
);

CREATE INDEX idx_orden_mype_estado ON orden_servicio (mype_id, estado);
CREATE INDEX idx_orden_cliente     ON orden_servicio (cliente_id);
CREATE INDEX idx_orden_tecnico     ON orden_servicio (tecnico_id);
CREATE INDEX idx_orden_agenda      ON orden_servicio (mype_id, fecha_programada, hora_programada);

CREATE TABLE orden_foto (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    orden_id       BIGINT       NOT NULL REFERENCES orden_servicio (id) ON DELETE CASCADE,
    nombre_archivo VARCHAR(160) NOT NULL,
    ruta           VARCHAR(300) NOT NULL,
    tipo_mime      VARCHAR(60)  NOT NULL,
    tamano_bytes   BIGINT       NOT NULL,
    subida_en      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_foto_orden ON orden_foto (orden_id);

-- Cada cambio de estado deja rastro. Es lo que convierte "el tecnico dice que
-- llego a las 3" en un dato.
CREATE TABLE orden_historial (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    orden_id         BIGINT      NOT NULL REFERENCES orden_servicio (id) ON DELETE CASCADE,
    estado_anterior  VARCHAR(20),
    estado_nuevo     VARCHAR(20) NOT NULL,
    actor            VARCHAR(20) NOT NULL,
    actor_usuario_id BIGINT      REFERENCES usuario (id),
    nota             VARCHAR(300),
    ocurrido_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT historial_actor_valido CHECK (actor IN
        ('CLIENTE', 'ADMIN_MYPE', 'TECNICO', 'SISTEMA'))
);

CREATE INDEX idx_historial_orden ON orden_historial (orden_id, ocurrido_en);

CREATE TABLE orden_repuesto (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    orden_id        BIGINT         NOT NULL REFERENCES orden_servicio (id) ON DELETE CASCADE,
    repuesto_id     BIGINT         NOT NULL REFERENCES repuesto (id),
    cantidad        INTEGER        NOT NULL,
    -- Se congela el precio del momento: si manana sube el repuesto, la orden
    -- cerrada no cambia de total.
    precio_unitario NUMERIC(10, 2) NOT NULL,
    CONSTRAINT orden_rep_cantidad_positiva CHECK (cantidad > 0)
);

CREATE INDEX idx_orden_repuesto_orden ON orden_repuesto (orden_id);

CREATE TABLE calificacion (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    orden_id    BIGINT      NOT NULL UNIQUE REFERENCES orden_servicio (id) ON DELETE CASCADE,
    puntaje     INTEGER     NOT NULL,
    comentario  VARCHAR(500),
    creada_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT calificacion_rango CHECK (puntaje BETWEEN 1 AND 5)
);

CREATE TABLE pago (
    id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    orden_id  BIGINT         NOT NULL UNIQUE REFERENCES orden_servicio (id) ON DELETE CASCADE,
    metodo    VARCHAR(20)    NOT NULL,
    monto     NUMERIC(10, 2) NOT NULL,
    estado    VARCHAR(20)    NOT NULL DEFAULT 'PENDIENTE',
    pagado_en TIMESTAMPTZ,
    CONSTRAINT pago_metodo_valido CHECK (metodo IN ('EFECTIVO', 'YAPE', 'PLIN', 'TRANSFERENCIA')),
    CONSTRAINT pago_estado_valido CHECK (estado IN ('PENDIENTE', 'PAGADO')),
    CONSTRAINT pago_monto_positivo CHECK (monto >= 0)
);

-- ──────────────── los botones firmados del correo del tecnico ────────────────

-- Un jti por boton. Al usarse se marca usado_en y el mismo enlace ya no sirve:
-- reenviar el correo no reabre la accion.
CREATE TABLE accion_token (
    jti        UUID         PRIMARY KEY,
    orden_id   BIGINT       NOT NULL REFERENCES orden_servicio (id) ON DELETE CASCADE,
    tecnico_id BIGINT       NOT NULL REFERENCES tecnico (id) ON DELETE CASCADE,
    accion     VARCHAR(20)  NOT NULL,
    expira_en  TIMESTAMPTZ  NOT NULL,
    usado_en   TIMESTAMPTZ,
    creado_en  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT accion_valida CHECK (accion IN ('CONFIRMAR', 'EN_CAMINO', 'COMPLETAR'))
);

CREATE INDEX idx_accion_token_orden ON accion_token (orden_id);
