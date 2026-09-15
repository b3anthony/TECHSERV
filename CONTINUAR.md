# TechServ — continuar aquí

> Sesión del **15 set 2026**. De 11 fases, **hay 5 cerradas (0 a 4)** y las seis
> restantes sin empezar. Todo lo cerrado está commiteado y comprobado en disco.
> El plan completo está en [`PLAN.md`](./PLAN.md); esto es el estado y las
> trampas, para no volver a pagarlas.

---

## 1. Dónde está el proyecto

| Fase | Estado | Qué quedó funcionando |
|---|---|---|
| **0 · Cimientos** | ✅ | Docker (PostgreSQL 16 + Mailpit), Spring Boot 3.5.14 / Java 21, React 19 + Vite + Tailwind v4, kit de agy instalado |
| **1 · Dominio y BD** | ✅ | 15 tablas, 15 entidades, 14 repositorios, semilla de 277 órdenes |
| **2 · Auth y multi-inquilino** | ✅ | Registro doble, login JWT, y el guardián del `mypeId` con su prueba |
| **3 · Catálogo público** | ✅ | Especialidades, talleres con promedio calculado, agenda del día |
| **4 · Reserva del cliente** | ✅ | Crear orden, fotos, cancelar, y el aforo por franja |
| **5 · Panel de la MYPE** | ⬜ | Falta la asignación de técnico y el ABM de personal/tarifas/repuestos |
| **6 · Correo HTML + tokens** | ⬜ | **La pieza central del proyecto.** Ver §4 |
| **7 · Seguimiento, pago y calificación** | ⬜ | |
| **8 · Reportes y KPIs** | ⬜ | |
| **9 · Portar el diseño** | ⬜ | Maqueta elegida: `gemini-3.8-flash-high` del panel |
| **10 · Pulido y entrega** | ⬜ | |

**El frontend está en pañales a propósito:** solo el esqueleto de Vite con los
tokens `@theme`. Toda la interfaz llega en la Fase 9, cuando se porte la maqueta
elegida sobre una API que ya existe.

### Commits

```
e0f89f7  Fases 3 y 4: catalogo publico y reserva del cliente
4927a11  Fase 2: autenticacion y aislamiento entre talleres
defacec  Fase 1: dominio, esquema y semilla de TechServ
590a906  Maqueta 3.7 del panel: version final del brazo
5a7b701  Fase 0: cimientos de TechServ
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

---

## 3. Trampas ya pagadas — no volver a caer

1. **El 5432 lo ocupa `docentos_db`**, otro proyecto vivo del usuario. TechServ
   escucha en el **55432**. No parar ese contenedor.

2. **Testcontainers con `@Container` rompe la suite completa.** Cada clase pasaba
   en verde por separado y juntas daban **5 fallos y 2 errores**: JUnit para el
   contenedor al acabar cada clase, pero Spring cachea el contexto y la siguiente
   clase se encuentra el DataSource apuntando a una base apagada
   (`Could not open JPA EntityManager`, tras 30 s colgado en el pool). La solución
   es arrancarlo en un bloque `static` y quitar `@Testcontainers`. **Se nota en el
   reloj:** la segunda clase pasó de **220 s a 0,861 s**.

3. **Una prueba que nunca ha estado roja no demuestra nada.** El test del
   multi-inquilino se verificó al revés: cambiando `findByIdAndMypeId` por
   `findById` se pone roja con `expected:<404> but was:<200>`. Hacer esto con cada
   prueba que proteja algo importante.

4. **La comprobación de la Fase 1 encontró un fallo mío, no del agente.** Un
   repuesto enlazado desde el inventario de otro taller hacía que el total de
   ORD-0133 no cuadrase. Las consultas de `docs/comprobar-fase-1.sql` buscan
   **contradicciones**, no filas; por eso sirvieron.

5. **Los brazos de agy siguen escribiendo después de que aparezca el archivo.**
   Audité las maquetas y los tamaños cambiaron luego (3.8 del panel: 83.649 B en
   mi medición, 79.676 B al final). **Esperar al resumen del script antes de
   auditar**, no a que exista el `index.html`.

6. **Los logs de los brazos salieron en 0 bytes** aunque el `index.html` sí se
   escribió. No es el fallo silencioso del 14 sep: ahí no había archivo. Mirar
   siempre el archivo, no el log.

7. **Flyway ya aplicó V1 y V2 en la base de desarrollo.** Editarlas rompe el
   checksum. Para cambiar la semilla ahora hay que añadir una V4, o recrear la
   base: `docker exec -i techserv-db psql -U techserv -d postgres -c "DROP DATABASE techserv WITH (FORCE);" -c "CREATE DATABASE techserv OWNER techserv;"`

---

## 4. Lo primero al retomar: Fases 5 y 6

Son las dos que hay que hacer seguidas, porque la 5 termina justo donde empieza
la 6: el administrador pulsa **"Asignar y enviar correo al técnico"**.

### Fase 5 · Panel de la MYPE

Ya existen `ServicioPanel` (bandeja, detalle, indicadores) y `ControladorPanel`.
Falta:

- `POST /api/panel/ordenes/{id}/asignar` con el `tecnicoId` — valida que el
  técnico sea **de ese taller** (`findByIdAndMypeId`, no `findById`) y que atienda
  esa especialidad, pasa la orden a `ASIGNADA` y dispara el correo.
- `GET /api/panel/tecnicos` con la carga de hoy: el repositorio ya tiene
  `cargaDeHoy(mypeId)` sin usar.
- ABM de técnicos, tarifas y repuestos.

### Fase 6 · El correo del técnico — la pieza delicada

Todo el andamiaje está escrito y **sin usar todavía**:

| Ya existe | Dónde |
|---|---|
| `AccionTecnico` con `desde`/`hasta` por acción | `seguridad/AccionTecnico.java` |
| `AccionToken` (tabla + entidad) con `jti` y `usadoEn` | `seguridad/AccionToken.java` |
| `ServicioJwt.paraAccion(...)` y `leerAccion(...)` | `seguridad/ServicioJwt.java` |
| La ruta `/t/**` abierta sin sesión | `ConfiguracionSeguridad.java` |
| Mailpit escuchando en `localhost:1025` | `docker-compose.yml` |

Falta escribir: la plantilla Thymeleaf del correo (tablas y estilos en línea,
porque es un correo), el servicio que lo envía, y el controlador
`GET /t/accion?token=…` que valida y aplica la transición.

**Las cuatro comprobaciones que tiene que pasar**, y que valen como prueba de la
fase:

1. Token válido → cambia el estado y muestra la página de confirmación.
2. **El mismo token otra vez → no hace nada** y dice que la acción ya se
   registró. (Es lo que aporta la tabla `accion_token`: un JWT solo, por bien
   firmado que esté, no se puede invalidar antes de que caduque.)
3. Token caducado, token manipulado y token de otra orden → **la misma página de
   error**, sin decir cuál de los tres fue.
4. Token de acción usado como token de sesión en la cabecera `Authorization` →
   no autentica. El claim `tipo` ya lo separa; hay que probarlo.

---

## 5. Lo que no se toca

- Nada que toque `.env`, producción o datos reales se delega a ningún agente.
- El correo sale **solo** a Mailpit mientras esto sea un prototipo.
- No parar `docentos_db` ni los contenedores de Supabase: son de otros proyectos.

---

## 6. Diseño: qué queda pendiente

- **Panel de la MYPE: elegido `gemini-3.8-flash-high`.** Qué quitarle y ponerle
  al portarlo está en [`disenio/ELEGIDAS.md`](./disenio/ELEGIDAS.md).
- **Portal del cliente: sin elegir.** Las dos maquetas están en
  `disenio/maquetas-portal/`. Las dos pasaron la auditoría (11/11 literales, 0
  datos inventados); 3.8 va por delante en `aria-` (52 contra 26) y en horas
  deshabilitadas de verdad (8 contra 5).
- La línea base del verificador es **0 hex y 0 clases de paleta Tailwind**: al
  portar, todo color pasa por los tokens `@theme` de `frontend/src/index.css` o
  `scripts/verificar-diseno.sh` se pone rojo.
