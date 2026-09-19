# TechServ — continuar aquí

> Sesión del **19 set 2026**. **Las 11 fases están cerradas.** Backend con
> **71 pruebas en verde**, frontend completo con el verificador en exit 0, y el
> proyecto se levanta y se navega. El plan está en [`PLAN.md`](./PLAN.md), el
> arranque en [`README.md`](./README.md) y la demostración en
> [`docs/guion-demo.md`](./docs/guion-demo.md); esto es el estado y las trampas,
> para no volver a pagarlas.
>
> **Quién escribe qué a partir de ahora:** `gemini-3.8-flash-high` programa,
> **DeepSeek audita** lo escrito, **Orca** mira las pantallas, y yo oriento,
> diagnostico, fusiono y compruebo. La tabla con los números está en
> `~/taller/vigente/ruteo.md`.

---

## 1. Dónde está el proyecto

| Fase | Estado | Qué quedó funcionando |
|---|---|---|
| **0 · Cimientos** | ✅ | Docker (PostgreSQL 16 + Mailpit), Spring Boot 3.5.14 / Java 21, React 19 + Vite + Tailwind v4, kit de agy instalado |
| **1 · Dominio y BD** | ✅ | 15 tablas, 15 entidades, 14 repositorios, semilla de 277 órdenes |
| **2 · Auth y multi-inquilino** | ✅ | Registro doble, login JWT, y el guardián del `mypeId` con su prueba |
| **3 · Catálogo público** | ✅ | Especialidades, talleres con promedio calculado, agenda del día |
| **4 · Reserva del cliente** | ✅ | Crear orden, fotos, cancelar, y el aforo por franja |
| **5 · Panel de la MYPE** | ✅ | Asignar técnico, técnicos con carga de hoy, ABM de personal/tarifas/repuestos |
| **6 · Correo HTML + tokens** | ✅ | Correo al técnico, dos botones firmados, `/t/accion` de un solo uso |
| **7 · Seguimiento, pago y calificación** | ✅ | Cierre con repuestos y mano de obra, cobro simulado, línea de tiempo, calificación |
| **8 · Reportes y KPIs** | ✅ | `/api/panel/reportes` + `docs/kpis.sql` que reproduce cada número |
| **9 · Portar el diseño** | ✅ | Las dos maquetas en React: panel y portal, con los tokens `@theme` y el verificador en verde |
| **10 · Pulido y entrega** | ✅ | README, guion de demo de 5 min, estados de carga/error/vacío, y la pasada de móvil de Orca |

**El frontend ya existe**: 32 archivos bajo `frontend/src`, con las dos pantallas
portadas de sus maquetas, **0 hex sueltos y 0 clases de la paleta de Tailwind**.
Todo color pasa por los tokens `@theme` de `index.css`.

### Commits

```
625a99d  Fase 10: pasada de movil de Orca, auditada
57a8ca5  Fase 10: README, guion de demostracion y cierre de los huecos de estado
c0ff673  Fase 9: el frontend real, portando las dos maquetas elegidas
64a2b7d  Fase 8: reportes y KPIs del taller, con su SQL de comprobacion
f2412a4  Fase 7: cierre de la orden, cobro simulado, seguimiento y calificacion
1318d7b  Fase 6: correo HTML del tecnico y tokens de accion de un solo uso
54184c9  Fase 5: panel de la MYPE, asignacion de tecnico y ABM
1ee65bd  Arregla la suite completa y deja el registro de donde se quedo
```

---

## 2. Cómo levantarlo

```bash
cd ~/Escritorio/TECHSERV
docker compose up -d                          # PostgreSQL :55432 + Mailpit :8025
cd backend  && mvn spring-boot:run            # API en :8080, Swagger en /api-docs
cd frontend && npm run dev                    # :5173, con proxy /api al backend
```

**Usuarios de la demo**, clave `demo1234` para todos:

| Rol | Correo |
|---|---|
| Admin de Servicios Delgado | `jorge@serviciosdelgado.pe` |
| Admin de TecnoHogar | `silvia@tecnohogar.pe` |
| Cliente | `rosa.chavez@correo.pe` |
| Técnico (no inicia sesión) | `luis.ramirez@serviciosdelgado.pe` |

Comprobar la base: `docker exec -i techserv-db psql -U techserv -d techserv -q -f - < docs/comprobar-fase-1.sql`
Comprobar los KPIs: `docker exec -i techserv-db psql -U techserv -d techserv -q -f - < docs/kpis.sql`

**Ojo:** `ORD-0142` quedó en `CONFIRMADA` en la base de desarrollo por la prueba
manual del correo del 19 set. No es un fallo; si molesta, se recrea la base.

---

## 3. Trampas ya pagadas — no volver a caer

1. **El 5432 lo ocupa `docentos_db`**, otro proyecto vivo del usuario. TechServ
   escucha en el **55432**. No parar ese contenedor.

2. **Testcontainers con `@Container` rompe la suite completa.** El contenedor se
   arranca en un bloque `static` en `BasePruebaIntegracion` a propósito. Medido:
   la segunda clase pasó de **220 s a 0,861 s**.

3. **Una prueba que nunca ha estado roja no demuestra nada.** Cada guardián de
   esta sesión se verificó al revés, y todos se pusieron rojos:
   `findByIdAndMypeId → findById` da `expected:<404> but was:<200>`; anular el
   uso único del token deja el historial con **5 filas en vez de 4**; quitar el
   filtro por taller de la consulta de ingresos tumba **dos** pruebas.

4. **Las clases de prueba comparten la misma base, y se pisan.** Esto costó tres
   fallos en una sola sesión (19 set), todos con la misma forma: una clase
   afirmaba algo sobre el estado global —"la primera orden ASIGNADA", "Delgado
   tiene 3 técnicos", "la semilla deja 2 técnicos disponibles"— y otra clase se
   lo cambiaba. **Cada prueba fabrica su propia condición de partida** y jamás
   fija totales absolutos de la semilla. Corolario operativo: **después de
   aplicar cualquier diff, correr la suite ENTERA**, nunca solo la clase tocada;
   cada brazo trabaja aislado y no puede ver esta interacción.

5. **Flyway ya aplicó V1, V2 y V3.** Editarlas rompe el checksum. Para cambiar la
   semilla hay que añadir una V4, o recrear la base:
   `docker exec -i techserv-db psql -U techserv -d postgres -c "DROP DATABASE techserv WITH (FORCE);" -c "CREATE DATABASE techserv OWNER techserv;"`

6. **El informe del brazo no es prueba, y esta sesión lo demostró dos veces.**
   Un brazo (`gemini-3.1-pro-high`) borró el filtro `WHERE p.orden.mype.id` de
   una consulta que ya existía y funcionaba: su reporte de ingresos sumaba la
   facturación de **todos** los talleres. Su propia prueba lo cazaba, pero su log
   entero eran 77 bytes de `error: There was a network issue`, así que nunca lo
   vio. Lo que lo detectó fue correr `mvn test` en su worktree.

7. **Los logs de los brazos salen vacíos o truncados.** Mirar los archivos en
   disco, no el log.

---

## 4. El plan está terminado. Qué haría yo si esto sigue

Las 11 fases están cerradas, así que lo que viene ya no es "la siguiente fase"
sino decisiones tuyas. Lo que está **abierto de verdad**, por orden de lo que más
aporta:

| Pendiente | Por qué |
|---|---|
| **Pantallas del ABM y de reportes** | La API existe entera (`/api/panel/tecnicos`, `/tarifas`, `/repuestos`, `/reportes`) pero **no tienen interfaz**: hoy el taller da de alta un técnico por la API, no por la web |
| **Pruebas del frontend** | El verificador mide color y foco, no comportamiento. Hoy hay **0 archivos de prueba** en `frontend/`, y el propio verificador lo recuerda al terminar |
| **La carrera del `/t/accion`, en el resto de escrituras** | Se cerró con un `UPDATE` condicional en el token. Conviene mirar si cerrar una orden dos veces a la vez tiene el mismo hueco |
| **Vaciar las huellas de las pruebas** | La base de desarrollo lleva técnicos y repuestos creados por las pruebas del ABM, y `ORD-0142` en `CONFIRMADA` |

### Al tocar el frontend, esto no se negocia

- **Los datos salen de la API**, no escritos en el componente.
- **Todo color pasa por los tokens `@theme`** de `frontend/src/index.css`. La
  línea base es **0 hex y 0 clases de paleta Tailwind**; cualquiera que entre
  pone rojo a `scripts/verificar-diseno.sh`. **Y hay que hacer `git add` antes de
  ejecutarlo**, o no mira los archivos nuevos.
- Foco visible y `prefers-reduced-motion` no se pierden.
- **Abre la pantalla y mírala.** `scripts/capturar-pantalla.mjs <ruta> <salida.png>
  [correo] [ancho] [alto]` hace login de verdad y captura la pantalla
  autenticada. Compilar no demuestra que una pantalla se pinte: el 19 set, dos
  fallos pasaron `tsc`, el verificador y el informe del brazo, y solo salieron
  al abrir el navegador.

**La API completa**, para referencia:

```
público      GET  /api/catalogo/**
cliente      POST /api/mis-ordenes · /{id}/fotos · /{id}/cancelar
             GET  /api/mis-ordenes · /{id} · /{id}/seguimiento · /{id}/calificacion
             POST /api/mis-ordenes/{id}/calificacion
panel        GET  /api/panel/ordenes · /{id} · /indicadores · /tecnicos · /tarifas
                  /repuestos · /reportes
             POST /api/panel/ordenes/{id}/asignar · /en-proceso · /cerrar · /pago
             POST/PATCH/DELETE  /api/panel/tecnicos · /tarifas · /repuestos
técnico      GET  /t/accion?token=…   (sin sesión, token de un solo uso)
```

---

## 5. Lo que no se toca

- Nada que toque `.env`, producción o datos reales se delega a ningún agente.
- El correo sale **solo** a Mailpit mientras esto sea un prototipo.
- No parar `docentos_db` ni los contenedores de Supabase: son de otros proyectos.

---

## 6. Quién hizo qué, y qué se aprendió de los brazos (19 set)

Las fases 5 a 10 —**seis fases enteras**— las escribieron los brazos; yo orienté,
audité, fusioné y arreglé lo que ninguno podía ver desde su worktree. El detalle
medido está en `~/taller/bitacora/2026-09-19-techserv-fases-5-a-10.md`.

**El reparto que queda fijado:** `gemini-3.8-flash-high` escribe el código,
**DeepSeek audita** lo ya escrito cruzando familia de modelo, **Orca** mira las
pantallas en un navegador, y yo diagnostico, fusiono y compruebo.

| Brazo | Resultado |
|---|---|
| `gemini-3.8-flash-high` | **Ganó las cuatro tareas.** Es el que se queda para implementar |
| `gemini-3.1-pro-high` | Programa bien y rápido, pero en 3 de 3 duelos perdió por lo mismo: duplicó la máquina de estados en vez de derivarla, se saltó las convenciones de nombres, y **borró un filtro de seguridad de una consulta existente**. En el arreglo de la carrera sí dio la mejor solución colateral |
| `claude-opus-4-6` y `claude-sonnet-4-6` | Se quedaron **colgados sin cuota**, sin error, con 0 % de CPU y sockets abiertos. Trabajo perdido a la mitad |
| **DeepSeek** (auditoría cruzada) | Encontró por su cuenta la carrera TOCTOU del token de un solo uso, con la consecuencia exacta (historial duplicado) y las cuatro defensas que no existían |
| **Orca** | La maqueta del portal, mirándose con chromium: 17 capturas, 8 de foco |

Correcciones a la documentación del taller, comprobadas en disco:

- El agente de agy dentro de Orca se llama **`antigravity`**, no `agy`.
- Orca escucha en **`127.0.0.1:6768`**, no en `0.0.0.0`.
- Orca acepta **`--base-branch <ref>`**: no está atado a `origin/main`. Pero sigue
  sin ver lo que no está commiteado.
- **Orca arranca pidiendo permiso** ("¿confías en esta carpeta?") y no avanza
  hasta que alguien contesta. Es su ventaja de seguridad y su coste operativo.
- **El compositor en `>` sin spinner no significa "terminado"**: Orca volvió a ese
  estado por un **error de red** a mitad del trabajo. Hay que mirar si el informe
  existe, no solo si la pantalla está quieta.
