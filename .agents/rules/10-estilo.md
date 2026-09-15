# Estilo — TECHSERV (web)

**Estas reglas son de este proyecto, no universales.** Salen de medirlo el
2026-09-15, no de una preferencia. Otro proyecto tendrá otros números, y cambiarlos
aquí es una decisión de producto perfectamente legítima: lo que no vale es
saltárselas en una tarea suelta.

El suelo que sí vale para todo está en `00-suelo.md`.

## 1. Color

- **Prohibido el color literal.** Nada de `#rrggbb`, `rgb()` ni `hsl()` en los
  componentes. Usa los tokens de **(no encontrado — hay que crear el bloque de tokens)**.
- **Prohibida también la paleta por defecto de Tailwind** (`ring-cyan-500`,
  `bg-slate-900`, `ring-offset-black`…). Pasa el filtro de hex y aun así no es un
  token: hoy coincide de color por casualidad y el día que cambie la marca, no la
  sigue.
- **Si falta un token, pídelo. No lo inventes en hexadecimal.**

Hoy: **0** hex literales y **0** usos de la paleta de Tailwind.
Ninguno de los dos puede subir.

## 2. Tipografía

- **Suelo `text-xs`.** Nada más pequeño que lo que ya se usa.
- **Peso máximo `font-bold`.**
- Respeta la jerarquía: si un texto era mayor que otro, lo sigue siendo.

## 3. Forma

- **Radio máximo `rounded-2xl`.**

## 4. Patrón de foco de este proyecto

Convención: **`focus:`** (0 usos de `focus:`,
0 de `focus-visible:`). Usa esa, no la otra.

```
focus:outline-none focus:ring-2 focus:ring-<token-acento>
focus:ring-offset-2 focus:ring-offset-<token-fondo>
```

El `ring-offset` es obligatorio cuando el anillo y el fondo del elemento comparten
color: sin él, el foco es invisible justo en el botón primario.

Cuenta `motion.button` como focalizable. `grep '<button'` no lo ve.

## 5. Cómo tocar el estilo

Cambia `className` y marcado de presentación. Nada más. Lo demás, en `00-suelo.md`.
