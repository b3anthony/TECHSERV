# TechServ

Plataforma web para que los talleres pequeños de servicio técnico a domicilio de
Trujillo (La Libertad) reciban reservas, asignen técnicos y cobren las visitas.

- El **cliente** compara talleres por tarifa y calificación, reserva fecha y hora,
  elige cómo va a pagar y sigue su orden.
- El **administrador del taller** recibe las órdenes, las asigna a sus técnicos,
  las cierra y ve sus reportes.
- El **técnico** no instala nada ni usa contraseña: recibe un correo con un
  enlace a su orden y desde el celular confirma, avisa que va en camino, termina
  y cobra.

> **¿Usas Windows y es la primera vez?** Sigue el
> [manual de instalación para Windows](docs/MANUAL-WINDOWS.md), paso a paso desde
> cero. Este README es el resumen.

---

## 1. Qué necesitas instalado

| Programa | Versión | Para qué |
|---|---|---|
| [Git](https://git-scm.com/download/win) | cualquiera reciente | Descargar el proyecto |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | 4.x o superior | Base de datos PostgreSQL y bandeja de correo |
| [JDK 21](https://adoptium.net/temurin/releases/?version=21) (Temurin) | **21** | Backend (Spring Boot) |
| [Node.js](https://nodejs.org/) | **22 LTS** (mínimo 20.19) | Frontend (React + Vite) |

**No hace falta instalar Maven ni PostgreSQL.** El backend trae su propio Maven
(`mvnw` / `mvnw.cmd`) y la base de datos corre dentro de Docker.

---

## 2. Cómo levantarlo

Necesitas **tres terminales** abiertas en la carpeta del proyecto. En Windows
sirve PowerShell.

**Terminal 1: base de datos y correo**

```powershell
docker compose up -d
```

Levanta dos contenedores: `techserv-db` (PostgreSQL 16) y `techserv-correo`
(Mailpit). Déjalo así; siguen corriendo en segundo plano.

**Terminal 2: backend (API en el puerto 8080)**

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

En Linux o macOS: `./mvnw spring-boot:run`.
La primera vez tarda unos minutos porque descarga Maven y las dependencias.
Está listo cuando aparece `Started TechServApplication in ... seconds`.

**Terminal 3: frontend (web en el puerto 5173)**

```powershell
cd frontend
npm install
npm run dev
```

`npm install` solo hace falta la primera vez, o cuando cambie `package.json`.

**Abre http://localhost:5173** y entra con cualquiera de los usuarios de la
sección 3.

### La base de datos ya viene con datos de prueba

No hay que importar nada. La primera vez que arranca el backend, **Flyway**
crea las tablas y carga los datos de prueba (`backend/src/main/resources/db/migration/`,
de `V1` a `V6`):

- 3 talleres;
- 13 usuarios;
- 11 repuestos;
- unas 280 órdenes en todos los estados, con su historial y sus calificaciones,
  para que los reportes tengan datos.

Las fechas se calculan desde el día en que se crea la base, así que la demo
siempre se ve reciente.

### Direcciones

| Qué | Dirección |
|---|---|
| Web (cliente y panel del taller) | http://localhost:5173 |
| API del backend | http://localhost:8080 |
| Documentación de la API (Swagger) | http://localhost:8080/api-docs |
| Bandeja de correo (Mailpit) | http://localhost:8025 |
| PostgreSQL | `localhost:55432` · base `techserv` · usuario `techserv` · clave `techserv_local` |

---

## 3. Usuarios de prueba

**Todos tienen la misma contraseña: `demo1234`**

Se entra por http://localhost:5173/entrar.

### Administradores de taller → van al panel (`/panel`)

| Nombre | Correo | Taller | Especialidad |
|---|---|---|---|
| Jorge Delgado | `jorge@serviciosdelgado.pe` | Servicios Delgado E.I.R.L. | Reparación de electrodomésticos |
| Silvia Vega | `silvia@tecnohogar.pe` | TecnoHogar Trujillo | Soporte técnico e informático |
| Raúl Mendoza | `raul@reparacionesll.pe` | Reparaciones La Libertad | Servicios del hogar |

Servicios Delgado es el taller con más movimiento: tiene órdenes pendientes,
asignadas, en camino, en proceso y cerradas. Para la demo, conviene entrar con
**Jorge**.

### Clientes → van a «Mis órdenes» (`/mis-ordenes`)

| Nombre | Correo |
|---|---|
| Rosa Chávez | `rosa.chavez@correo.pe` |
| Miguel Aranda | `miguel.aranda@correo.pe` |
| Elena Rodríguez | `elena.rodriguez@correo.pe` |
| Farmacia Bolívar | `contacto@farmaciabolivar.pe` |
| Javier Osorio | `javier.osorio@correo.pe` |

### Técnicos → **no** entran por la web

Trabajan desde el enlace que les llega por correo (sección 4).

| Nombre | Correo | Taller |
|---|---|---|
| Luis Ramírez | `luis.ramirez@serviciosdelgado.pe` | Servicios Delgado |
| Ana Quispe | `ana.quispe@serviciosdelgado.pe` | Servicios Delgado (marcada como no disponible) |
| Carlos Núñez | `carlos.nunez@serviciosdelgado.pe` | Servicios Delgado |
| Pedro Salazar | `pedro.salazar@tecnohogar.pe` | TecnoHogar Trujillo |
| Marta Ibáñez | `marta.ibanez@reparacionesll.pe` | Reparaciones La Libertad |

También puedes crear tus propias cuentas en http://localhost:5173/registro: de
cliente, o de negocio si quieres un taller nuevo.

---

## 4. Cómo probar la parte del técnico

Ningún correo sale a Internet. Todos llegan a **Mailpit**, una bandeja de
mentira.

1. Entra como **Jorge** y abre una orden **pendiente** en el panel.
2. Asígnala a **Luis** o a **Carlos**.
3. Abre http://localhost:8025. Verás el correo
   «TechServ · Nueva visita ORD-…: abre tu orden».
4. Pulsa **Abrir mi orden**. Se abre la página del técnico (`/visita/…`), donde
   puede:
   - confirmar la visita o cancelarla (la cancelación solo le llega al taller);
   - avisar que va en camino;
   - registrar el diagnóstico y los repuestos;
   - cobrar con el método de pago que eligió el cliente.

Para verla como en un celular, abre las herramientas del navegador (F12) y
activa la vista de dispositivo móvil.

---

## 5. Comandos útiles

| Qué | Comando |
|---|---|
| Parar la base y el correo, sin perder datos | `docker compose stop` |
| Volver a encenderlos | `docker compose up -d` |
| **Borrar la base y empezar de cero** con los datos de prueba | `docker compose down -v` y después `docker compose up -d` y arrancar el backend |
| Pruebas del backend (necesita Docker encendido) | `cd backend` y `.\mvnw.cmd test` |
| Compilar el frontend y revisar los tipos | `cd frontend` y `npm run build` |
| Lint del frontend | `cd frontend` y `npm run lint` |
| Entrar a la base con `psql` | `docker exec -it techserv-db psql -U techserv -d techserv` |

Las pruebas del backend crean su propia base temporal con Testcontainers: no
tocan la base de desarrollo.

---

## 6. Configuración

**No hace falta configurar nada para trabajar en local.** Todos los valores
tienen un valor por defecto que funciona tal cual (`backend/src/main/resources/application.yml`
y `docker-compose.yml`).

Si quieres cambiar alguno, copia `.env.example` a `.env` y edítalo:

| Variable | Por defecto | Qué es |
|---|---|---|
| `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD` | `techserv` / `techserv` / `techserv_local` | Credenciales de la base |
| `TECHSERV_JWT_SECRETO` | una clave de desarrollo | Firma de las sesiones. **En producción hay que cambiarla.** |
| `TECHSERV_JWT_HORAS` | `12` | Cuánto dura una sesión |
| `TECHSERV_TOKEN_ACCION_HORAS` | `72` | Cuánto vale el enlace del técnico |
| `TECHSERV_URL_PUBLICA` / `TECHSERV_URL_FRONTEND` | `http://localhost:8080` / `http://localhost:5173` | Direcciones que se usan en los enlaces de los correos |

Docker Compose lee el `.env` solo. El backend lee variables de entorno del
sistema, no el archivo `.env`: si cambias la clave de la base en `.env`, pásala
también al backend como variable de entorno.

El archivo `.env` **nunca se sube** a GitHub (está en `.gitignore`).

---

## 7. Tecnologías

- **Backend:** Java 21, Spring Boot 3.5, Spring Security con JWT, JPA/Hibernate,
  Flyway, Thymeleaf (correos), PostgreSQL 16. Pruebas con JUnit y Testcontainers.
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, TanStack Query,
  React Router.
- **Servicios de apoyo:** Docker Compose con PostgreSQL y Mailpit.

## 8. Estructura

```text
.
├── backend/              API Spring Boot
│   ├── mvnw, mvnw.cmd    Maven incluido (no hay que instalarlo)
│   └── src/main/resources/db/migration/   Esquema y datos de prueba (Flyway)
├── frontend/             Web en React (cliente, panel del taller y página del técnico)
├── docs/                 Manual de Windows y consultas SQL de comprobación
├── scripts/              Verificadores (bash; en Windows, con Git Bash)
├── uploads/              Fotos que suben los clientes (no se suben a GitHub)
└── docker-compose.yml    PostgreSQL + Mailpit
```

## 9. Qué no hace (a propósito)

- No es una app móvil nativa: es una web que se adapta al celular.
- No cobra de verdad: registra con qué se pagó (efectivo, Yape, Plin o
  transferencia).
- No envía SMS ni notificaciones push: al técnico se le avisa por correo.
- No emite comprobantes electrónicos de SUNAT.
- No sigue al técnico por GPS.
