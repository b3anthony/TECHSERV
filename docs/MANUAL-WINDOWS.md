# Manual de instalación en Windows

Guía paso a paso para levantar TechServ en una PC con **Windows 10 u 11**,
empezando desde cero. Si ya tienes algo instalado, sáltate ese paso.

Tiempo aproximado la primera vez: 30 a 45 minutos, casi todo en descargas.

---

## Paso 1. Instalar los programas

### 1.1 Git

1. Descarga desde https://git-scm.com/download/win e instala con las opciones
   por defecto.
2. Esto también instala **Git Bash**, que sirve para correr los scripts `.sh`
   de la carpeta `scripts/`.

### 1.2 Docker Desktop

Docker corre la base de datos (PostgreSQL) y la bandeja de correo (Mailpit)
sin que tengas que instalarlas.

1. Descarga desde https://www.docker.com/products/docker-desktop/ e instala.
2. Si el instalador lo pregunta, deja marcada la opción **Use WSL 2**.
3. **Reinicia la PC** si te lo pide.
4. Abre **Docker Desktop** y espera a que abajo a la izquierda diga
   *Engine running* (motor en marcha).

> Si Docker dice que falta WSL, abre PowerShell **como administrador**, ejecuta
> `wsl --install`, reinicia la PC y vuelve a abrir Docker Desktop.
>
> Si dice que la virtualización está desactivada, hay que activarla en la BIOS
> de la PC (suele llamarse *Intel VT-x*, *AMD-V* o *SVM*).

### 1.3 Java 21 (JDK)

1. Entra a https://adoptium.net/temurin/releases/?version=21
2. Elige **Windows**, **x64**, **JDK**, y descarga el `.msi`.
3. Al instalar, en la pantalla de opciones, activa:
   - **Set JAVA_HOME variable**;
   - **Add to PATH** (suele venir activado).

   Si te saltas `JAVA_HOME`, el backend no arranca.

### 1.4 Node.js 22

1. Descarga la versión **22 LTS** desde https://nodejs.org/ e instala con las
   opciones por defecto.

### 1.5 Comprobar que todo quedó bien

Cierra y **vuelve a abrir** PowerShell (las variables nuevas solo se ven en
ventanas nuevas) y ejecuta:

```powershell
git --version
docker --version
java -version
node -v
```

Cada uno tiene que responder con su versión. `java -version` tiene que decir
**21**, y `node -v` **v22** (o al menos v20.19).

**No hace falta instalar Maven** (el proyecto lo trae) **ni PostgreSQL** (va
dentro de Docker).

---

## Paso 2. Descargar el proyecto

El repositorio es privado: primero el dueño tiene que invitarte como
colaborador en GitHub (*Settings → Collaborators*) y tú aceptar la invitación.

En PowerShell, dentro de la carpeta donde quieras guardarlo (por ejemplo, tus
Documentos):

```powershell
cd $HOME\Documents
git clone https://github.com/b3anthony/TECHSERV.git
cd TECHSERV
```

La primera vez, Git abrirá una ventana para iniciar sesión en GitHub. Hazlo con
tu cuenta.

> **Mejor una ruta corta y sin espacios ni tildes**, como `C:\proyectos\TECHSERV`.
> Algunas herramientas fallan con rutas del tipo `C:\Users\José Pérez\OneDrive\...`.
> Tampoco conviene trabajar dentro de OneDrive: sincroniza miles de archivos de
> `node_modules`.

---

## Paso 3. Levantar la base de datos y el correo

Con **Docker Desktop abierto**, en PowerShell, dentro de la carpeta `TECHSERV`:

```powershell
docker compose up -d
```

La primera vez descarga las imágenes (unos 100 MB). Cuando termine, comprueba:

```powershell
docker compose ps
```

Tienen que aparecer `techserv-db` y `techserv-correo` con estado `Up`
(`techserv-db` además con `healthy`).

---

## Paso 4. Arrancar el backend

Abre **otra** ventana de PowerShell en la carpeta `TECHSERV`:

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

- La primera vez tarda entre 3 y 10 minutos: descarga Maven y las dependencias.
  Las siguientes, unos 20 segundos.
- Está listo cuando ves la línea
  `Started TechServApplication in ... seconds`.
- **Deja esta ventana abierta.** Si la cierras, se apaga el backend. Para
  pararlo, pulsa `Ctrl + C`.

En ese primer arranque, el backend crea todas las tablas y carga los **datos de
prueba** (talleres, usuarios, órdenes, calificaciones). En el registro verás:

```text
Successfully applied 6 migrations to schema "public", now at version v6
```

No hay que importar ninguna base a mano.

---

## Paso 5. Arrancar el frontend

Abre una **tercera** ventana de PowerShell en la carpeta `TECHSERV`:

```powershell
cd frontend
npm install
npm run dev
```

- `npm install` solo es necesario la primera vez (o cuando alguien cambie
  `package.json`).
- Está listo cuando aparece `Local: http://localhost:5173/`.
- Deja esta ventana abierta también.

> Si PowerShell responde *"la ejecución de scripts está deshabilitada en este
> sistema"* al usar `npm`, ejecuta una sola vez:
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` y responde `S`.

---

## Paso 6. Abrir la aplicación

Abre **http://localhost:5173** en el navegador.

Entra por **Entrar** con cualquiera de estos usuarios. **La contraseña de todos
es `demo1234`**:

| Rol | Correo | Qué ves |
|---|---|---|
| Administrador de taller | `jorge@serviciosdelgado.pe` | Panel de Servicios Delgado: órdenes, equipo, precios, reportes y ajustes |
| Administradora de taller | `silvia@tecnohogar.pe` | Panel de TecnoHogar Trujillo |
| Administrador de taller | `raul@reparacionesll.pe` | Panel de Reparaciones La Libertad |
| Cliente | `rosa.chavez@correo.pe` | Sus órdenes, reservar y «Mi cuenta» |
| Cliente | `miguel.aranda@correo.pe` | Ídem |
| Cliente | `elena.rodriguez@correo.pe` | Ídem |
| Cliente | `contacto@farmaciabolivar.pe` | Ídem |
| Cliente | `javier.osorio@correo.pe` | Ídem |

Los técnicos (Luis, Ana, Carlos, Pedro y Marta) **no entran por la web**:
reciben un correo con un enlace. Cómo probarlo:

1. Entra como **Jorge**.
2. Abre una orden pendiente y asígnala a Luis o a Carlos.
3. Abre **http://localhost:8025** (Mailpit, la bandeja de correo de prueba).
4. Abre el correo «Nueva visita ORD-…» y pulsa **Abrir mi orden**.

La lista completa de usuarios, con su taller y su especialidad, está en el
[README](../README.md#3-usuarios-de-prueba).

---

## El día a día

Una vez instalado, cada vez que quieras trabajar:

1. Abre **Docker Desktop**.
2. En la carpeta `TECHSERV`:
   `docker compose up -d`
3. En otra ventana:
   `cd backend` y `.\mvnw.cmd spring-boot:run`
4. En otra ventana:
   `cd frontend` y `npm run dev`
5. Abre http://localhost:5173

Para apagar: `Ctrl + C` en las ventanas del backend y del frontend, y después
`docker compose stop`. Los datos se conservan.

### Traer los cambios de tus compañeros

```powershell
git pull
cd frontend
npm install
```

Después, reinicia el backend. Si alguien añadió una migración nueva
(`V7__...sql`), el backend la aplica sola al arrancar.

### Volver a los datos de prueba originales

Si la base quedó desordenada y quieres empezar de cero:

```powershell
docker compose down -v
docker compose up -d
```

Y arranca otra vez el backend. `-v` **borra la base entera**; al arrancar, el
backend la vuelve a crear con los datos de prueba.

---

## Problemas frecuentes

| Síntoma | Causa y solución |
|---|---|
| `docker: command not found`, o *error during connect* | Docker Desktop no está abierto. Ábrelo y espera a *Engine running*. |
| `Bind for 0.0.0.0:55432 failed: port is already allocated` | Otro programa usa ese puerto. Cierra el otro contenedor o cambia `55432` en `docker-compose.yml` y en `backend/src/main/resources/application.yml`. |
| `Port 8080 was already in use` | Ya hay un backend corriendo (quizá en otra ventana). Ciérralo, o busca qué lo usa con `netstat -ano \| findstr :8080`. |
| `JAVA_HOME not found` o `JAVA_HOME is set to an invalid directory` | Reinstala el JDK marcando **Set JAVA_HOME variable**, o créala a mano en *Variables de entorno* apuntando a la carpeta del JDK (por ejemplo `C:\Program Files\Eclipse Adoptium\jdk-21...`). Cierra y abre PowerShell. |
| `release version 21 not supported` | Tienes otro Java por delante en el PATH. `java -version` tiene que decir 21. |
| `Connection to localhost:55432 refused` al arrancar el backend | La base no está levantada. Ejecuta `docker compose up -d` y espera a que `docker compose ps` diga `healthy`. |
| `Validate failed: Migrations have failed validation` | Tu base es de una versión vieja del proyecto con migraciones distintas. Bórrala con `docker compose down -v` y vuelve a levantarla. |
| La web carga pero dice que no puede conectar, o no aparece nada | El backend no está corriendo o todavía está arrancando. Mira su ventana. |
| `npm install` falla con `EPERM` o `EBUSY` | Cierra VS Code y el antivirus que esté escaneando la carpeta, y vuelve a intentarlo. Si sigue, borra la carpeta `frontend\node_modules` y repite. |
| Los scripts de `scripts/` no corren en PowerShell | Son de bash: ábrelos con **Git Bash** (`./scripts/verificar-diseno.sh HEAD`). |
| No llega el correo del técnico | Mira http://localhost:8025. Si Mailpit no abre, `docker compose ps` tiene que mostrar `techserv-correo`. |

---

## Para correr las pruebas

Con Docker Desktop abierto:

```powershell
cd backend
.\mvnw.cmd test
```

Las pruebas crean su propia base temporal (Testcontainers) y no tocan la tuya.
Tardan unos minutos. Al final tiene que decir `BUILD SUCCESS`.

Frontend:

```powershell
cd frontend
npm run build
npm run lint
```
