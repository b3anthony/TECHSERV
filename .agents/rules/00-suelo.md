# Suelo — TECHSERV

Esto **no es cuestión de gusto y no depende del proyecto**. Vale igual para un
panel financiero, una web de restaurante o una app de escritorio. Se carga sola
en cada tarea: no hace falta repetirla en el brief. Si el brief la contradice,
**gana esta regla** y lo dices en el informe.

Las reglas de estilo —colores, tipografía, radios— **no están aquí**. Están en
`10-estilo.md`, medidas de este proyecto, y esas sí cambian de un proyecto a otro.

## 1. Foco visible

Todo elemento con el que se pueda interactuar (botón, enlace, campo, selector)
tiene que verse cuando recibe el foco de teclado. **Si rediseñas algo que ya lo
tenía, el nuevo también lo lleva.** Nunca se borra un estilo de foco.

Hay quien no usa ratón. Sin foco visible, no sabe dónde está.

## 2. Movimiento reducido

Si añades animaciones, gradientes animados, brillos o transiciones de entrada,
**declara la variante de movimiento reducido y anúlalas ahí**
(`@media (prefers-reduced-motion: reduce)` en web; la preferencia del sistema en
escritorio). No es opcional y no es cosmético: hay quien no puede mirar una
pantalla que se mueve.

> Medido el 12 sep 2026 sobre 5 maquetas de la misma pantalla: los 3 diseños
> mejor puntuados tenían **0** reglas de movimiento reducido, con shimmer,
> spotlight y ecualizadores animados. Ningún generador lo pone por su cuenta.
> Solo aparece si la regla lo exige.

## 3. Accesibilidad mínima

- Todo campo tiene su etiqueta asociada, no solo un texto al lado.
- Los mensajes de error se anuncian, no solo se pintan de rojo.
- Los iconos decorativos se ocultan a los lectores de pantalla.
- El texto que solo existe para lectores de pantalla no ocupa sitio en la vista.

## 4. No toques la lógica

Estado, efectos, consultas, manejadores, props, tipos e imports quedan
**idénticos**. Solo cambia la presentación. Si crees que la lógica necesita
cambiar, **para y dilo**. No lo arregles de paso.

## 5. Alcance

Toca **solo** los archivos que el brief nombra. No renombres archivos, no muevas
componentes, no añadas dependencias, no crees archivos nuevos salvo que se pida.

## 6. No inventes datos

Nada de porcentajes, latencias, cifras de usuarios, versiones, testimonios,
premios ni pasos de un flujo que no conoces. Si no está en el brief y no está en
el código, **no existe**.

> Medido el 12 sep 2026: de 5 maquetas, **2 inventaron datos** con total aplomo
> —una llegó a afirmar que la sesión iba cifrada—. En el mismo experimento, con
> un verificador en el repo que los modelos sabían que se iba a ejecutar,
> inventaron **0 de 3**. La diferencia no fue el modelo: fue saber que alguien
> comprueba.

## 7. Copy en español con tildes

"postulación", "evaluación", "más", "información", "aquí". El copy del brief
puede venir mal escrito: corrígelo, no lo copies literal.

## 8. Antes de decir que terminaste

No informes de éxito sin haber ejecutado esto **y pegado la salida literal**:

```bash
./scripts/verificar-diseno.sh HEAD
git diff --stat
```

Más lo que el proyecto tenga para compilar y para pasar sus tests. Si el
verificador sale con **exit 1, no has terminado**.

Y debajo, una lista explícita de **lo que cambiaste y nadie te pidió**.

> Escribe las rutas **literales**. Nunca metas la lista de archivos en una
> variable: la shell no divide en palabras las expansiones sin comillas, así que
> `grep x $ARCHIVOS` busca en un único fichero inexistente y devuelve **0
> coincidencias en silencio** — que se lee como "cumple".
> Un verificador roto es peor que no verificar.
