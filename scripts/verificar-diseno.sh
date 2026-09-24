#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# verificar-diseno.sh — comprobación DETERMINISTA de .agents/rules/ (web)
#
# No opina. No llama a ningún modelo. Compara el estado actual contra una
# referencia y falla si algo EMPEORA. Exigir cero absoluto bloquearía cada commit en
# un proyecto que ya arrastra deuda, y un verificador que molesta se desactiva.
#
#   ./verificar-diseno.sh [base-ref]     # por defecto: HEAD
#   ln -s ../../scripts/verificar-diseno.sh .git/hooks/pre-commit
# ---------------------------------------------------------------------------
set -uo pipefail

BASE="${1:-HEAD}"
FALLOS=0

rojo()  { printf '\033[31m%s\033[0m\n' "$1"; }
verde() { printf '\033[32m%s\033[0m\n' "$1"; }
gris()  { printf '\033[90m%s\033[0m\n' "$1"; }

# Cuenta OCURRENCIAS (no líneas): grep -c contaría 3 usos en una línea como 1.
ahora() { grep -oE "$2" "$1" 2>/dev/null | wc -l | tr -d ' '; }
antes() { git show "$BASE:${ORIGEN[$1]:-$1}" 2>/dev/null | grep -oE "$2" | wc -l | tr -d ' '; }

# Hex SIN contar las declaraciones de token (`--color-x: #abc;`). Declarar un
# token es justo lo que la regla §1.2 pide ("si falta un token, créalo"); hasta
# el 24 sep 2026 cada token nuevo salía como HEX en rojo (3 de 3 rojos falsos en
# TECHSERV) y había que leer el diff para descartarlo. Un hex fuera de una
# declaración `--x:` sigue contando igual.
sin_tokens() { grep -vE '^[[:space:]]*--[A-Za-z0-9_-]+[[:space:]]*:'; }
ahora_hex() { sin_tokens < "$1" 2>/dev/null | grep -oE "$P_HEX" | wc -l | tr -d ' '; }
antes_hex() { git show "$BASE:${ORIGEN[$1]:-$1}" 2>/dev/null | sin_tokens | grep -oE "$P_HEX" | wc -l | tr -d ' '; }

falla() {
  rojo "  ✗ $1"
  gris "      $2"
  FALLOS=$((FALLOS + 1))
}

# --- Patrones -------------------------------------------------------------
# `focus:` y `focus-visible:` son cadenas distintas: contar solo una de las dos
# convierte un cambio de convención en una falsa alarma. Se suman.
P_FOCO='focus:|focus-visible:'
# Y los USOS de constantes de foco (`${focoClaro}`, `{focoOscuro}`): si las
# clases viven en una constante, quitar un uso no cambia ningún `focus:` y el
# foco se perdía sin rojo (sembrado el 24 sep 2026 en TECHSERV: pasó en verde).
# La convención de nombre se puede cambiar en .agents/umbrales.env (FOCO_CONST_WEB).
P_FOCO_CONST='\{foco[A-Z][A-Za-z0-9]*\}'
if [ -f .agents/umbrales.env ]; then
  fc=$(sed -n 's/^FOCO_CONST_WEB=//p' .agents/umbrales.env | head -1 | sed "s/^['\"]//; s/['\"]\$//")
  [ -n "$fc" ] && P_FOCO_CONST="$fc"
fi
P_FOCO="$P_FOCO|$P_FOCO_CONST"
P_HEX='#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b'
# Las clases prohibidas se MIDEN en cada proyecto (agy-instalar.sh escribe
# PROHIBIDO_WEB en .agents/umbrales.env: tamaños por debajo del suelo que ya
# usa, pesos y radios por encima del máximo que ya usa). Un restaurante no
# hereda la tipografía de otro. El valor fijo de abajo es solo el respaldo para
# repos instalados antes del 23 sep 2026, y el informe dice cuál se usó.
P_PROHIBIDO='text-\[9px\]|text-\[10px\]|font-black|font-extrabold|rounded-3xl'
ORIGEN_PROHIBIDO="por defecto del kit (no hay PROHIBIDO_WEB en .agents/umbrales.env)"
if [ -f .agents/umbrales.env ]; then
  medido=$(sed -n 's/^PROHIBIDO_WEB=//p' .agents/umbrales.env | head -1 | sed "s/^['\"]//; s/['\"]\$//")
  [ -n "$medido" ] && { P_PROHIBIDO="$medido"; ORIGEN_PROHIBIDO="medido (.agents/umbrales.env)"; }
fi
P_ANIMA='@keyframes|animation:'
# Color de la paleta por defecto de Tailwind: pasa el filtro de hex pero NO es un
# token del proyecto. Detectado el 12 sep 2026: un modelo usó `ring-cyan-500`,
# que hoy coincide con --brand-cyan (#06b6d4) por pura casualidad. El día que
# cambie el cian de marca, ese anillo no lo sigue y nadie se entera.
P_PALETA='(text|bg|border|ring|ring-offset|from|via|to|decoration|outline|divide|placeholder|accent|caret)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|[1-9]00|950)|(ring-offset|ring)-(black|white)'

# --- Archivos cambiados ---------------------------------------------------
# Nunca se mete la lista en una variable: la shell de este entorno es zsh, que
# no divide en palabras las expansiones sin comillas, así que `grep x $LISTA`
# buscaría en un único fichero inexistente y devolvería 0 en silencio.
#
# RENOMBRADOS INCLUIDOS (R). Hasta el 23 sep 2026 el filtro era ACM: un brazo
# que movía un componente y de paso le metía un hex, text-[9px] y bg-cyan-500
# recibía "Nada que comprobar", exit 0. Para un renombrado se compara contra el
# nombre VIEJO en la base; si no, todo lo que ya tenía contaría como nuevo.
EXTS_UI=('*.tsx' '*.jsx' '*.css' '*.scss' '*.svelte' '*.vue' '*.astro' '*.html')
declare -A ORIGEN=()
ARCHIVOS=()
while IFS=$'\t' read -r estado uno dos; do
  [ -n "${estado:-}" ] || continue
  case "$estado" in
    R*) ARCHIVOS+=("$dos"); ORIGEN["$dos"]="$uno" ;;
    *)  ARCHIVOS+=("$uno") ;;
  esac
done < <(
  git diff --name-status -M --diff-filter=ACMR "$BASE" -- "${EXTS_UI[@]}" 2>/dev/null
  git diff --cached --name-status -M --diff-filter=ACMR "$BASE" -- "${EXTS_UI[@]}" 2>/dev/null
  # Los archivos nuevos SIN `git add` no salen en ningún git diff: un
  # componente recién creado se saltaba todas las reglas.
  git ls-files --others --exclude-standard -- "${EXTS_UI[@]}" 2>/dev/null | sed 's/^/A\t/'
)
# dedup preservando orden
mapfile -t ARCHIVOS < <(printf '%s\n' ${ARCHIVOS+"${ARCHIVOS[@]}"} | awk 'NF && !seen[$0]++')

if [ "${#ARCHIVOS[@]}" -eq 0 ]; then
  gris "Sin archivos de interfaz (${EXTS_UI[*]}) cambiados respecto a $BASE. Nada que comprobar."
  exit 0
fi

echo "Comparando ${#ARCHIVOS[@]} archivo(s) contra $BASE"
gris "clases prohibidas: $ORIGEN_PROHIBIDO"
echo

# R1 · Foco, en TOTAL del proyecto. Por archivo daba rojo falso en cada
# refactor: sacar la cabecera a su componente baja el foco de App.tsx y lo sube
# en Cabecera.tsx (medido el 24 sep 2026 en TECHSERV: 37→22 y 15→0 en rojo con
# el total intacto, 322 → 322). Manda el total; la bajada por archivo se enseña
# en amarillo para mirarla a ojo, porque el total no ve un foco que se pierde en
# un sitio mientras se añade otro en otro.
foco_total_antes() { git grep -ohE "$P_FOCO" "$BASE" -- "${EXTS_UI[@]}" 2>/dev/null | wc -l | tr -d ' '; }
foco_total_ahora() {
  { git ls-files -- "${EXTS_UI[@]}"; git ls-files --others --exclude-standard -- "${EXTS_UI[@]}"; } 2>/dev/null |
    while IFS= read -r f; do [ -f "$f" ] && grep -ohE "$P_FOCO" "$f"; done | wc -l | tr -d ' '
}
FOCO_BAJA_LOCAL=0

# ¿Hay alguna declaración de movimiento reducido en TODO el proyecto?
HAY_REDUCED=$(git grep -l 'prefers-reduced-motion' -- "${EXTS_UI[@]}" 2>/dev/null | wc -l | tr -d ' ')

for f in "${ARCHIVOS[@]}"; do
  [ -f "$f" ] || continue
  if [ -n "${ORIGEN[$f]:-}" ]; then echo "── $f  (renombrado desde ${ORIGEN[$f]})"; else echo "── $f"; fi

  # R1 · Foco: aquí solo se enseña; el veredicto es el total (abajo).
  a=$(antes "$f" "$P_FOCO"); b=$(ahora "$f" "$P_FOCO")
  if [ "$b" -lt "$a" ]; then
    printf '\033[33m  ! foco %s → %s en este archivo (manda el total del proyecto)\033[0m\n' "$a" "$b"
    FOCO_BAJA_LOCAL=1
  else
    gris "  ✓ foco $a → $b"
  fi

  # R2 · Color literal: no puede subir.
  a=$(antes_hex "$f"); b=$(ahora_hex "$f")
  if [ "$b" -gt "$a" ]; then
    falla "HEX: $a → $b" "Se añadieron $((b - a)) colores literales. Regla §1.2: usa los tokens del proyecto."
  else
    gris "  ✓ hex $a → $b"
  fi

  # R3 · Clases prohibidas: no pueden subir.
  a=$(antes "$f" "$P_PROHIBIDO"); b=$(ahora "$f" "$P_PROHIBIDO")
  if [ "$b" -gt "$a" ]; then
    falla "PROHIBIDO: $a → $b" "Reglas §1.4-§1.6: tamaño por debajo del suelo, o peso/radio por encima del máximo del proyecto. Patrón: $P_PROHIBIDO"
  else
    gris "  ✓ prohibidos $a → $b"
  fi

  # R5 · Color de la paleta de Tailwind: no puede subir.
  a=$(antes "$f" "$P_PALETA"); b=$(ahora "$f" "$P_PALETA")
  if [ "$b" -gt "$a" ]; then
    falla "PALETA TAILWIND: $a → $b" "Se añadieron $((b - a)) colores de la paleta por defecto (cyan-500, black...). Regla §1.3: usa los tokens del proyecto, no los de Tailwind."
  else
    gris "  ✓ paleta tailwind $a → $b"
  fi

  # R4 · Animación sin escape: si este archivo anima, el proyecto debe declarar
  # prefers-reduced-motion en alguna parte.
  anim=$(ahora "$f" "$P_ANIMA")
  if [ "$anim" -gt 0 ] && [ "$HAY_REDUCED" -eq 0 ]; then
    falla "MOVIMIENTO: $anim animación(es), 0 prefers-reduced-motion en el proyecto" \
          "Regla §2: ningún generador lo pone por su cuenta. Solo aparece si la regla lo exige."
  elif [ "$anim" -gt 0 ]; then
    gris "  ✓ movimiento: $anim animación(es), con prefers-reduced-motion declarado"
  fi
done

echo
FA=$(foco_total_antes); FB=$(foco_total_ahora)
if [ "$FB" -lt "$FA" ]; then
  falla "FOCO TOTAL: $FA → $FB" "Se borraron $((FA - FB)) utilidades de foco en el proyecto. Regla §1.1: quien navega con teclado deja de ver dónde está."
elif [ "$FOCO_BAJA_LOCAL" -eq 1 ]; then
  gris "  ✓ foco total $FA → $FB: lo que bajó en un archivo se movió a otro. Mira a ojo que el control siga teniéndolo."
else
  gris "  ✓ foco total $FA → $FB"
fi

if [ "$FALLOS" -gt 0 ]; then
  rojo "FALLA: $FALLOS violación(es) de .agents/rules/"
  gris "Ninguna de estas comprobaciones opina ni llama a un modelo."
  gris "Lo que NO cubre: bugs de lógica. Para eso hacen falta tests."
  exit 1
fi

verde "OK: ninguna regla empeoró respecto a $BASE"
N_TESTS=$(git ls-files "*.test.*" "*.spec.*" "**/__tests__/**" 2>/dev/null | wc -l | tr -d " ")
if [ "$N_TESTS" -eq 0 ]; then
  gris "Recuerda: esto no valida la lógica, y este proyecto tiene 0 archivos de test."
else
  gris "Recuerda: esto no valida la lógica. Ejecuta los archivos de test del proyecto ($N_TESTS)."
fi
exit 0
