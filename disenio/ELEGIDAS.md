# Maquetas elegidas

| Pantalla | Brazo elegido | Cuándo | Quién eligió |
|---|---|---|---|
| Panel de la MYPE | `gemini-3.8-flash-high` | 15 set 2026 | el usuario |
| Portal del cliente | **Orca** (brazo de agy, rehecho desde cero) | 19 set 2026 | el usuario |

## Panel de la MYPE — qué hay que quitarle y ponerle al portarlo

Auditado en disco, no por el informe del brazo. Lo que trae, medido:

- 79.676 B · 13/13 literales del brief · **0 datos inventados** · 0 gradientes ·
  0 emoji · 105 atributos `aria-` · `prefers-reduced-motion` presente.
- Resuelve la asignación con `<dialog>` nativo (22 apariciones), así que el
  cierre con Escape y el foco atrapado vienen del navegador.

Al portarlo a componentes React (Fase 9):

- **Los datos salen de la API**, no del HTML. Las cinco órdenes de la maqueta
  existen en la semilla con esos mismos códigos: `ORD-0142` … `ORD-0135`.
- **Nada de hex sueltos.** Todo color pasa por los tokens `@theme` de
  `frontend/src/index.css`. La línea base del verificador es 0 hex y 0 clases de
  paleta Tailwind: cualquiera que entre es rojo.
- Los cuatro indicadores de arriba (6 pendientes, 3 asignadas, 2 en camino,
  11 completadas hoy) se calculan con `contarPorEstado` y `completadasHoy`.

---

## Portal del cliente — por qué Orca y no las dos maquetas anteriores

El 15 set quedaron dos candidatas (`gemini-3.8-flash-high` y `gemini-3.7-flash-high`)
y la decisión se quedó abierta. El 19 set el usuario pidió una tercera hecha por
Orca, que es el único brazo que **se mira**: lanza chromium headless, se hace
capturas y corrige lo que ve.

Lo que entregó, medido en disco y no por su informe:

- `disenio/maquetas-portal/orca/index.html`, 53.057 B, autocontenido.
- **17 capturas** en `capturas/`, ocho de ellas de **foco de teclado**. El
  `index.html` está fechado *antes* de la segunda tanda de capturas: primero se
  miró, luego arregló, luego volvió a capturar.
- **0 datos inventados**: los tres talleres, sus notas (4.8 / 4.6 / 4.4), sus
  precios (S/ 60 / 55 / 45) y sus direcciones son los literales del brief. Los
  únicos `%` del archivo son CSS.
- 60 atributos `aria-`, 6 reglas `:focus-visible`, 1 bloque
  `prefers-reduced-motion`, y la franja de las 11:00 con `disabled` **y**
  `aria-disabled`, no solo pintada de gris.
- Dijo por escrito lo que **no** pudo comprobar: un lector de pantalla real y el
  arrastre de archivos desde el escritorio. Eso vale más que un informe sin
  reservas.

Al portarlo (Fase 9) valen las mismas reglas que para el panel: los datos salen
de la API y **todo color pasa por los tokens `@theme`**, o el verificador se
pone rojo.
