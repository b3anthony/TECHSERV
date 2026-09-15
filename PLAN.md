# TechServ — Plan de construcción

> Plataforma web de gestión de citas y despacho de servicios técnicos a domicilio
> para MYPEs del distrito de Trujillo, La Libertad.
> Spring Boot + React. Estado del documento: **plan aprobado, Fase 0 en curso.**
> Última revisión: 15 set 2026.

---

## 1. A quién sirve y qué resuelve

Tres roles, una sola plataforma, datos aislados por negocio (multi-inquilino).

| Quién | Hoy | Con TechServ |
|---|---|---|
| **MYPE** (taller de 1 a 10 personas) | Citas en cuaderno y WhatsApp; no sabe qué técnico está libre | Bandeja de órdenes, asignación en dos clics, tarifas y reportes |
| **Cliente** | Llama, espera, no sabe cuánto costará ni cuándo llegan | Elige taller por precio y calificación, reserva fecha y hora, sigue el estado |
| **Técnico** | Le avisan a medias: sin dirección, sin foto, sin saber la falla | Correo HTML con todo y dos botones firmados, sin contraseña |

**Las tres especialidades:** Servicios del Hogar (gasfitería, electricidad, aire
acondicionado) · Soporte Técnico e Informático (laptops, cámaras) · Reparación de
Electrodomésticos (lavadoras, refrigeradoras).

---

## 2. Decisiones ya tomadas

Las tomo yo y las dejo escritas para poder discutirlas, no para esconderlas.

| Decisión | Qué se eligió | Por qué |
|---|---|---|
| **Dirección visual** | Claro y profesional: fondo `#f8fafc`, azul `#1d4ed8`, estado por punto **+ texto** | Elegida por el usuario el 15 set. Es una herramienta de jornada larga, no una landing |
| **Base de datos** | PostgreSQL 16 en Docker | Ya hay Docker 29 y Compose 5.5. Nada de H2: un prototipo con otra BD que la real miente sobre el SQL |
| **Correo** | **Mailpit** en Docker (SMTP `localhost:1025`, bandeja web `localhost:8025`) | Se ve el HTML real del correo sin mandar nada a nadie. Cero riesgo de tocar correos reales |
| **Fotos de la falla** | Disco local en `uploads/`, servidas por el backend | Prototipo. El salto a S3/MinIO es un `StorageService` con otra implementación |
| **Mapa** | Enlace `google.com/maps/search/?api=1&query=lat,lng` | No necesita clave de API ni factura |
| **Pago** | **Simulado**: efectivo, Yape o Plin, registrados al cerrar la orden | Es lo que se usa en Trujileño real. Pasarela de verdad no aporta nada al prototipo y añade claves |
| **Multi-inquilino** | Una BD, columna `mype_id` en toda tabla de negocio, filtrada en la capa de servicio | Lo que cabe en un prototipo sin mentir sobre el aislamiento |
| **Migraciones** | Flyway con SQL versionado | El esquema es parte del repo y se revisa como código |

**Lo que NO entra en el prototipo:** app móvil nativa, pasarela de pago real, SMS,
chat en vivo, facturación electrónica SUNAT, geolocalización automática del
técnico en tiempo real.

---

## 3. Arquitectura

```
navegador
   │
   ├── React 19 + TypeScript + Vite + Tailwind v4        :5173
   │      cliente · admin MYPE · (técnico entra por correo)
   │
   ▼  REST/JSON + JWT (cabecera Authorization)
Spring Boot 3.5 · Java 21 · Maven                        :8080
   │  web · security · data-jpa · validation · mail · thymeleaf · flyway
   │
   ├── PostgreSQL 16        (docker)                      :5432
   ├── Mailpit              (docker)                      :1025 / :8025
   └── uploads/             (disco local)
```

**Paquetes del backend**, por dominio y no por capa:

```
pe.techserv
├── comun/          errores, respuestas, auditoría, utilidades
├── seguridad/      JWT, filtros, roles, tokens de acción del técnico
├── usuario/        usuario, registro doble, perfil
├── mype/           negocio, especialidades, tarifas, técnicos, repuestos
├── catalogo/       búsqueda pública de MYPEs por especialidad
├── orden/          orden de servicio, estados, fotos, historial
├── notificacion/   correo HTML (Thymeleaf), plantillas
├── pago/           registro de pago simulado
└── reporte/        KPIs del panel
```

---

## 4. Modelo de datos

```
usuario ──1:1── cliente
   │  rol: CLIENTE | ADMIN_MYPE | TECNICO
   ├──1:1── tecnico ──N:1── mype
   └──1:1── admin  ──N:1── mype

mype ──1:N── mype_especialidad (especialidad, tarifa_base)
     ──1:N── repuesto (nombre, precio, stock)

orden_servicio (mype_id, cliente_id, tecnico_id, especialidad, estado, …)
     ──1:N── orden_foto
     ──1:N── orden_historial   (cada cambio de estado, con quién y cuándo)
     ──1:N── orden_repuesto    (repuesto usado, cantidad, precio del momento)
     ──1:1── calificacion      (puntaje 1-5, comentario)
     ──1:1── pago              (método, monto, fecha)

accion_token (jti, orden_id, tecnico_id, accion, expira_en, usado_en)
```

**Máquina de estados de la orden** — ningún salto fuera de esta tabla:

```
PENDIENTE ──asigna la MYPE──▶ ASIGNADA ──botón del correo──▶ CONFIRMADA
                                  │                              │
                                  │                       botón del correo
                                  │                              ▼
                                  │                          EN_CAMINO
                                  │                              ▼
                                  │                          EN_PROCESO
                                  │                              ▼
                                  ▼                          COMPLETADA
                              CANCELADA  ◀──cliente o MYPE──┘     ▼
                                                              CALIFICADA
```

Cada transición escribe una fila en `orden_historial`. El estado no se cambia con
un `UPDATE` suelto: pasa por un único método que valida el origen y el destino.

---

## 5. El flujo del técnico, que es la parte delicada

El técnico no inicia sesión. Recibe un correo HTML con la dirección, el mapa, las
fotos y dos botones. Si esos botones fueran una URL adivinable, cualquiera podría
cerrar órdenes ajenas. Cómo se cierra:

1. Al asignar, el backend firma **un JWT por botón**: `jti` único, `orden_id`,
   `tecnico_id`, `accion` (`CONFIRMAR` o `COMPLETAR`), expiración de **72 horas**.
2. El `jti` se guarda en `accion_token` con `usado_en = NULL`.
3. El botón apunta a `GET /t/accion?token=…`. El backend verifica firma,
   expiración, que el `jti` exista, que **no esté usado**, y que el estado actual
   de la orden admita esa acción.
4. Al validar, marca `usado_en`, aplica la transición y devuelve una página de
   confirmación. Un segundo clic ya no hace nada: dice que la acción ya se
   registró.
5. Todo fallo —firma, expiración, reutilización, estado imposible— cae en la misma
   página de error, sin filtrar cuál de los cuatro fue.

---

## 6. Las fases

Cada fase termina con algo que se puede ejecutar y comprobar. No hay fase que
termine en "código escrito".

### Fase 0 · Cimientos — *en curso*
Repo git, `docker-compose.yml` (PostgreSQL + Mailpit), esqueleto Maven del
backend, esqueleto Vite del frontend, `AGENTS.md` y el verificador del kit.
**Se comprueba:** `docker compose up -d` levanta los dos servicios; `mvn -q
spring-boot:run` arranca en :8080; `npm run dev` sirve en :5173.

### Fase 1 · Dominio y base de datos
Migraciones Flyway con todo el esquema de la sección 4, entidades JPA,
repositorios, y semilla de demostración: 3 MYPEs de Trujillo, 5 técnicos,
4 clientes, 12 órdenes repartidas por todos los estados, calificaciones.
**Se comprueba:** `psql` sobre la base levantada devuelve las 12 órdenes y el
histórico coherente de cada una.

### Fase 2 · Autenticación y multi-inquilino
Registro doble (`/registro/cliente`, `/registro/negocio`), login único, JWT con
rol, filtro de seguridad, y el guardián de `mype_id` que impide que un admin lea
órdenes de otro taller.
**Se comprueba:** una prueba de integración donde el admin de la MYPE A pide una
orden de la MYPE B y recibe 404, no 403 — no se confirma ni que existe.

### Fase 3 · Catálogo público
Listado de especialidades y de MYPEs con tarifa base, calificación promedio y
número de servicios. Filtro por especialidad y por distrito.
**Se comprueba:** la calificación promedio sale de las calificaciones reales, no
de una columna que alguien actualizó a mano.

### Fase 4 · Reserva de la orden (rol Cliente)
Formulario completo, subida de fotos con validación de tipo y tamaño, elección de
fecha y hora contra las franjas ocupadas del taller, creación de la orden en
`PENDIENTE` y su código legible (`ORD-0142`).
**Se comprueba:** dos reservas a la misma hora en el mismo taller — la segunda no
entra, y el error se lee en la interfaz.

### Fase 5 · Panel de la MYPE (rol Admin)
Bandeja con los filtros por estado, detalle de la orden, asignación de técnico con
su disponibilidad, y el ABM de técnicos, tarifas y repuestos.
**Se comprueba:** asignar dispara el correo, y el correo aparece en Mailpit.

### Fase 6 · Correo HTML y tokens de acción (rol Técnico)
Plantilla Thymeleaf responsive, con tablas y estilos en línea porque es un correo;
botón al mapa; los dos botones firmados de la sección 5; y la página de destino.
**Se comprueba:** el token reutilizado da la página de "ya registrado"; el token
caducado y el manipulado dan la misma página de error.

### Fase 7 · Seguimiento, pago y calificación
Línea de tiempo del estado para el cliente, cierre de la orden con repuestos y
mano de obra, registro del pago simulado y calificación de 1 a 5 con comentario.
**Se comprueba:** el total de la orden es la suma de mano de obra y repuestos, y
calificar recalcula el promedio del taller.

### Fase 8 · Reportes y KPIs
Ingresos por periodo, órdenes por estado, tiempo medio de atención, calificación
promedio y ranking de técnicos. Con gráficos, calculados sobre datos reales.
**Se comprueba:** cada número del panel se puede reproducir con una consulta SQL
escrita en `docs/kpis.sql`.

### Fase 9 · Portar el diseño ganador
Llevar la maqueta elegida a componentes React reales: tokens `@theme` de Tailwind,
componentes compartidos, y el verificador del kit en verde.
**Se comprueba:** `verificar-diseno.sh` en exit 0 y `tsc --noEmit` limpio.

### Fase 10 · Pulido y entrega
Responsive de verdad en móvil, foco y teclado en todos los flujos, estados de
carga y de error, `README.md` con el arranque en tres comandos, y un guion de
demostración de 5 minutos que recorre los tres roles.
**Se comprueba:** alguien que no ha visto el proyecto lo levanta siguiendo solo el
README.

---

## 7. Quién hace qué

Sale de `~/.agy-kit/RUTEO.md`, que está medido, no supuesto.

| Trabajo | Quién | Cómo |
|---|---|---|
| **Proponer diseño de pantalla** | **agy: Gemini 3.8 y 3.7 en paralelo** | `agy-prototipos.sh`, mismo brief literal a los dos. El usuario elige |
| **Elegir entre las maquetas** | **El usuario** | Decisión de producto. No se delega |
| **Portar la maqueta a componentes** | **Yo** | Es donde los generadores meten hex sueltos y paleta de Tailwind |
| **Backend, seguridad, esquema, tokens** | **Yo** | Toca dinero, identidad y datos: no se delega |
| **Cambio repetitivo en muchos archivos** | **agy**, brazos en worktree | `agy-implementa.sh`, devuelve `.diff`, nunca toca la copia de trabajo |
| **Depurar por qué algo falla** | **Yo** | Delegar un diagnóstico multiplica las suposiciones. Medido: 3 sesiones seguidas sin aportar nada |
| **Segunda opinión sobre código ya escrito** | **DeepSeek** (`dsh`), en serie | Solo cuando no se sabe en qué archivo mirar. Factura aparte |

### Lo que compruebo antes de dar por buena cualquier delegación

Nunca el informe del agente. Siempre el disco:

1. El `.diff` existe y toca los archivos que dice.
2. `verificar-diseno.sh` en exit 0.
3. `tsc --noEmit` y `mvn -q verify`.
4. Qué cambió que nadie pidió — la categoría que más daño hace.
5. **Datos inventados.** De 5 maquetas medidas, 2 los inventaron. Cada cifra de la
   interfaz tiene que venir de la base de datos o del brief.
6. Si cita código, cada cita se comprueba con `grep -F` y se dice el ratio. Los
   números de línea se descartan: está medido que se inventan (0 de 10 correctos).

---

## 8. Reglas que no se rompen

- **Nada que toque `.env`, producción o datos reales se delega.** Nunca.
- El `.env` no entra en ningún worktree de ningún brazo.
- Los secretos del prototipo (clave de firma JWT, contraseña de la BD) viven en
  `.env.example` con valores de juguete, y `.env` está en `.gitignore`.
- Las contraseñas se guardan con BCrypt. Ninguna en claro, tampoco en la semilla.
- El correo sale **solo** a Mailpit mientras esto sea un prototipo.

---

## 9. Arranque

```bash
docker compose up -d                 # PostgreSQL + Mailpit
cd backend  && mvn spring-boot:run   # :8080
cd frontend && npm run dev           # :5173
# bandeja de correo de prueba:       http://localhost:8025
```
