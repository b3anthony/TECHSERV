-- Una configuración de cobro por taller, independiente de sus ajustes.
CREATE TABLE mype_cobro (
    mype_id       BIGINT NOT NULL PRIMARY KEY,
    yape_numero   VARCHAR(9),
    yape_qr       VARCHAR(300),
    plin_numero   VARCHAR(9),
    plin_qr       VARCHAR(300),
    banco         VARCHAR(60),
    titular       VARCHAR(120),
    numero_cuenta VARCHAR(30),
    cci           VARCHAR(20),
    actualizado_en DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    CONSTRAINT cobro_mype FOREIGN KEY (mype_id) REFERENCES mype (id) ON DELETE CASCADE,
    CONSTRAINT cobro_yape_celular CHECK (yape_numero IS NULL OR REGEXP_LIKE(yape_numero, '^9[0-9]{8}$')),
    CONSTRAINT cobro_plin_celular CHECK (plin_numero IS NULL OR REGEXP_LIKE(plin_numero, '^9[0-9]{8}$')),
    CONSTRAINT cobro_cci_valido CHECK (cci IS NULL OR REGEXP_LIKE(cci, '^[0-9]{20}$')),
    CONSTRAINT cobro_cuenta_valida CHECK (numero_cuenta IS NULL OR REGEXP_LIKE(numero_cuenta, '^[0-9-]+$')),
    CONSTRAINT cobro_transferencia_completa CHECK (
        (banco IS NULL AND titular IS NULL AND numero_cuenta IS NULL AND cci IS NULL)
        OR (banco IS NOT NULL AND TRIM(banco) <> ''
            AND titular IS NOT NULL AND TRIM(titular) <> ''
            AND (numero_cuenta IS NOT NULL OR cci IS NOT NULL))
    )
);
