# TechServ — Guion de demostración de 5 minutos

Este guion recorre los tres roles de la plataforma (**Cliente**, **Taller** y **Técnico**) en siete pasos secuenciales. Está diseñado para presentar el flujo completo de inicio a fin en cinco minutos utilizando los datos reales de la semilla.

---

## Preparación previa

Asegúrate de que los servicios estén activos según lo indicado en el `README.md`:
* **Frontend**: `http://localhost:5173`
* **Backend API**: `http://localhost:8080`
* **Mailpit (bandeja de correo)**: `http://localhost:8025`

---

## Recorrido de la demostración

### 1. Cliente: Catálogo público, agenda y reserva

* **Qué se hace**:
  1. Ingresa a `http://localhost:5173/` en el navegador (no hace falta iniciar sesión previamente).
  2. En el paso «1. Elige una especialidad», selecciona **Reparación de Electrodomésticos**.
  3. En el paso «2. Selecciona un taller», haz clic en la tarjeta de **Servicios Delgado E.I.R.L.**.
  4. En el paso «3. Elige fecha y hora», selecciona la fecha de hoy (o mañana) y haz clic en una franja con cupo libre (por ejemplo, `10:00`).
  5. En el paso «4. Describe la falla y tu dirección», completa los campos:
     * **Falla**: «La lavadora no centrifuga y bota agua por abajo».
     * **Dirección**: «Urb. Primavera, Mz. C Lt. 14».
     * **Referencia**: «Frente al parque».
     * **Distrito**: «Trujillo».
  6. Inicia sesión con la clienta **Rosa Chávez** (`rosa.chavez@correo.pe`, clave: `demo1234`) y pulsa el botón **Confirmar reserva**.
* **Qué tiene que verse**:
  Aparece una ventana modal confirmando la creación exitosa de la orden con su código correlativo (por ejemplo `ORD-0144`), registrándose en estado `PENDIENTE`. Al hacer clic en «Ver seguimiento de la orden», se accede a su vista de seguimiento.
* **Por qué importa**:
  Se demuestra que la tarifa base («Desde S/ 60.00») y la calificación promedio real («4.8 ★ · 126 servicios») están a la vista antes de decidir, sin obligar al cliente a registrarse a ciegas, y que la agenda valida los cupos disponibles en tiempo real.

---

### 2. Taller: Bandeja de órdenes y asignación de técnico

* **Qué se hace**:
  1. En una pestaña del navegador, ingresa a `http://localhost:5173/entrar`.
  2. Inicia sesión como administrador del taller con **Jorge Delgado** (`jorge@serviciosdelgado.pe`, clave: `demo1234`).
  3. Dirígete a la bandeja en `http://localhost:5173/panel`.
  4. Observa los cuatro indicadores superiores («Pendientes», «Asignadas», «En camino», «Completadas hoy») y haz clic sobre la orden pendiente recién creada (o sobre `ORD-0141` de la semilla).
  5. En la vista de detalle de la orden (`/panel/ordenes/:id`), pulsa el botón **Asignar técnico**.
  6. En el diálogo que se abre, revisa los técnicos del taller: selecciona a **Luis Ramírez** (disponible y habilitado para Reparación de Electrodomésticos y Hogar) y haz clic en **Asignar y enviar correo al técnico**.
* **Qué tiene que verse**:
  El diálogo se cierra y la orden cambia de inmediato su estado a **ASIGNADA**. El historial refleja el evento «Se asignó un técnico y se le envió el correo» y el backend despacha un correo HTML al técnico.
* **Por qué importa**:
  Se demuestra la asignación en dos clics y que el sistema filtra automáticamente el personal: solo se pueden seleccionar técnicos de ese taller que atienden esa especialidad y se encuentran disponibles.

---

### 3. Técnico: Recepción de correo y confirmación con enlace firmado

* **Qué se hace**:
  1. Abre en otra pestaña la bandeja web de Mailpit:
     `http://localhost:8025`
  2. En la lista de mensajes, abre el correo recién recibido con asunto `TechServ · Nueva orden <CODIGO> asignada` dirigido a `luis.ramirez@serviciosdelgado.pe`.
  3. Observa los datos del servicio: cliente, teléfono, dirección con enlace a Google Maps y descripción de la falla.
  4. Haz clic sobre el botón azul **Confirmar recepción**.
* **Qué tiene que verse**:
  Se abre una ventana en `http://localhost:8080/t/accion?token=...` mostrando la pantalla con distintivo verde:
  «Acción registrada: Se ha registrado la actualización de la orden exitosamente», mostrando el código de la orden y el «Nuevo estado: Confirmada».
* **Por qué importa**:
  Se demuestra el núcleo operativo del proyecto: el técnico en ruta trabaja sin contraseñas ni aplicaciones móviles; gestiona la orden desde enlaces firmados con JWT de un solo uso que caducan a las 72 horas.

---

### 4. El mismo enlace otra vez: Prueba de uso único (idempotencia)

* **Qué se hace**:
  1. En la misma pestaña de confirmación del navegador, pulsa el botón de recargar la página (o regresa al correo en Mailpit y pulsa nuevamente sobre «Confirmar recepción»).
* **Qué tiene que verse**:
  El sistema no duplica la acción ni altera el estado. Responde con la pantalla informativa azul:
  «Acción ya registrada: Este enlace ya fue utilizado anteriormente. Cada enlace del correo funciona una sola vez.», indicando el código de la orden y su estado actual.
* **Por qué importa**:
  Se demuestra que el enlace sirve exactamente una sola vez gracias al registro en la tabla `accion_token`. Una firma JWT sola valida la autenticidad, pero solo el control de consumo en base de datos impide ataques de repetición o clics duplicados.

---

### 5. Taller: Cierre de la orden con repuestos y registro de pago

* **Qué se hace**:
  1. Regresa al panel del taller en `http://localhost:5173/panel/ordenes/:id`.
  2. Pulsa **Marcar en proceso** (o abre directamente el diálogo de cierre según el estado).
  3. Pulsa el botón **Cerrar la orden**.
  4. En el diálogo modal:
     * Escribe el diagnóstico: «Termostato quemado y rodaje gastado, reemplazados satisfactoriamente».
     * En mano de obra ingresa `60.00`.
     * Haz clic en «+ Agregar repuesto del inventario», elige **Rodaje de lavadora 6205** (precio unitario S/ 45.00, stock inicial 12) con cantidad `1`.
     * Comprueba que el total calculado en pantalla sea `S/ 105.00`.
     * Pulsa **Cerrar orden y fijar costo**.
  5. En la cabecera de la orden, haz clic en el botón **Registrar pago**, selecciona el método **YAPE** y pulsa **Registrar cobro**.
* **Qué tiene que verse**:
  La orden pasa al estado **COMPLETADA**, se muestra el desglose financiero (mano de obra S/ 60.00, repuestos S/ 45.00, total S/ 105.00) con el distintivo «Pago registrado», y en la base de datos el stock del rodaje disminuye de 12 a 11 unidades.
* **Por qué importa**:
  Se demuestra la consistencia del flujo financiero: el precio final es la suma matemática rigurosa de mano de obra y materiales, y el inventario del taller se descuenta de forma transaccional.

---

### 6. Cliente: Línea de tiempo y calificación del servicio

* **Qué se hace**:
  1. Vuelve a la sesión del cliente en `http://localhost:5173/mis-ordenes/:id` (con `rosa.chavez@correo.pe`).
  2. Revisa la línea de tiempo completa del servicio: desde la creación, asignación, confirmación del técnico, hasta el cierre completado.
  3. En la sección inferior «Calificar servicio», selecciona **5 estrellas**, redacta un comentario (por ejemplo: «Excelente trabajo de Luis, muy puntual y la lavadora quedó operativa») y pulsa **Enviar calificación**.
* **Qué tiene que verse**:
  Aparece el aviso «¡Gracias! Tu calificación ha sido registrada», la orden pasa al estado final **CALIFICADA** y el comentario queda publicado. Al volver al catálogo inicial (`http://localhost:5173/`), el promedio del taller se actualiza con la nueva evaluación.
* **Por qué importa**:
  Se demuestra que el promedio de calificación y los contadores del catálogo público son valores calculados dinámicamente mediante agregaciones (`AVG` y `COUNT`) sobre calificaciones reales, sin datos estáticos ni alterados a mano.

---

### 7. Taller: Reportes y KPIs auditables

* **Qué se hace**:
  1. Como administrador del taller, consulta los datos analíticos del negocio mediante la API:
     `http://localhost:8080/api/panel/reportes`
  2. En una terminal en la raíz del proyecto, ejecuta el script SQL de comprobación de KPIs:
     ```bash
     docker exec -i techserv-db psql -U techserv -d techserv -q -f - < docs/kpis.sql
     ```
* **Qué tiene que verse**:
  La terminal imprime el desglose de los siete indicadores clave:
  1. Suma de ingresos pagados en el periodo (`ingresos`).
  2. Conteo de órdenes por cada uno de los ocho estados (`ordenesPorEstado`).
  3. Total de órdenes creadas en el mes (`ordenes_creadas`).
  4. Horas medias de atención entre registro y cierre (`horas_medias_de_atencion`).
  5. Calificación promedio histórica del taller (`calificacion_promedio`).
  6. Cantidad histórica de servicios calificados (`servicios_calificados`).
  7. Ranking de técnicos ordenado por trabajos terminados e ingresos generados (`ranking`).
  Cada número obtenido por la API coincide punto por punto con los resultados de la consulta SQL.
* **Por qué importa**:
  Se demuestra que ningún dato del panel administrativo es ficticio: cada indicador que consulta el dueño del taller se deriva de transacciones auditables en PostgreSQL.

---

## Si algo no sale

Si surge algún inconveniente durante la demostración, revisa las causas más frecuentes:

1. **La base de datos rechaza la conexión o muestra datos de otro proyecto**:
   * *Causa*: En este equipo se encuentra activo otro servicio PostgreSQL (como el contenedor `docentos_db`) que utiliza el puerto 5432 estándar. El contenedor `techserv-db` escucha exclusivamente en el puerto host **55432**.
   * *Solución*: Verifica que tus herramientas y clientes apunten al puerto 55432. Nunca intentes cambiar el puerto a 5432 ni detener los contenedores ajenos.

2. **El enlace del correo del técnico muestra «Acción ya registrada» o «Acción inválida»**:
   * *Causa*: El enlace ya fue presionado previamente (la fila en `accion_token` tiene `usado_en` registrado), el token superó las 72 horas de vigencia o la orden ya no se encuentra en el estado previo requerido.
   * *Solución*: Cada enlace firmado opera una sola vez por seguridad. Si necesitas probar nuevamente el flujo de confirmación, crea una nueva orden en el catálogo y asígnala para emitir tokens nuevos.

3. **El backend falla al iniciar por validación de Hibernate o Flyway**:
   * *Causa*: Hibernate opera con `ddl-auto: validate`. Si se alteran los archivos de migración existentes (`V1`, `V2`, `V3`), Flyway detecta una discrepancia de checksum y detiene el arranque.
   * *Solución*: No modifiques las migraciones existentes. Para cambios crea una migración nueva (ej. `V4`) o recrea la base de datos de desarrollo con:
     ```bash
     docker exec -i techserv-db psql -U techserv -d postgres -c "DROP DATABASE techserv WITH (FORCE);" -c "CREATE DATABASE techserv OWNER techserv;"
     ```
     y vuelve a arrancar el backend con `mvn spring-boot:run`.

4. **Error 409 (Conflicto) al intentar confirmar una reserva**:
   * *Causa*: El taller alcanzó el aforo máximo de técnicos disponibles para esa especialidad en esa franja horaria específica.
   * *Solución*: Es el control de aforo por franja funcionando correctamente. Elige otra hora u otra fecha donde la agenda indique cupos disponibles.
