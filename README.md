# TechServ

Plataforma web de gestión de citas y despacho de servicios técnicos a domicilio para MYPEs del distrito de Trujillo, La Libertad. Centraliza la búsqueda de talleres con tarifas transparentes y calificaciones calculadas, organiza la agenda diaria por franjas con control de cupos y permite el despacho operativo a técnicos en ruta mediante correos electrónicos con enlaces firmados de un solo uso, sin contraseñas ni aplicaciones móviles que instalar.

---

## 1. Qué es TechServ

En el distrito de Trujillo, los talleres pequeños de servicios técnicos (de 1 a 10 personas) gestionan sus citas en cuadernos o conversaciones de WhatsApp, sin visibilidad de qué técnico está libre y despachando trabajos a ciegas. Los clientes deben llamar, esperar sin saber cuánto costará la visita ni cuándo llegarán, mientras los técnicos reciben indicaciones incompletas por teléfono.

TechServ resuelve este problema mediante una plataforma web multi-inquilino que conecta a las tres partes: permite al cliente comparar talleres por tarifa base y calificación real antes de agendar, otorga al taller una bandeja de despacho con aforo por franja horaria en dos clics, y entrega al técnico una orden digital completa por correo con botones de acción inmediata.

---

## 2. Los tres roles

- **Cliente**: Consulta el catálogo público sin registro forzoso, compara tarifas y promedios reales de calificación, selecciona fecha y hora con disponibilidad garantizada, adjunta fotos de la avería, sigue la línea de tiempo del servicio y califica la atención recibida una vez completada.
- **Administrador MYPE (Taller)**: Administra la bandeja de órdenes de su negocio, visualiza los indicadores operativos del día, asigna visitas a técnicos según especialidad y carga de trabajo, gestiona tarifas, personal y repuestos, cierra órdenes liquidando mano de obra y piezas, y supervisa los reportes de ingresos y rendimiento.
- **Técnico**: **No inicia sesión nunca.** No tiene usuario ni contraseña en la web. Recibe las asignaciones directamente en su correo con la dirección, referencia, enlace a Google Maps y detalles de la avería, interactuando únicamente a través de dos botones con enlaces firmados de un solo uso («Confirmar recepción» y «Voy en camino»).

---

## 3. Cómo levantarlo, en tres comandos

Para poner en marcha la plataforma completa, ejecuta los siguientes tres comandos en terminales independientes dentro de la raíz del proyecto:

```bash
docker compose up -d
```
* **Qué hace**: Descarga e inicia en segundo plano los dos contenedores de soporte: la base de datos PostgreSQL 16 (`techserv-db`) y el servidor de correo local Mailpit (`techserv-correo`).
* **Qué se ve cuando funciona**: Docker confirma la creación e inicio de la red y los dos servicios: `Container techserv-db Started` y `Container techserv-correo Started`.

```bash
cd backend && mvn spring-boot:run
```
* **Qué hace**: Compila y arranca la API Spring Boot en el puerto 8080. Conecta con PostgreSQL en el puerto 55432, aplica automáticamente las migraciones versionadas de Flyway (`V1`, `V2`, `V3`) con los datos iniciales de prueba y valida que el esquema de la base coincida con las entidades JPA (`ddl-auto: validate`).
* **Qué se ve cuando funciona**: Los registros de consola de Spring Boot concluyen con la línea `Started TechServApplication in ... seconds`. La API queda lista para recibir peticiones y la documentación Swagger UI queda accesible en `http://localhost:8080/api-docs`.

```bash
cd frontend && npm run dev
```
* **Qué hace**: Inicia el servidor de desarrollo Vite para la aplicación en React 19 y activa las reglas de proxy reverso hacia el backend para las rutas `/api` y `/uploads`.
* **Qué se ve cuando funciona**: Vite muestra en terminal `VITE v8.x ready` con la URL local `➜ Local: http://localhost:5173/`. La interfaz queda lista para ser abierta en el navegador.

### Puertos y servicios

| Servicio | Contenedor / Proceso | Puerto host | Puerto interno | Descripción |
|---|---|---|---|---|
| **Frontend Web** | Proceso Vite (`npm run dev`) | `5173` | `5173` | Catálogo público, portal del cliente y panel administrativo (`http://localhost:5173`) |
| **Backend API** | Proceso Spring Boot (`mvn spring-boot:run`) | `8080` | `8080` | Endpoints REST, Swagger UI (`http://localhost:8080/api-docs`) y páginas de acción del técnico |
| **Base de datos** | Contenedor `techserv-db` (`postgres:16-alpine`) | `55432` | `5432` | PostgreSQL 16. **Atención:** Escucha en el puerto host **55432** para no colisionar con el 5432 ocupado por otros servicios |
| **Correo SMTP** | Contenedor `techserv-correo` (`axllent/mailpit`) | `1025` | `1025` | Puerto SMTP local utilizado por Spring Boot para el despacho de correos |
| **Bandeja Web de Correo** | Contenedor `techserv-correo` (`axllent/mailpit`) | `8025` | `8025` | Interfaz web de Mailpit para consultar los correos recibidos (`http://localhost:8025`) |

---

## 4. Los usuarios de la demo

Todos los usuarios de demostración tienen la misma contraseña:

```text
demo1234
```

*(El hash almacenado en la base de datos es BCrypt real con factor de coste 10 generado en la migración `V2__semilla.sql`).*

### Administradores MYPE (ingresan por la web)
Inician sesión en `http://localhost:5173/entrar` para acceder al panel administrativo de su respectivo taller:
* **Jorge Delgado** (`jorge@serviciosdelgado.pe`) — Administrador de *Servicios Delgado E.I.R.L.*
* **Silvia Vega** (`silvia@tecnohogar.pe`) — Administradora de *TecnoHogar Trujillo*
* **Raúl Mendoza** (`raul@reparacionesll.pe`) — Administrador de *Reparaciones La Libertad*

### Clientes (ingresan por la web)
Inician sesión en `http://localhost:5173/entrar` o gestionan órdenes en `http://localhost:5173/mis-ordenes`:
* **Rosa Chávez** (`rosa.chavez@correo.pe`)
* **Miguel Aranda** (`miguel.aranda@correo.pe`)
* **Elena Rodríguez** (`elena.rodriguez@correo.pe`)
* **Farmacia Bolívar** (`contacto@farmaciabolivar.pe`)
* **Javier Osorio** (`javier.osorio@correo.pe`)

### Técnicos (NO ingresan por la web)
**Los técnicos no inician sesión ni tienen acceso a la interfaz web.** Operan exclusivamente a través de los enlaces recibidos en su correo electrónico:
* **Luis Ramírez** (`luis.ramirez@serviciosdelgado.pe`) — Técnico en *Servicios Delgado* (Electrodomésticos y Hogar)
* **Ana Quispe** (`ana.quispe@serviciosdelgado.pe`) — Técnica en *Servicios Delgado* (Hogar e Informática)
* **Carlos Núñez** (`carlos.nunez@serviciosdelgado.pe`) — Técnico en *Servicios Delgado* (Soporte Informático)
* **Pedro Salazar** (`pedro.salazar@tecnohogar.pe`) — Técnico en *TecnoHogar Trujillo* (Hogar y Electrodomésticos)
* **Marta Ibáñez** (`marta.ibanez@reparacionesll.pe`) — Técnica en *Reparaciones La Libertad* (Electrodomésticos)

---

## 5. Cómo ver un correo del técnico

Durante el desarrollo y las pruebas, ningún correo sale a Internet ni llega a casillas reales. El backend envía todos los mensajes mediante SMTP al puerto local `1025` de Mailpit.

Para ver los correos generados:
1. Abre tu navegador y dirígete a:
   ```text
   http://localhost:8025
   ```
2. Verás la bandeja de entrada de Mailpit con los mensajes enviados por `TechServ <no-responder@techserv.pe>`.
3. Haz clic en el mensaje con asunto `TechServ · Nueva orden <CODIGO> asignada`.
4. El cuerpo del correo incluye la información completa de la cita, el enlace al mapa y los dos botones de acción («Confirmar recepción» y «Voy en camino»). Al hacer clic en cualquiera de ellos, se ejecutará la acción en el backend.

---

## 6. Cómo comprobar que está bien

Puedes validar el funcionamiento del sistema en cualquier momento con los siguientes comandos oficiales:

1. **Pruebas automáticas del backend**:
   ```bash
   cd backend && mvn test
   ```
   Ejecuta la suite de pruebas unitarias y de integración contra un PostgreSQL real levantado en Testcontainers, validando el aislamiento multi-inquilino, el cálculo de aforos y las transiciones de estado.

2. **Verificador de diseño y accesibilidad**:
   ```bash
   ./scripts/verificar-diseno.sh HEAD
   ```
   Comprueba de manera determinista que ningún componente introduzca colores en formato hexadecimal fuera de los tokens, no use clases de la paleta por defecto de Tailwind ni elimine utilidades de foco de teclado.

3. **Comprobación de consistencia de la base de datos (Fase 1)**:
   ```bash
   docker exec -i techserv-db psql -U techserv -d techserv -q -f - < docs/comprobar-fase-1.sql
   ```
   Ejecuta cinco consultas de integridad sobre las órdenes de prueba para comprobar que los historiales no tengan saltos imposibles, que ninguna orden activa quede sin técnico y que los montos cuadren matemáticamente.

4. **Comprobación de reportes y KPIs (Fase 8)**:
   ```bash
   docker exec -i techserv-db psql -U techserv -d techserv -q -f - < docs/kpis.sql
   ```
   Calcula directamente en SQL los ingresos, la distribución de estados, los tiempos de atención y el ranking de técnicos, permitiendo contrastar los valores con el endpoint `/api/panel/reportes`.

---

## 7. Requisitos previos

* **Java**: Requiere **Java 21** (especificado en `backend/pom.xml` bajo la propiedad `<java.version>21</java.version>` y en `PLAN.md`).
* **Docker y Docker Compose**: Requiere **Docker 29** y **Docker Compose 5.5** (indicado en `PLAN.md` §2; utiliza las imágenes `postgres:16-alpine` y `axllent/mailpit:latest` declaradas en `docker-compose.yml`).
* **Maven**: Se utiliza para compilar y ejecutar el backend (`mvn spring-boot:run`, `mvn test`), aunque en los archivos del proyecto no consta una versión mínima requerida (se verificó y opera con Apache Maven 3.9).
* **Node.js y npm**: Se utilizan para el entorno del frontend (`npm run dev`), aunque en `frontend/package.json` no consta una versión mínima en `engines` (en `scripts/capturar-pantalla.mjs` se menciona Node 22 para soporte de WebSocket nativo, y se verificó que opera con Node v22).

---

## 8. Qué NO es

De acuerdo con lo estipulado en `PLAN.md` §2, las siguientes funcionalidades quedan deliberadamente fuera del alcance del prototipo:
* **No es una aplicación móvil nativa**: Funciona como una aplicación web adaptada a dispositivos móviles.
* **No incluye pasarela de pago real**: El cobro es simulado mediante registro de método (efectivo, Yape, Plin o transferencia bancaria) al liquidar la orden.
* **No envía mensajes SMS ni notificaciones push móviles**: Las alertas al técnico se gestionan por correo electrónico.
* **No cuenta con chat en vivo**: La comunicación se realiza mediante los datos de contacto y teléfonos indicados en la orden.
* **No realiza facturación electrónica con la SUNAT**: No emite boletas ni facturas electrónicas tributarias.
* **No efectúa seguimiento GPS en tiempo real del técnico**: La ubicación se referencia mediante coordenadas fijas con enlaces directos a Google Maps.

---

## 9. Estructura del repositorio

```text
.
├── backend/       # API Spring Boot 3.5, seguridad JWT, migraciones Flyway y plantillas Thymeleaf
├── frontend/      # Aplicación web SPA en React 19, TypeScript, Vite y Tailwind CSS v4
├── docs/          # Consultas SQL de verificación (Fase 1 y KPIs) y guion de demostración
├── scripts/       # Utilidades de verificación determinista de diseño y captura de pantallas
├── disenio/       # Maquetas visuales y referencias de diseño aprobadas
├── uploads/       # Directorio de almacenamiento en disco local para fotografías de averías
└── .agents/       # Reglas de estilo, directrices operativas y habilidades para agentes
```
