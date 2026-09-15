# Portal del Cliente — elegir taller y reservar la visita técnica

**Qué es.** TechServ es una plataforma web donde una persona de Trujillo (Perú)
que tiene algo averiado —una lavadora, una laptop, el tablero eléctrico— busca un
taller cerca, ve cuánto cobra y qué calificación tiene, y reserva una visita a
domicilio para una fecha y una hora. Esta pantalla es donde el cliente elige el
taller y llena la reserva. La usa una vez cada varios meses, desde el móvil o
desde la computadora, y casi siempre con prisa y con el aparato roto delante.

**Qué tiene que haber en pantalla.**

- Barra superior con "TechServ", el enlace "Mis solicitudes" y el botón
  "Iniciar sesión".
- Un encabezado corto: título "Reserva tu servicio técnico a domicilio" y debajo
  "Talleres de Trujillo, con precio y calificación a la vista."
- El selector de especialidad, tres opciones grandes, la primera elegida:
  - "Reparación de Electrodomésticos" — lavadoras, refrigeradoras, secadoras
  - "Servicios del Hogar" — gasfitería, electricidad, aire acondicionado
  - "Soporte Técnico e Informático" — laptops, PC, cámaras de seguridad
- La lista de talleres disponibles para la especialidad elegida. Estos tres,
  literales:
  1. **Servicios Delgado E.I.R.L.** — 4.8 de 5 (126 servicios) —
     Desde S/ 60 por visita — Urb. Primavera, Trujillo — Atiende hoy
  2. **TecnoHogar Trujillo** — 4.6 de 5 (89 servicios) —
     Desde S/ 55 por visita — Av. España, Trujillo — Atiende desde mañana
  3. **Reparaciones La Libertad** — 4.4 de 5 (54 servicios) —
     Desde S/ 45 por visita — Urb. San Andrés, Trujillo — Atiende hoy
  El primero aparece seleccionado.
- El formulario de reserva, con estos campos y sus etiquetas exactas:
  - "¿Qué está fallando?" — área de texto, con el ejemplo escrito dentro:
    "La lavadora no centrifuga y bota agua por abajo"
  - "Fotos del problema (opcional)" — zona para arrastrar o elegir archivos, con
    dos miniaturas ya cargadas y su botón de quitar
  - "Dirección" — campo de texto, y debajo "Referencia (opcional)"
  - "Distrito" — selector, con Trujillo elegido
  - "Fecha" y "Hora" — uno al lado del otro; las horas disponibles como botones:
    08:00, 09:00, 10:00, 11:00, 14:00, 15:00, 16:00. La de las 10:00 elegida y
    la de las 11:00 marcada como no disponible.
  - "Tu nombre", "Teléfono" y "Correo electrónico"
- Un resumen fijo al costado (o abajo en móvil) con: el taller elegido, la
  especialidad, la fecha y hora, "Visita técnica: desde S/ 60", la línea
  "El costo final de repuestos y mano de obra se confirma tras el diagnóstico" y
  el botón "Confirmar reserva".

**Dirección visual.** Claro y profesional. Fondo `#f8fafc`, tarjetas blancas con
borde `#e2e8f0`, texto principal `#0f172a` y secundario `#64748b`. Azul de acción
`#1d4ed8` para botones sólidos y enlaces; ámbar `#d97706` solo para las estrellas
de calificación; verde `#059669` para "Atiende hoy". Lo elegido se marca con
borde azul y un cambio de fondo claro, no solo con color. Tipografía de sistema.
Formulario cómodo de rellenar: etiquetas encima del campo, campos anchos, errores
posibles debajo. Bordes redondeados suaves, sombras mínimas.

**Qué NO quiero.** Nada de modo oscuro. Nada de gradientes ni efecto glass. Nada
de iconos de emoji. Nada de carrusel. Nada de contador de tiempo ni de urgencia
("¡solo hoy!", "quedan 2 cupos"). Nada de texto en mayúsculas sostenidas como
etiqueta encima de los títulos. Nada de "→" pegado al texto de los botones. Nada
de sellos de confianza ni logotipos de marcas. Nada de mapa embebido.

**Copy.** Español con tildes, tal como está escrito arriba. Moneda: soles (S/).

**Accesibilidad.** Cada campo con su `<label>` asociado. Todo lo interactivo con
`:focus-visible` visible. Las horas no disponibles, deshabilitadas de verdad.
Incluye un bloque `@media (prefers-reduced-motion: reduce)` si pones cualquier
transición.

**No inventes datos.** Nada de porcentajes, cifras de usuarios, tiempos de
respuesta, testimonios, marcas ni números de teléfono que no estén aquí arriba.
Si necesitas un dato que no tienes, no lo pongas.
