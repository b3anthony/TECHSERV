-- El correlativo visible de las ordenes: ORD-0143, ORD-0144...
--
-- No sale de un "SELECT max(codigo) + 1" a proposito: dos clientes reservando a
-- la vez leerian el mismo maximo y uno de los dos se estrellaria contra el
-- UNIQUE.
--
-- MySQL no tiene secuencias. Hace de secuencia esta tabla: cada reserva inserta
-- una fila y se queda con el id que le da AUTO_INCREMENT (LAST_INSERT_ID(), que
-- es de la conexion). Como un nextval(): atomico, no se repite bajo
-- concurrencia, no espera a que otra reserva termine su transaccion, y si la
-- reserva se deshace el numero se pierde, no se reutiliza.
--
-- Arranca en 143 porque la semilla llega hasta ORD-0142. Las ordenes historicas
-- usan otro prefijo (ORD-Hxxxx-nnnn), asi que no compiten por este rango.

CREATE TABLE orden_codigo_seq (
    valor BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY
) AUTO_INCREMENT = 143
  COMMENT = 'Correlativo del codigo visible de orden_servicio. Formato: ORD-0000.';
