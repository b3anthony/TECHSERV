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
antes() { git show "$BASE:$1" 2>/dev/null | grep -oE "$2" | wc -l | tr -d ' '; }

falla() {
  rojo "  ✗ $1"
  gris "      $2"
  FALLOS=$((FALLOS + 1))
}

# --- Patrones -------------------------------------------------------------
# `focus:` y `focus-visible:` son cadenas distintas: contar solo una de las dos
# convierte un cambio de convención en una falsa alarma. Se suman.
P_FOCO='focus:|focus-visible:'
P_HEX='#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b'
P_PROHIBIDO='text-\[9px\]|text-\[10px\]|font-black|font-extrabold|rounded-3xl'
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
mapfile -t ARCHIVOS < <(
  git diff --name-only --diff-filter=ACM "$BASE" -- '*.tsx' '*.jsx' '*.css' 2>/dev/null
  git diff --cached --name-only --diff-filter=ACM -- '*.tsx' '*.jsx' '*.css' 2>/dev/null
)
# dedup preservando orden
mapfile -t ARCHIVOS < <(printf '%s\n' "${ARCHIVOS[@]}" | awk 'NF && !seen[$0]++')

if [ "${#ARCHIVOS[@]}" -eq 0 ]; then
  gris "Sin archivos .tsx/.jsx/.css cambiados respecto a $BASE. Nada que comprobar."
  exit 0
fi

echo "Comparando ${#ARCHIVOS[@]} archivo(s) contra $BASE"
echo

# ¿Hay alguna declaración de movimiento reducido en TODO el proyecto?
HAY_REDUCED=$(git grep -l 'prefers-reduced-motion' -- '*.css' '*.tsx' '*.jsx' 2>/dev/null | wc -l | tr -d ' ')

for f in "${ARCHIVOS[@]}"; do
  [ -f "$f" ] || continue
  echo "── $f"

  # R1 · Foco: nunca puede bajar.
  a=$(antes "$f" "$P_FOCO"); b=$(ahora "$f" "$P_FOCO")
  if [ "$b" -lt "$a" ]; then
    falla "FOCO: $a → $b" "Se borraron $((a - b)) utilidades de foco. Regla §1.1: quien navega con teclado deja de ver dónde está."
  else
    gris "  ✓ foco $a → $b"
  fi

  # R2 · Color literal: no puede subir.
  a=$(antes "$f" "$P_HEX"); b=$(ahora "$f" "$P_HEX")
  if [ "$b" -gt "$a" ]; then
    falla "HEX: $a → $b" "Se añadieron $((b - a)) colores literales. Regla §1.2: usa los tokens del proyecto."
  else
    gris "  ✓ hex $a → $b"
  fi

  # R3 · Clases prohibidas: no pueden subir.
  a=$(antes "$f" "$P_PROHIBIDO"); b=$(ahora "$f" "$P_PROHIBIDO")
  if [ "$b" -gt "$a" ]; then
    falla "PROHIBIDO: $a → $b" "Reglas §1.4-§1.6: text-[9px], text-[10px], font-black, font-extrabold o rounded-3xl."
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
