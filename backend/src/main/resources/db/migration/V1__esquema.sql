-- Esquema de TechServ (MySQL 8.4).
--
-- Dos criterios que se repiten en todo el archivo:
--   1. Los enumerados se guardan como texto con CHECK, no como ENUM de MySQL
--      ni como ordinal. Asi una consulta a mano se lee sin diccionario, y
--      anadir un valor no obliga a un ALTER TABLE ... MODIFY.
--   2. Toda tabla de negocio lleva mype_id. Es la linea del multi-inquilino: si
--      una consulta no filtra por ella, el fallo se ve aqui.
--
-- Y tres de MySQL que conviene no olvidar al tocarlo:
--   - Las claves foraneas van como FOREIGN KEY de tabla. Un REFERENCES escrito
--     dentro de la columna MySQL lo acepta y lo IGNORA: ni comprueba ni borra
--     en cascada.
--   - Las fechas con hora son DATETIME(6) en hora de Lima: MySQL no tiene un
--     tipo con zona. La conexion fija esa zona (application.yml).
--   - Cotejamiento utf8mb4_0900_as_cs: distingue mayusculas y tildes, como
--     PostgreSQL. Las busquedas que no deben distinguirlas lo dicen en la
--     consulta, no lo heredan de la base.

ALTER DATABASE CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_cs;

-- ───────────────────────────── identidad ─────────────────────────────

CREATE TABLE usuario (
    id             BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
    nombres        VARCHAR(80)  NOT NULL,
    apellidos      VARCHAR(80)  NOT NULL,
    email          VARCHAR(160) NOT NULL UNIQUE,
    clave_hash     VARCHAR(100) NOT NULL,
    telefono       VARCHAR(20),
    rol            VARCHAR(20)  NOT NULL,
    activo         BOOLEAN      NOT NULL DEFAULT TRUE,
    creado_en      DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT usuario_rol_valido CHECK (rol IN ('CLIENTE', 'ADMIN_MYPE', 'TECNICO'))
);

CREATE INDEX idx_usuario_rol ON usuario (rol);

-- ───────────────────────────── el negocio ─────────────────────────────

CREATE TABLE mype (
    id                 BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
    razon_social       VARCHAR(160) NOT NULL,
    ruc                VARCHAR(11)  NOT NULL UNIQUE,
    descripcion        TEXT,
    telefono           VARCHAR(20),
    direccion          VARCHAR(200) NOT NULL,
    distrito           VARCHAR(60)  NOT NULL,
    latitud            DECIMAL(10, 7),
    longitud           DECIMAL(10, 7),
    activo             BOOLEAN      NOT NULL DEFAULT TRUE,
    creado_en          DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT mype_ruc_once_digitos CHECK (REGEXP_LIKE(ruc, '^[0-9]{11}$'))
);

CREATE INDEX idx_mype_distrito ON mype (distrito);

-- Que especialidades atiende cada taller y cuanto cobra por la visita.
CREATE TABLE mype_especialidad (
    id           BIGINT         NOT NULL AUTO_INCREMENT PRIMARY KEY,
    mype_id      BIGINT         NOT NULL,
    especialidad VARCHAR(40)    NOT NULL,
    tarifa_base  DECIMAL(10, 2) NOT NULL,
    CONSTRAINT mype_esp_mype FOREIGN KEY (mype_id) REFERENCES mype (id) ON DELETE CASCADE,
    CONSTRAINT mype_esp_valida CHECK (especialidad IN
        ('SERVICIOS_HOGAR', 'SOPORTE_INFORMATICO', 'REPARACION_ELECTRODOMESTICOS')),
    CONSTRAINT mype_esp_tarifa_positiva CHECK (tarifa_base > 0),
    CONSTRAINT mype_esp_unica UNIQUE (mype_id, especialidad)
);

-- ───────────────────────────── perfiles por rol ─────────────────────────────

CREATE TABLE cliente (
    id         BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
    usuario_id BIGINT       NOT NULL UNIQUE,
    direccion  VARCHAR(200),
    referencia VARCHAR(200),
    distrito   VARCHAR(60),
    latitud    DECIMAL(10, 7),
    longitud   DECIMAL(10, 7),
    CONSTRAINT cliente_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id) ON DELETE CASCADE
);

CREATE TABLE administrador (
    id         BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    usuario_id BIGINT NOT NULL UNIQUE,
    mype_id    BIGINT NOT NULL,
    CONSTRAINT administrador_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id) ON DELETE CASCADE,
    CONSTRAINT administrador_mype    FOREIGN KEY (mype_id)    REFERENCES mype (id)    ON DELETE CASCADE
);

CREATE TABLE tecnico (
    id         BIGINT      NOT NULL AUTO_INCREMENT PRIMARY KEY,
    usuario_id BIGINT      NOT NULL UNIQUE,
    mype_id    BIGINT      NOT NULL,
    disponible BOOLEAN     NOT NULL DEFAULT TRUE,
    creado_en  DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT tecnico_usuario FOREIGN KEY (usuario_id) REFERENCES usuario (id) ON DELETE CASCADE,
    CONSTRAINT tecnico_mype    FOREIGN KEY (mype_id)    REFERENCES mype (id)    ON DELETE CASCADE
);

CREATE INDEX idx_tecnico_mype ON tecnico (mype_id);

CREATE TABLE tecnico_especialidad (
    tecnico_id   BIGINT      NOT NULL,
    especialidad VARCHAR(40) NOT NULL,
    PRIMARY KEY (tecnico_id, especialidad),
    CONSTRAINT tecnico_esp_tecnico FOREIGN KEY (tecnico_id) REFERENCES tecnico (id) ON DELETE CASCADE,
    CONSTRAINT tecnico_esp_valida CHECK (especialidad IN
        ('SERVICIOS_HOGAR', 'SOPORTE_INFORMATICO', 'REPARACION_ELECTRODOMESTICOS'))
);

-- ───────────────────────────── inventario ─────────────────────────────

CREATE TABLE repuesto (
    id          BIGINT         NOT NULL AUTO_INCREMENT PRIMARY KEY,
    mype_id     BIGINT         NOT NULL,
    nombre      VARCHAR(120)   NOT NULL,
    descripcion VARCHAR(250),
    precio      DECIMAL(10, 2) NOT NULL,
    stock       INTEGER        NOT NULL DEFAULT 0,
    activo      BOOLEAN        NOT NULL DEFAULT TRUE,
    CONSTRAINT repuesto_mype FOREIGN KEY (mype_id) REFERENCES mype (id) ON DELETE CASCADE,
    CONSTRAINT repuesto_precio_positivo CHECK (precio >= 0),
    CONSTRAINT repuesto_stock_no_negativo CHECK (stock >= 0)
);

CREATE INDEX idx_repuesto_mype ON repuesto (mype_id);

-- ───────────────────────────── la orden ─────────────────────────────

CREATE TABLE orden_servicio (
    id                 BIGINT         NOT NULL AUTO_INCREMENT PRIMARY KEY,
    codigo             VARCHAR(16)    NOT NULL UNIQUE,
    cliente_id         BIGINT         NOT NULL,
    mype_id            BIGINT         NOT NULL,
    tecnico_id         BIGINT,
    especialidad       VARCHAR(40)    NOT NULL,
    descripcion_falla  TEXT           NOT NULL,
    direccion          VARCHAR(200)   NOT NULL,
    referencia         VARCHAR(200),
    distrito           VARCHAR(60)    NOT NULL,
    latitud            DECIMAL(10, 7),
    longitud           DECIMAL(10, 7),
    fecha_programada   DATE           NOT NULL,
    hora_programada    TIME           NOT NULL,
    estado             VARCHAR(20)    NOT NULL DEFAULT 'PENDIENTE',
    diagnostico        TEXT,
    precio_mano_obra   DECIMAL(10, 2),
    total              DECIMAL(10, 2),
    creada_en          DATETIME(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    actualizada_en     DATETIME(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT orden_cliente FOREIGN KEY (cliente_id) REFERENCES cliente (id),
    CONSTRAINT orden_mype    FOREIGN KEY (mype_id)    REFERENCES mype (id),
    CONSTRAINT orden_tecnico FOREIGN KEY (tecnico_id) REFERENCES tecnico (id),
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
    id             BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
    orden_id       BIGINT       NOT NULL,
    nombre_archivo VARCHAR(160) NOT NULL,
    ruta           VARCHAR(300) NOT NULL,
    tipo_mime      VARCHAR(60)  NOT NULL,
    tamano_bytes   BIGINT       NOT NULL,
    subida_en      DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT foto_orden FOREIGN KEY (orden_id) REFERENCES orden_servicio (id) ON DELETE CASCADE
);

CREATE INDEX idx_foto_orden ON orden_foto (orden_id);

-- Cada cambio de estado deja rastro. Es lo que convierte "el tecnico dice que
-- llego a las 3" en un dato.
CREATE TABLE orden_historial (
    id               BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
    orden_id         BIGINT       NOT NULL,
    estado_anterior  VARCHAR(20),
    estado_nuevo     VARCHAR(20)  NOT NULL,
    actor            VARCHAR(20)  NOT NULL,
    actor_usuario_id BIGINT,
    nota             VARCHAR(300),
    ocurrido_en      DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT historial_orden   FOREIGN KEY (orden_id)         REFERENCES orden_servicio (id) ON DELETE CASCADE,
    CONSTRAINT historial_usuario FOREIGN KEY (actor_usuario_id) REFERENCES usuario (id),
    CONSTRAINT historial_actor_valido CHECK (actor IN
        ('CLIENTE', 'ADMIN_MYPE', 'TECNICO', 'SISTEMA'))
);

CREATE INDEX idx_historial_orden ON orden_historial (orden_id, ocurrido_en);

CREATE TABLE orden_repuesto (
    id              BIGINT         NOT NULL AUTO_INCREMENT PRIMARY KEY,
    orden_id        BIGINT         NOT NULL,
    repuesto_id     BIGINT         NOT NULL,
    cantidad        INTEGER        NOT NULL,
    -- Se congela el precio del momento: si manana sube el repuesto, la orden
    -- cerrada no cambia de total.
    precio_unitario DECIMAL(10, 2) NOT NULL,
    CONSTRAINT orden_rep_orden    FOREIGN KEY (orden_id)    REFERENCES orden_servicio (id) ON DELETE CASCADE,
    CONSTRAINT orden_rep_repuesto FOREIGN KEY (repuesto_id) REFERENCES repuesto (id),
    CONSTRAINT orden_rep_cantidad_positiva CHECK (cantidad > 0)
);

CREATE INDEX idx_orden_repuesto_orden ON orden_repuesto (orden_id);

CREATE TABLE calificacion (
    id          BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
    orden_id    BIGINT       NOT NULL UNIQUE,
    puntaje     INTEGER      NOT NULL,
    comentario  VARCHAR(500),
    creada_en   DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT calificacion_orden FOREIGN KEY (orden_id) REFERENCES orden_servicio (id) ON DELETE CASCADE,
    CONSTRAINT calificacion_rango CHECK (puntaje BETWEEN 1 AND 5)
);

CREATE TABLE pago (
    id        BIGINT         NOT NULL AUTO_INCREMENT PRIMARY KEY,
    orden_id  BIGINT         NOT NULL UNIQUE,
    metodo    VARCHAR(20)    NOT NULL,
    monto     DECIMAL(10, 2) NOT NULL,
    estado    VARCHAR(20)    NOT NULL DEFAULT 'PENDIENTE',
    pagado_en DATETIME(6),
    CONSTRAINT pago_orden FOREIGN KEY (orden_id) REFERENCES orden_servicio (id) ON DELETE CASCADE,
    CONSTRAINT pago_metodo_valido CHECK (metodo IN ('EFECTIVO', 'YAPE', 'PLIN', 'TRANSFERENCIA')),
    CONSTRAINT pago_estado_valido CHECK (estado IN ('PENDIENTE', 'PAGADO')),
    CONSTRAINT pago_monto_positivo CHECK (monto >= 0)
);

-- ──────────────── los botones firmados del correo del tecnico ────────────────

-- Un jti por boton. Al usarse se marca usado_en y el mismo enlace ya no sirve:
-- reenviar el correo no reabre la accion. El UUID va en sus 16 bytes, que es
-- como Hibernate lo guarda en MySQL.
CREATE TABLE accion_token (
    jti        BINARY(16)   NOT NULL PRIMARY KEY,
    orden_id   BIGINT       NOT NULL,
    tecnico_id BIGINT       NOT NULL,
    accion     VARCHAR(20)  NOT NULL,
    expira_en  DATETIME(6)  NOT NULL,
    usado_en   DATETIME(6),
    creado_en  DATETIME(6)  NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT accion_token_orden   FOREIGN KEY (orden_id)   REFERENCES orden_servicio (id) ON DELETE CASCADE,
    CONSTRAINT accion_token_tecnico FOREIGN KEY (tecnico_id) REFERENCES tecnico (id)        ON DELETE CASCADE,
    CONSTRAINT accion_valida CHECK (accion IN ('CONFIRMAR', 'EN_CAMINO', 'COMPLETAR'))
);

CREATE INDEX idx_accion_token_orden ON accion_token (orden_id);
