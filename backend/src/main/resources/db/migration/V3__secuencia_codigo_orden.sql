-- El correlativo visible de las ordenes: ORD-0143, ORD-0144...
--
-- Va en una secuencia y no en un "SELECT max(codigo) + 1" a proposito: dos
-- clientes reservando a la vez leerian el mismo maximo y uno de los dos se
-- estrellaria contra el UNIQUE. nextval() es atomico y no se repite ni bajo
-- concurrencia.
--
-- Arranca en 143 porque la semilla llega hasta ORD-0142. Las ordenes historicas
-- usan otro prefijo (ORD-Hxxxx-nnnn), asi que no compiten por este rango.

CREATE SEQUENCE orden_codigo_seq AS BIGINT START WITH 143 INCREMENT BY 1;

COMMENT ON SEQUENCE orden_codigo_seq IS
    'Correlativo del codigo visible de orden_servicio. Formato: ORD-0000.';
