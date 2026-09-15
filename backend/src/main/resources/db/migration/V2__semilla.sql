-- Semilla de demostracion.
--
-- Todo lo de aqui es inventado a proposito y esta declarado como tal: son
-- talleres, clientes y averias de ejemplo para poder ver la plataforma con algo
-- dentro. Ninguna cifra de la interfaz sale de un literal: los promedios, los
-- ingresos y los contadores se calculan sobre estas filas.
--
-- La clave de TODOS los usuarios de ejemplo es  demo1234
-- El hash es BCrypt real (coste 10), generado y verificado, no un literal copiado.
--
-- Las fechas son relativas a CURRENT_DATE: la demo se ve igual de fresca dentro
-- de seis meses.

-- ───────────────────────────── los tres talleres ─────────────────────────────

INSERT INTO mype (razon_social, ruc, descripcion, telefono, direccion, distrito, latitud, longitud) VALUES
 ('Servicios Delgado E.I.R.L.', '20601234567',
  'Taller familiar con quince años atendiendo lavadoras, refrigeradoras y tableros eléctricos a domicilio.',
  '944112233', 'Urb. Primavera, Mz. B Lt. 8', 'Trujillo', -8.1160000, -79.0340000),
 ('TecnoHogar Trujillo', '20609876543',
  'Servicio técnico a domicilio para electrodomésticos y equipos de cómputo.',
  '955223344', 'Av. España 1450', 'Trujillo', -8.1120000, -79.0290000),
 ('Reparaciones La Libertad', '20605554443',
  'Reparación de electrodomésticos y trabajos de gasfitería en Trujillo y alrededores.',
  '966334455', 'Urb. San Andrés, Etapa 2, Mz. J Lt. 3', 'Trujillo', -8.1220000, -79.0400000);

INSERT INTO mype_especialidad (mype_id, especialidad, tarifa_base)
SELECT id, 'REPARACION_ELECTRODOMESTICOS', 60.00 FROM mype WHERE ruc = '20601234567'
UNION ALL SELECT id, 'SERVICIOS_HOGAR',      65.00 FROM mype WHERE ruc = '20601234567'
UNION ALL SELECT id, 'SOPORTE_INFORMATICO',  70.00 FROM mype WHERE ruc = '20601234567'
UNION ALL SELECT id, 'REPARACION_ELECTRODOMESTICOS', 55.00 FROM mype WHERE ruc = '20609876543'
UNION ALL SELECT id, 'SERVICIOS_HOGAR',      58.00 FROM mype WHERE ruc = '20609876543'
UNION ALL SELECT id, 'SOPORTE_INFORMATICO',  65.00 FROM mype WHERE ruc = '20609876543'
UNION ALL SELECT id, 'REPARACION_ELECTRODOMESTICOS', 45.00 FROM mype WHERE ruc = '20605554443'
UNION ALL SELECT id, 'SERVICIOS_HOGAR',      50.00 FROM mype WHERE ruc = '20605554443';

-- ───────────────────────────── usuarios ─────────────────────────────
-- clave de todos: demo1234

INSERT INTO usuario (nombres, apellidos, email, clave_hash, telefono, rol) VALUES
 -- administradores de cada taller
 ('Jorge',    'Delgado',  'jorge@serviciosdelgado.pe', '$2a$10$af.6GmF0Zmb89vApd6Vq/eZzQfe4nUD0RRLmtSDxM9XgS11tn.7qa', '944112233', 'ADMIN_MYPE'),
 ('Silvia',   'Vega',     'silvia@tecnohogar.pe',      '$2a$10$af.6GmF0Zmb89vApd6Vq/eZzQfe4nUD0RRLmtSDxM9XgS11tn.7qa', '955223344', 'ADMIN_MYPE'),
 ('Raúl',     'Mendoza',  'raul@reparacionesll.pe',    '$2a$10$af.6GmF0Zmb89vApd6Vq/eZzQfe4nUD0RRLmtSDxM9XgS11tn.7qa', '966334455', 'ADMIN_MYPE'),
 -- tecnicos
 ('Luis',     'Ramírez',  'luis.ramirez@serviciosdelgado.pe',  '$2a$10$af.6GmF0Zmb89vApd6Vq/eZzQfe4nUD0RRLmtSDxM9XgS11tn.7qa', '977445566', 'TECNICO'),
 ('Ana',      'Quispe',   'ana.quispe@serviciosdelgado.pe',    '$2a$10$af.6GmF0Zmb89vApd6Vq/eZzQfe4nUD0RRLmtSDxM9XgS11tn.7qa', '977556677', 'TECNICO'),
 ('Carlos',   'Núñez',    'carlos.nunez@serviciosdelgado.pe',  '$2a$10$af.6GmF0Zmb89vApd6Vq/eZzQfe4nUD0RRLmtSDxM9XgS11tn.7qa', '977667788', 'TECNICO'),
 ('Pedro',    'Salazar',  'pedro.salazar@tecnohogar.pe',       '$2a$10$af.6GmF0Zmb89vApd6Vq/eZzQfe4nUD0RRLmtSDxM9XgS11tn.7qa', '988112233', 'TECNICO'),
 ('Marta',    'Ibáñez',   'marta.ibanez@reparacionesll.pe',    '$2a$10$af.6GmF0Zmb89vApd6Vq/eZzQfe4nUD0RRLmtSDxM9XgS11tn.7qa', '999223344', 'TECNICO'),
 -- clientes
 ('Rosa',     'Chávez',   'rosa.chavez@correo.pe',    '$2a$10$af.6GmF0Zmb89vApd6Vq/eZzQfe4nUD0RRLmtSDxM9XgS11tn.7qa', '911223344', 'CLIENTE'),
 ('Miguel',   'Aranda',   'miguel.aranda@correo.pe',  '$2a$10$af.6GmF0Zmb89vApd6Vq/eZzQfe4nUD0RRLmtSDxM9XgS11tn.7qa', '922334455', 'CLIENTE'),
 ('Elena',    'Rodríguez','elena.rodriguez@correo.pe','$2a$10$af.6GmF0Zmb89vApd6Vq/eZzQfe4nUD0RRLmtSDxM9XgS11tn.7qa', '933445566', 'CLIENTE'),
 ('Farmacia', 'Bolívar',  'contacto@farmaciabolivar.pe','$2a$10$af.6GmF0Zmb89vApd6Vq/eZzQfe4nUD0RRLmtSDxM9XgS11tn.7qa','944556677', 'CLIENTE'),
 ('Javier',   'Osorio',   'javier.osorio@correo.pe',  '$2a$10$af.6GmF0Zmb89vApd6Vq/eZzQfe4nUD0RRLmtSDxM9XgS11tn.7qa', '955667788', 'CLIENTE');

INSERT INTO administrador (usuario_id, mype_id)
SELECT u.id, m.id FROM usuario u, mype m
WHERE (u.email, m.ruc) IN (
  ('jorge@serviciosdelgado.pe', '20601234567'),
  ('silvia@tecnohogar.pe',      '20609876543'),
  ('raul@reparacionesll.pe',    '20605554443'));

INSERT INTO tecnico (usuario_id, mype_id, disponible)
SELECT u.id, m.id, t.disp FROM usuario u, mype m, (VALUES
  ('luis.ramirez@serviciosdelgado.pe', '20601234567', TRUE),
  ('ana.quispe@serviciosdelgado.pe',   '20601234567', FALSE),
  ('carlos.nunez@serviciosdelgado.pe', '20601234567', TRUE),
  ('pedro.salazar@tecnohogar.pe',      '20609876543', TRUE),
  ('marta.ibanez@reparacionesll.pe',   '20605554443', TRUE)
) AS t(correo, ruc, disp)
WHERE u.email = t.correo AND m.ruc = t.ruc;

INSERT INTO tecnico_especialidad (tecnico_id, especialidad)
SELECT t.id, e.esp FROM tecnico t JOIN usuario u ON u.id = t.usuario_id, (VALUES
  ('luis.ramirez@serviciosdelgado.pe', 'REPARACION_ELECTRODOMESTICOS'),
  ('luis.ramirez@serviciosdelgado.pe', 'SERVICIOS_HOGAR'),
  ('ana.quispe@serviciosdelgado.pe',   'SERVICIOS_HOGAR'),
  ('ana.quispe@serviciosdelgado.pe',   'SOPORTE_INFORMATICO'),
  ('carlos.nunez@serviciosdelgado.pe', 'SOPORTE_INFORMATICO'),
  ('pedro.salazar@tecnohogar.pe',      'SERVICIOS_HOGAR'),
  ('pedro.salazar@tecnohogar.pe',      'REPARACION_ELECTRODOMESTICOS'),
  ('marta.ibanez@reparacionesll.pe',   'REPARACION_ELECTRODOMESTICOS')
) AS e(correo, esp)
WHERE u.email = e.correo;

INSERT INTO cliente (usuario_id, direccion, referencia, distrito, latitud, longitud)
SELECT u.id, c.dir, c.ref, 'Trujillo', c.lat, c.lon FROM usuario u, (VALUES
  ('rosa.chavez@correo.pe',        'Urb. Primavera, Mz. C Lt. 14', 'Frente al parque',           -8.1155000, -79.0330000),
  ('miguel.aranda@correo.pe',      'Av. América Sur 3145',         'Edificio azul, dpto. 402',   -8.1180000, -79.0250000),
  ('elena.rodriguez@correo.pe',    'Urb. San Andrés, Etapa 3',     'Portón negro',               -8.1215000, -79.0395000),
  ('contacto@farmaciabolivar.pe',  'Jr. Bolívar 460',              'Local comercial en esquina', -8.1110000, -79.0285000),
  ('javier.osorio@correo.pe',      'Urb. El Golf, Mz. D Lt. 22',   'Casa de dos pisos',          -8.1290000, -79.0430000)
) AS c(correo, dir, ref, lat, lon)
WHERE u.email = c.correo;

-- ───────────────────────────── repuestos ─────────────────────────────

INSERT INTO repuesto (mype_id, nombre, descripcion, precio, stock)
SELECT m.id, r.nombre, r.descripcion, r.precio, r.stock FROM mype m, (VALUES
  ('20601234567', 'Rodaje de lavadora 6205',   'Rodaje sellado para tambor de lavadora',       45.00, 12),
  ('20601234567', 'Faja de lavadora',          'Faja de transmisión, medida estándar',         28.00, 20),
  ('20601234567', 'Termostato de refrigeradora','Termostato universal de repuesto',            55.00,  8),
  ('20601234567', 'Interruptor termomagnético','Llave térmica de 20 A para tablero',           35.00, 15),
  ('20601234567', 'Capacitor de aire acondicionado', 'Capacitor de arranque 35 uF',            60.00,  6),
  ('20601234567', 'Pasta térmica',             'Pasta disipadora para procesador',             18.00, 25),
  ('20609876543', 'Bomba de desagüe',          'Bomba de desagüe para lavadora',               75.00,  5),
  ('20609876543', 'Faja de lavadora',          'Faja de transmisión, medida estándar',         28.00, 14),
  ('20609876543', 'Fuente de poder 500 W',     'Fuente ATX de repuesto',                      130.00,  4),
  ('20605554443', 'Resistencia de secadora',   'Resistencia calefactora de secadora',          85.00,  3),
  ('20605554443', 'Llave de paso 1/2',         'Llave de paso de bronce para gasfitería',      22.00, 30)
) AS r(ruc, nombre, descripcion, precio, stock)
WHERE m.ruc = r.ruc;

-- ───────────────────────────── las ordenes de la demo ─────────────────────────
--
-- Doce ordenes que recorren los ocho estados, para que ninguna pantalla se vea
-- vacia y para que el panel tenga algo que filtrar. Las fechas van como desfase
-- en dias respecto a hoy.

INSERT INTO orden_servicio (
    codigo, cliente_id, mype_id, tecnico_id, especialidad, descripcion_falla,
    direccion, referencia, distrito, latitud, longitud,
    fecha_programada, hora_programada, estado, diagnostico,
    precio_mano_obra, total, creada_en, actualizada_en)
SELECT o.codigo, c.id, m.id, tec.id, o.especialidad, o.falla,
       o.direccion, o.referencia, 'Trujillo', c.latitud, c.longitud,
       CURRENT_DATE + o.dias, o.hora::time, o.estado, o.diagnostico,
       o.mano_obra, o.total,
       now() - (o.horas_creada || ' hours')::interval,
       now() - (o.horas_creada || ' hours')::interval + interval '1 hour'
FROM (VALUES
 ('ORD-0142','rosa.chavez@correo.pe',        '20601234567', NULL,
  'REPARACION_ELECTRODOMESTICOS','La lavadora no centrifuga y bota agua por abajo',
  'Urb. Primavera, Mz. C Lt. 14','Frente al parque',  0,'14:30','PENDIENTE',NULL,NULL,NULL,3),
 ('ORD-0141','miguel.aranda@correo.pe',      '20601234567', NULL,
  'SOPORTE_INFORMATICO','No enciende la laptop, huele a quemado',
  'Av. América Sur 3145','Edificio azul, dpto. 402',  0,'16:00','PENDIENTE',NULL,NULL,NULL,2),
 ('ORD-0140','miguel.aranda@correo.pe',      '20601234567', 'carlos.nunez@serviciosdelgado.pe',
  'SOPORTE_INFORMATICO','La computadora de la oficina se reinicia sola cada media hora',
  'Av. América Sur 3145','Edificio azul, dpto. 402',  1,'11:00','CONFIRMADA',NULL,NULL,NULL,22),
 ('ORD-0139','elena.rodriguez@correo.pe',    '20601234567', 'luis.ramirez@serviciosdelgado.pe',
  'SERVICIOS_HOGAR','Tablero eléctrico hace corto al conectar la ducha',
  'Urb. San Andrés, Etapa 3','Portón negro',          1,'09:00','ASIGNADA',NULL,NULL,NULL,20),
 ('ORD-0138','contacto@farmaciabolivar.pe',  '20601234567', 'ana.quispe@serviciosdelgado.pe',
  'SERVICIOS_HOGAR','Aire acondicionado no enfría, gotea adentro',
  'Jr. Bolívar 460','Local comercial en esquina',     0,'11:00','EN_CAMINO',NULL,NULL,NULL,26),
 ('ORD-0137','rosa.chavez@correo.pe',        '20601234567', 'ana.quispe@serviciosdelgado.pe',
  'REPARACION_ELECTRODOMESTICOS','La refrigeradora no enfría en la parte de abajo',
  'Urb. Primavera, Mz. C Lt. 14','Frente al parque',  0,'09:00','EN_PROCESO',
  'Termostato en mal estado, se está reemplazando',NULL,NULL,30),
 ('ORD-0136','javier.osorio@correo.pe',      '20601234567', 'luis.ramirez@serviciosdelgado.pe',
  'SERVICIOS_HOGAR','Se dispara la llave térmica cada vez que encienden la ducha',
  'Urb. El Golf, Mz. D Lt. 22','Casa de dos pisos',  -1,'10:00','COMPLETADA',
  'Llave térmica de 20 A quemada, se reemplazó y se reajustó el tablero',65.00,100.00,50),
 ('ORD-0135','javier.osorio@correo.pe',      '20601234567', 'luis.ramirez@serviciosdelgado.pe',
  'REPARACION_ELECTRODOMESTICOS','La secadora hace un ruido muy fuerte al girar',
  'Urb. El Golf, Mz. D Lt. 22','Casa de dos pisos',  -1,'15:20','CALIFICADA',
  'Rodaje del tambor desgastado, se reemplazó',60.00,105.00,54),
 ('ORD-0134','elena.rodriguez@correo.pe',    '20601234567', NULL,
  'SOPORTE_INFORMATICO','Instalación de cuatro cámaras de seguridad en el patio',
  'Urb. San Andrés, Etapa 3','Portón negro',         -2,'16:00','CANCELADA',NULL,NULL,NULL,72),
 ('ORD-0133','rosa.chavez@correo.pe',        '20609876543', 'pedro.salazar@tecnohogar.pe',
  'REPARACION_ELECTRODOMESTICOS','La lavadora hace ruido fuerte al centrifugar',
  'Urb. Primavera, Mz. C Lt. 14','Frente al parque', -4,'10:00','CALIFICADA',
  'Faja de transmisión floja, se reemplazó',55.00,83.00,100),
 ('ORD-0132','miguel.aranda@correo.pe',      '20609876543', 'pedro.salazar@tecnohogar.pe',
  'SERVICIOS_HOGAR','No sale agua caliente en la ducha',
  'Av. América Sur 3145','Edificio azul, dpto. 402', -6,'09:00','CALIFICADA',
  'Resistencia de la terma sulfatada, se limpió el contacto',58.00,58.00,150),
 ('ORD-0131','javier.osorio@correo.pe',      '20605554443', 'marta.ibanez@reparacionesll.pe',
  'REPARACION_ELECTRODOMESTICOS','La secadora ya no calienta, solo da vueltas',
  'Urb. El Golf, Mz. D Lt. 22','Casa de dos pisos', -7,'14:00','CALIFICADA',
  'Resistencia calefactora quemada, se reemplazó',45.00,130.00,180)
) AS o(codigo, correo_cliente, ruc, correo_tecnico, especialidad, falla,
       direccion, referencia, dias, hora, estado, diagnostico, mano_obra, total, horas_creada)
JOIN mype m ON m.ruc = o.ruc
JOIN usuario uc ON uc.email = o.correo_cliente
JOIN cliente c ON c.usuario_id = uc.id
LEFT JOIN (SELECT t.id, u.email FROM tecnico t JOIN usuario u ON u.id = t.usuario_id) AS tec
       ON tec.email = o.correo_tecnico;

-- ── repuestos usados en las ordenes ya cerradas ──

INSERT INTO orden_repuesto (orden_id, repuesto_id, cantidad, precio_unitario)
SELECT os.id, r.id, x.cantidad, r.precio
FROM (VALUES
  ('ORD-0136', 'Interruptor termomagnético', 1),
  ('ORD-0135', 'Rodaje de lavadora 6205',    1),
  ('ORD-0133', 'Faja de lavadora',           1),
  ('ORD-0131', 'Resistencia de secadora',    1)
) AS x(codigo, repuesto, cantidad)
JOIN orden_servicio os ON os.codigo = x.codigo
JOIN repuesto r ON r.nombre = x.repuesto AND r.mype_id = os.mype_id;

-- ── calificaciones de las ordenes cerradas ──

INSERT INTO calificacion (orden_id, puntaje, comentario, creada_en)
SELECT os.id, x.puntaje, x.comentario, os.actualizada_en + interval '2 hours'
FROM (VALUES
  ('ORD-0135', 5, 'Llegó a la hora acordada y dejó todo limpio. Muy recomendable.'),
  ('ORD-0133', 5, 'Rápidos y el precio fue el que me dijeron desde el inicio.'),
  ('ORD-0132', 4, 'Buen trabajo, aunque llegaron veinte minutos tarde.'),
  ('ORD-0131', 5, 'Explicó bien qué estaba fallando antes de cambiar la pieza.')
) AS x(codigo, puntaje, comentario)
JOIN orden_servicio os ON os.codigo = x.codigo;

-- ── pagos (simulados: efectivo, Yape o Plin, que es lo que se usa aqui) ──

INSERT INTO pago (orden_id, metodo, monto, estado, pagado_en)
SELECT os.id, x.metodo, os.total, 'PAGADO', os.actualizada_en + interval '30 minutes'
FROM (VALUES
  ('ORD-0136', 'EFECTIVO'),
  ('ORD-0135', 'YAPE'),
  ('ORD-0133', 'EFECTIVO'),
  ('ORD-0132', 'PLIN'),
  ('ORD-0131', 'EFECTIVO')
) AS x(codigo, metodo)
JOIN orden_servicio os ON os.codigo = x.codigo;

-- ───────────────────── historial de estados de esas doce ─────────────────────
--
-- Se reconstruye recorriendo el flujo hasta el estado en que quedo cada orden.
-- El paso a paso no es decorativo: es lo que ve el cliente en el seguimiento y
-- de donde salen los tiempos del informe.

INSERT INTO orden_historial (orden_id, estado_anterior, estado_nuevo, actor, nota, ocurrido_en)
SELECT os.id,
       ant.estado,
       f.estado,
       f.actor,
       f.nota,
       -- cada paso separado por un rato distinto en cada orden, para que los
       -- tiempos del informe no salgan todos iguales
       os.creada_en + ((f.paso - 1) * (25 + (os.id % 7) * 11) || ' minutes')::interval
FROM orden_servicio os
JOIN (VALUES
  ('PENDIENTE', 1, 'CLIENTE',    'El cliente registró la solicitud'),
  ('ASIGNADA',  2, 'ADMIN_MYPE', 'Se asignó un técnico y se le envió el correo'),
  ('CONFIRMADA',3, 'TECNICO',    'El técnico confirmó la recepción desde el correo'),
  ('EN_CAMINO', 4, 'TECNICO',    'El técnico salió hacia el domicilio'),
  ('EN_PROCESO',5, 'TECNICO',    'El técnico llegó y empezó el diagnóstico'),
  ('COMPLETADA',6, 'TECNICO',    'Trabajo terminado'),
  ('CALIFICADA',7, 'CLIENTE',    'El cliente calificó el servicio')
) AS f(estado, paso, actor, nota) ON TRUE
LEFT JOIN (VALUES
  ('ASIGNADA','PENDIENTE'), ('CONFIRMADA','ASIGNADA'), ('EN_CAMINO','CONFIRMADA'),
  ('EN_PROCESO','EN_CAMINO'), ('COMPLETADA','EN_PROCESO'), ('CALIFICADA','COMPLETADA')
) AS ant(hasta, estado) ON ant.hasta = f.estado
JOIN (VALUES
  ('PENDIENTE',1),('ASIGNADA',2),('CONFIRMADA',3),('EN_CAMINO',4),
  ('EN_PROCESO',5),('COMPLETADA',6),('CALIFICADA',7)
) AS actual(estado, paso) ON actual.estado = os.estado
WHERE os.codigo LIKE 'ORD-01%'
  AND f.paso <= actual.paso;

-- La cancelada no recorre el flujo: nace y muere.
INSERT INTO orden_historial (orden_id, estado_anterior, estado_nuevo, actor, nota, ocurrido_en)
SELECT os.id, NULL, 'PENDIENTE', 'CLIENTE', 'El cliente registró la solicitud', os.creada_en
FROM orden_servicio os WHERE os.codigo = 'ORD-0134'
UNION ALL
SELECT os.id, 'PENDIENTE', 'CANCELADA', 'CLIENTE',
       'El cliente canceló: consiguió el servicio por otro medio',
       os.creada_en + interval '4 hours'
FROM orden_servicio os WHERE os.codigo = 'ORD-0134';

-- ─────────────────── historico, para que los informes digan algo ───────────────
--
-- Ordenes ya cerradas y calificadas del ultimo semestre. No son relleno: son las
-- que hacen que la calificacion promedio y el numero de servicios de cada taller
-- sean un calculo y no un literal en la pantalla.
--
-- El puntaje sigue un patron fijo (no aleatorio) para que la demo se pueda
-- reproducir: umbral 1 => uno de cada cinco es 4 y el resto 5.

WITH tec_num AS (
    SELECT t.id, t.mype_id,
           (row_number() OVER (PARTITION BY t.mype_id ORDER BY t.id) - 1) AS n,
           count(*)     OVER (PARTITION BY t.mype_id)                     AS cuantos
    FROM tecnico t),
cli_num AS (
    SELECT c.id, c.direccion, c.referencia, c.latitud, c.longitud,
           (row_number() OVER (ORDER BY c.id) - 1) AS n,
           count(*)     OVER ()                    AS cuantos
    FROM cliente c),
esp_num AS (
    SELECT me.mype_id, me.especialidad, me.tarifa_base,
           (row_number() OVER (PARTITION BY me.mype_id ORDER BY me.especialidad) - 1) AS n,
           count(*)     OVER (PARTITION BY me.mype_id)                                AS cuantas
    FROM mype_especialidad me)
INSERT INTO orden_servicio (
    codigo, cliente_id, mype_id, tecnico_id, especialidad, descripcion_falla,
    direccion, referencia, distrito, latitud, longitud,
    fecha_programada, hora_programada, estado, diagnostico,
    precio_mano_obra, total, creada_en, actualizada_en)
SELECT
    'ORD-H' || substr(m.ruc, 8, 4) || '-' || lpad(g.i::text, 4, '0'),
    cn.id, m.id, tn.id, en.especialidad,
    CASE en.especialidad
      WHEN 'REPARACION_ELECTRODOMESTICOS' THEN (ARRAY[
        'La lavadora no centrifuga',
        'La refrigeradora no enfría',
        'La secadora no calienta',
        'La lavadora bota agua por debajo',
        'El microondas no calienta',
        'La refrigeradora hace mucho ruido'])[1 + g.i % 6]
      WHEN 'SERVICIOS_HOGAR' THEN (ARRAY[
        'Fuga de agua debajo del lavadero',
        'Se dispara la llave térmica',
        'El aire acondicionado no enfría',
        'No sale agua caliente en la ducha',
        'Tomacorriente sin corriente',
        'Atoro en el desagüe del baño'])[1 + g.i % 6]
      ELSE (ARRAY[
        'La laptop no enciende',
        'La computadora se reinicia sola',
        'Instalación de cámaras de seguridad',
        'La laptop se calienta y se apaga',
        'No hay imagen en el monitor',
        'Mantenimiento y limpieza de equipo'])[1 + g.i % 6]
    END,
    cn.direccion, cn.referencia, 'Trujillo', cn.latitud, cn.longitud,
    CURRENT_DATE - (8 + (g.i * 7) % 172),
    (ARRAY['08:00','09:00','10:00','11:00','14:00','15:00','16:00'])[1 + g.i % 7]::time,
    'CALIFICADA',
    'Atendido y cerrado',
    en.tarifa_base,
    en.tarifa_base + (g.i % 6) * 15,
    (CURRENT_DATE - (8 + (g.i * 7) % 172))::timestamptz + ((7 + g.i % 4) || ' hours')::interval,
    (CURRENT_DATE - (8 + (g.i * 7) % 172))::timestamptz + ((7 + g.i % 4) || ' hours')::interval
        + ((90 + (g.i % 11) * 25) || ' minutes')::interval
FROM (VALUES
    ('20601234567', 125),
    ('20609876543',  87),
    ('20605554443',  53)
) AS lote(ruc, cuantas)
JOIN mype m   ON m.ruc = lote.ruc
CROSS JOIN LATERAL generate_series(1, lote.cuantas) AS g(i)
JOIN tec_num tn ON tn.mype_id = m.id AND tn.n = g.i % tn.cuantos
JOIN esp_num en ON en.mype_id = m.id AND en.n = g.i % en.cuantas
JOIN cli_num cn ON cn.n = g.i % cn.cuantos;

INSERT INTO orden_historial (orden_id, estado_anterior, estado_nuevo, actor, nota, ocurrido_en)
SELECT os.id, NULL, 'PENDIENTE', 'CLIENTE', 'El cliente registró la solicitud', os.creada_en
FROM orden_servicio os WHERE os.codigo LIKE 'ORD-H%'
UNION ALL
SELECT os.id, 'EN_PROCESO', 'COMPLETADA', 'TECNICO', 'Trabajo terminado', os.actualizada_en
FROM orden_servicio os WHERE os.codigo LIKE 'ORD-H%'
UNION ALL
SELECT os.id, 'COMPLETADA', 'CALIFICADA', 'CLIENTE', 'El cliente calificó el servicio',
       os.actualizada_en + interval '3 hours'
FROM orden_servicio os WHERE os.codigo LIKE 'ORD-H%';

INSERT INTO calificacion (orden_id, puntaje, creada_en)
SELECT os.id,
       CASE WHEN right(os.codigo, 4)::int % 5 < lote.umbral THEN 4 ELSE 5 END,
       os.actualizada_en + interval '3 hours'
FROM orden_servicio os
JOIN mype m ON m.id = os.mype_id
JOIN (VALUES ('20601234567', 1), ('20609876543', 2), ('20605554443', 3)) AS lote(ruc, umbral)
     ON lote.ruc = m.ruc
WHERE os.codigo LIKE 'ORD-H%';

INSERT INTO pago (orden_id, metodo, monto, estado, pagado_en)
SELECT os.id,
       (ARRAY['EFECTIVO','YAPE','PLIN','EFECTIVO'])[1 + right(os.codigo, 4)::int % 4],
       os.total, 'PAGADO', os.actualizada_en + interval '20 minutes'
FROM orden_servicio os WHERE os.codigo LIKE 'ORD-H%';
