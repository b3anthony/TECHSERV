---
name: "rediseno_pantalla"
description: "Rediseña una pantalla de TECHSERV aplicando los tokens del proyecto, sin tocar la lógica y verificando en disco antes de informar. Úsala cuando se pida rediseñar, retocar o migrar a tokens cualquier componente de src/."
metadata:
  version: "2.0"
  delegate_only: true
---

## Confirma tu rol antes de actuar

- Si eres el subagente al que se le asignó esta pantalla: **sigue leyendo y hazlo tú**.
  No delegues. No cargues otras skills.
- Si cargaste esta skill como orquestador: **para aquí** y delega la pantalla a un
  subagente dedicado, pasándole los datos de la sección "Qué recibes".

## Qué recibes

Antes de empezar debes tener estas cuatro cosas. **Si falta alguna, para y pídela**
en vez de suponerla:

1. **La ruta exacta** del archivo a rediseñar.
2. **La dirección visual** (paleta o pantalla de referencia).
3. **Los tokens disponibles** del proyecto (bloque `@theme`, variables CSS o tema).
4. **La rama base** contra la que se mide la regresión (normalmente `HEAD`).

## Qué NO recibes, y aun así se te exige

`.agents/rules/00-suelo.md` y `.agents/rules/10-estilo.md` ya están cargadas. **No
las repitas, aplícalas.** La primera es el suelo que vale para cualquier proyecto
—foco, movimiento reducido, no tocar lógica, no inventar datos—; la segunda son
los colores, la tipografía y los radios **de este proyecto en concreto**. El brief
puede no mencionarlas: da igual, se te exigen.

Esta es la lección cara: un agente optimiza exactamente la métrica que le das y
degrada en silencio todo lo que no mencionaste.

## 1. Línea base — antes de escribir nada

Lee el archivo entero. No edites a ciegas. Después **anota estos números**, porque
son contra los que te van a medir:

```bash
grep -oE 'focus:|focus-visible:' <ruta> | wc -l
grep -oE '#[0-9a-fA-F]{6}\b' <ruta> | wc -l
grep -coE 'useState|useEffect|fetch\(' <ruta>
```

Lee también el archivo de tokens del proyecto. **Si el token que necesitas no existe,
para y pídelo.** No escribas el hexadecimal "solo por esta vez": así es como un
proyecto medido pasó de 71 a 226 colores literales en una sola tarea.

## 2. Al rediseñar

- Cambia `className` y marcado de presentación. Nada más.
- Cada elemento focalizable sale con anillo de foco:

```
focus:outline-none focus:ring-2 focus:ring-<token-acento>
focus:ring-offset-2 focus:ring-offset-<token-fondo>
```

- El `ring-offset` es obligatorio cuando el anillo y el fondo del elemento comparten
  color: sin él, el foco es invisible justo en el botón primario.
- Cuenta `motion.button` como focalizable. `grep '<button'` no lo ve.
- Respeta la jerarquía: si un texto era mayor que otro, lo sigue siendo.

## 3. Verificación — en disco, no de memoria

Hay un comprobador determinista en el repo. **Ejecútalo y pega su salida literal:**

```bash
./scripts/verificar-diseno.sh HEAD
npx tsc --noEmit && npm run build
git diff --stat
```

`verificar-diseno.sh` no opina y no llama a ningún modelo: compara contra la base y
falla si el foco baja, si suben los hex, si suben las clases prohibidas, o si añades
animación sin `prefers-reduced-motion`. **Si sale exit 1, no has terminado.**

### Trampas que ya han costado tiempo

| Trampa | Qué pasa |
|---|---|
| **Lista de archivos en una variable** | La shell es **zsh**: no divide en palabras las expansiones sin comillas. `grep x $ARCHIVOS` busca en un fichero inexistente y devuelve **0 en silencio**, que se lee como "cumple". Rutas **literales**. |
| **`focus-visible:` no lo cuenta `grep 'focus:'`** | Son cadenas distintas. Cuenta las dos. |
| **`grep '<button'` no ve `motion.button`** | Pasó hoy: dio 0 focalizables donde había 2. |
| **`$?` después de un `echo`** | Lee el `echo`, no el comando. Guarda el código de salida en una variable **en la misma línea**. |
| **Informar sin comprobar** | Ya ha pasado: "archivo creado con éxito" sin que existiera el archivo. |
| **`git diff --stat` vacío** | No escribiste donde creías. Comprueba la ruta antes de informar. |

## 4. Qué informar

Una tabla, no un párrafo:

| | Antes | Después |
|---|---|---|
| foco (`focus:` + `focus-visible:`) | | |
| hex literales | | |
| `useState`/`useEffect`/`fetch` | | |
| `verificar-diseno.sh` | — | exit 0 / exit 1 |
| `tsc` / `build` | | |

Y debajo, una lista explícita de **lo que cambiaste y nadie te pidió**.

**No inventes datos.** Nada de porcentajes, latencias, versiones de motor ni pasos
de un flujo que no conoces. Medido hoy sobre 5 maquetas: las dos que inventaron
cifras las inventaron con aplomo, y una afirmaba que la sesión iba cifrada. Si este
producto tiene obligaciones legales (consentimiento, privacidad), un dato
inventado no es un detalle estético. Si no está en el brief y no está en el
código, no existe.
