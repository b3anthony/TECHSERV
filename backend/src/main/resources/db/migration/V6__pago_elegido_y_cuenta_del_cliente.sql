-- El método de pago que elige el cliente al reservar, y la cuenta del cliente
-- que se desactiva y, pasado un mes, se elimina.

-- ───────────────────────────── método de pago de la orden ─────────────────────────────

-- NULL solo en las órdenes anteriores a esta migración: en ellas el cliente no
-- eligió nada y al cobrar valen los métodos que acepte el taller.
ALTER TABLE orden_servicio
    ADD COLUMN metodo_pago VARCHAR(20),
    ADD CONSTRAINT orden_metodo_pago_valido CHECK (metodo_pago IS NULL OR metodo_pago IN
        ('EFECTIVO', 'YAPE', 'PLIN', 'TRANSFERENCIA'));

-- ───────────────────────────── cuenta del cliente ─────────────────────────────

-- desactivada_en: cuándo la desactivó. Si vuelve a entrar antes de un mes, se
-- reactiva y vuelve a NULL; si no, se elimina.
-- eliminada_en: cuándo se borraron sus datos personales. Las órdenes se quedan
-- (son también el historial del taller), pero ya no dicen quién las pidió.
ALTER TABLE cliente
    ADD COLUMN desactivada_en DATETIME(6),
    ADD COLUMN eliminada_en   DATETIME(6);

-- MySQL no tiene índices parciales: el índice cubre todas las filas, y las
-- que buscan las cuentas por eliminar filtran por las dos columnas.
CREATE INDEX idx_cliente_desactivada ON cliente (desactivada_en, eliminada_en);
