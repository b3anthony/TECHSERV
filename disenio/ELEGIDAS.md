# Maquetas elegidas

| Pantalla | Brazo elegido | Cuándo | Quién eligió |
|---|---|---|---|
| Panel de la MYPE | `gemini-3.8-flash-high` | 15 set 2026 | el usuario |
| Portal del cliente | *pendiente* | — | — |

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
