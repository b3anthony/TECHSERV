#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# juez.sh — el juez DETERMINISTA de TECHSERV. No llama a ningun modelo.
#
# Corre la bateria entera y escribe un informe en .agy-salida/. Devuelve 0 si
# todo lo bloqueante esta en verde, 1 si algo esta en rojo.
#
#   ./scripts/juez.sh [base-ref]
#
# Se corre solo, sin agente. El agente `verificador` lo lanza y ademas lee el
# diff para contestar lo que un script no puede: que cambio que nadie pidio.
# ---------------------------------------------------------------------------
set -uo pipefail   # sin -e: un paso en rojo no aborta los demas

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$RAIZ"
BASE="${1:-HEAD}"

mkdir -p .agy-salida
INFORME=".agy-salida/verificacion-$(date +%Y%m%d-%H%M%S).md"
CRUDO=".agy-salida/verificacion-$(date +%Y%m%d-%H%M%S).crudo.txt"
ROJOS=0

# Cada paso deja su salida entera en $CRUDO y solo una linea en la tabla. El
# informe se escribe incrementalmente: si esto muere a medias, lo ya medido
# esta en disco.
paso() {
  local etiqueta="$1" bloqueante="$2"; shift 2
  printf '\n===== %s =====\n$ %s\n' "$etiqueta" "$*" >> "$CRUDO"
  local salida estado
  salida="$("$@" 2>&1)"; estado=$?
  printf '%s\n(codigo de salida: %s)\n' "$salida" "$estado" >> "$CRUDO"

  local marca detalle
  if [ "$estado" -eq 0 ]; then marca="✓"; else
    marca="✗"
    [ "$bloqueante" = "si" ] && ROJOS=$((ROJOS + 1))
  fi
  detalle="$(printf '%s' "$salida" | grep -oE 'Tests run: [0-9]+, Failures: [0-9]+, Errors: [0-9]+, Skipped: [0-9]+' | tail -1)"
  [ -z "$detalle" ] && detalle="$(printf '%s' "$salida" | grep -iE 'error|✗|fail' | head -2 | tr '\n' ' ' | cut -c1-110)"
  [ -z "$detalle" ] && detalle="sin incidencias"
  printf '| %s | %s | %s |\n' "$etiqueta" "$marca" "${detalle//|/·}" >> "$INFORME"
  echo "  $marca $etiqueta"
}

en() { local d="$1"; shift; ( cd "$d" && "$@" ); }

RAMA="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '?')"
SHA="$(git rev-parse --short HEAD 2>/dev/null || echo '?')"
SUCIOS="$(git status --porcelain | wc -l | tr -d ' ')"

{
  echo "# Verificación — $(date '+%Y-%m-%d %H:%M:%S')"
  echo
  echo "rama: \`$RAMA\` · HEAD: \`$SHA\` · base de comparación: \`$BASE\` · archivos sin commitear: $SUCIOS"
  echo
  # Marca de incompleto desde el primer byte. Si esto muere a medias (sesion
  # matada, cuota, ctrl-c), el informe se queda con la marca puesta y se delata.
  # Medido el 19 sep 2026: un juez interrumpido dejo un informe con cabecera y
  # tabla vacia, indistinguible a simple vista de una pasada en verde.
  echo "## Veredicto"
  echo
  echo "**INCOMPLETO — el juez no llegó al final. No es un verde.**"
  echo
  echo "## Tabla"
  echo
  echo "| Paso | Resultado | Detalle |"
  echo "|---|---|---|"
} > "$INFORME"

echo "Juez de TECHSERV — informe en $INFORME"
echo

# --- 1. suite entera del backend ------------------------------------------
# NUNCA -Dtest=. Tres clases se pisaban por compartir base de datos el 19 sep
# 2026 y cada una pasaba sola: correr la clase tocada da falso verde.
paso "suite backend (entera)" si en backend mvn -q -B test

# `mvn -q` calla el recuento cuando todo va verde, y un "sin incidencias" a
# secas no se distingue de "no corrio ni una prueba". El recuento se saca de
# los informes de surefire, que estan ahi pase lo que pase.
recuento_surefire() {
  local d=backend/target/surefire-reports
  [ -d "$d" ] || { echo "sin informes de surefire — ¿corrio algo?"; return; }
  awk -F'[:,]' '/^Tests run:/ {t+=$2; f+=$4; e+=$6; s+=$8; c++}
       END {if (c) printf "%d pruebas en %d clases · fallos %d · errores %d · saltadas %d", t, c, f, e, s;
            else print "surefire no reporto ninguna clase"}' "$d"/*.txt 2>/dev/null
}
RESUMEN="$(recuento_surefire)"
python3 - "$INFORME" "$RESUMEN" <<'PYX'
import sys
ruta, resumen = sys.argv[1], sys.argv[2]
t = open(ruta).read()
# Solo se rellena si el paso quedo en verde: en rojo ya manda el detalle del fallo.
t = t.replace("| suite backend (entera) | ✓ | sin incidencias |",
              f"| suite backend (entera) | ✓ | {resumen} |", 1)
open(ruta, "w").write(t)
PYX
echo "     $RESUMEN"

# --- 2. tipos y build del frontend ----------------------------------------
# Son dos cosas distintas. `build` es `tsc -b && vite build`, y ya hubo una
# pantalla que compilaba perfectamente y salia en blanco.
paso "tsc --noEmit"    si en frontend npx tsc --noEmit
paso "npm run build"   si en frontend npm run build
paso "lint (oxlint)"   no en frontend npm run lint

# --- 3. diseno -------------------------------------------------------------
paso "verificar-diseno.sh" si ./scripts/verificar-diseno.sh "$BASE"

# --- 4. servicios (informativo) -------------------------------------------
paso "docker compose ps" no docker compose ps

# --- 5. lo que toco, y lo que huele ---------------------------------------
{
  echo
  echo "## Archivos tocados respecto a \`$BASE\`"
  echo '```'
  git diff --stat "$BASE" 2>/dev/null || echo '(sin diff contra la base)'
  git status --porcelain
  echo '```'
  echo
  # Las pruebas en rojo, por nombre. La tabla solo da el recuento, y "Failures: 2"
  # no dice cual: sin el nombre hay que abrir el crudo de 1.000 lineas a mano.
  ROJAS="$(grep -E '^\[ERROR\]   [A-Za-z].*:[0-9]+ ' "$CRUDO" | sed 's/^\[ERROR\]   //')"
  if [ -n "$ROJAS" ]; then
    echo "## Pruebas en rojo"
    echo '```'
    printf '%s\n' "$ROJAS"
    echo '```'
    echo
  fi
  echo "## Zonas sensibles tocadas"
  TOCADO="$(git diff --name-only "$BASE" 2>/dev/null; git status --porcelain | awk '{print $2}')"
  for patron in '\.env' 'db/migration' 'flyway' 'SecurityConfig' 'application.*\.(yml|yaml|properties)'; do
    coincide="$(printf '%s\n' "$TOCADO" | grep -E "$patron" | sort -u)"
    [ -n "$coincide" ] && { echo "- **$patron**:"; printf '%s\n' "$coincide" | sed 's/^/  - /'; }
  done
  echo "_(si esta vacío, ninguna)_"
  echo
  echo "## Salida cruda"
  echo
  echo "Está en \`$CRUDO\` — no se pega aquí para que el informe siga siendo legible."
} >> "$INFORME"

# --- veredicto -------------------------------------------------------------
if [ "$ROJOS" -eq 0 ]; then VEREDICTO="VERDE — los pasos bloqueantes pasaron"
else VEREDICTO="ROJO — $ROJOS paso(s) bloqueante(s) en rojo"; fi

python3 - "$INFORME" "$VEREDICTO" <<'PY'
import sys
ruta, veredicto = sys.argv[1], sys.argv[2]
t = open(ruta).read()
marca = "**INCOMPLETO — el juez no llegó al final. No es un verde.**"
if marca not in t:
    raise SystemExit("la marca de incompleto no esta: informe corrupto")
t = t.replace(marca, f"**{veredicto}**", 1)
open(ruta, "w").write(t)
PY

echo
echo "$VEREDICTO"
echo "informe: $INFORME"
echo "crudo:   $CRUDO"
[ "$ROJOS" -eq 0 ]
