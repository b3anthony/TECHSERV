#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# verificar.sh — lanza el subagente `verificador` en segundo plano.
#
# No gasta tu sesión interactiva: devuelve un id y sigue solo. El informe
# aparece en .agy-salida/verificacion-<fecha>.md
#
#   ./scripts/verificar.sh                  # verifica el estado actual
#   ./scripts/verificar.sh "fase 12, solo debia tocar FacturaService"
#   ./scripts/verificar.sh -f               # en primer plano, para depurar
#   ./scripts/verificar.sh --seguir         # tail del informe segun se escribe
#   ./scripts/verificar.sh --ultimo         # imprime el ultimo informe entero
#
# Seguir el resultado:
#   claude agents          lista las sesiones vivas
#   claude logs <id>       imprime su salida
#   claude attach <id>     la abre en esta terminal
#   claude stop <id>       la detiene (la conversacion se conserva)
# ---------------------------------------------------------------------------
set -euo pipefail

RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$RAIZ"

PRIMER_PLANO=0
if [ "${1:-}" = "-f" ]; then PRIMER_PLANO=1; shift; fi

# Sigue el informe segun se escribe. `claude logs` NO sirve para esto: reproduce
# la interfaz de terminal entera redibujandose, no un log por lineas. El canal
# de avance real es el archivo en disco, que el agente escribe incrementalmente.
if [ "${1:-}" = "--seguir" ]; then
  ULTIMO=$(ls -t .agy-salida/verificacion-*.md 2>/dev/null | head -1)
  [ -n "$ULTIMO" ] || { echo "todavia no hay informe; el agente aun esta arrancando" >&2; exit 1; }
  echo "siguiendo $ULTIMO  (ctrl-c para salir)" >&2
  exec tail -f "$ULTIMO"
fi

# Imprime el ultimo informe completo y sale.
if [ "${1:-}" = "--ultimo" ]; then
  ULTIMO=$(ls -t .agy-salida/verificacion-*.md 2>/dev/null | head -1)
  [ -n "$ULTIMO" ] || { echo "no hay ningun informe todavia" >&2; exit 1; }
  echo "== $ULTIMO ==" >&2
  exec cat "$ULTIMO"
fi

CONTEXTO="${1:-}"
ENCARGO="Verifica el estado actual del repositorio siguiendo tus pasos, del 1 al 7, sin saltarte ninguno."
if [ -n "$CONTEXTO" ]; then
  ENCARGO="$ENCARGO

Contexto de lo que se esperaba de este cambio (usalo para el paso 1, 'cambios que nadie pidio'):
$CONTEXTO"
fi

# Permisos por DENEGACION, no por lista blanca.
#
# Medido el 19 sep 2026: con una lista blanca estrecha y --permission-mode
# dontAsk, todo comando compuesto (`X && Y >> archivo`) dejaba de calzar con
# los patrones y se denegaba EN SILENCIO. El agente estuvo trabajando sin
# escribir nada y sin decirlo. Indistinguible de estar pensando: el mismo
# fallo que la cuota de Claude colgada.
#
# Asi que se invierte: Bash abierto, y lo peligroso denegado por nombre. Lo
# que no debe poder hacer no depende de adivinar la forma del comando.
#
# Hacen falta LAS DOS listas. `dontAsk` deniega lo que no este permitido, asi
# que solo con vetos el agente arranca sin Bash y se para en seco. Los vetos
# tienen prioridad sobre los permisos, que es lo que hace segura la pareja.
PERMITIDO=("Bash" "Read" "Grep" "Glob")

VETADO=(
  "Edit" "Write" "NotebookEdit" "WebFetch" "WebSearch"
  "Read(./.env)" "Read(//home/b3/Escritorio/TECHSERV/.env)"
  "Bash(git add:*)" "Bash(git commit:*)" "Bash(git checkout:*)"
  "Bash(git reset:*)" "Bash(git stash:*)" "Bash(git push:*)"
  "Bash(git rebase:*)" "Bash(git merge:*)" "Bash(git clean:*)"
  "Bash(docker compose up:*)" "Bash(docker compose down:*)"
  "Bash(docker compose restart:*)" "Bash(docker rm:*)"
  "Bash(npm install:*)" "Bash(npm ci:*)" "Bash(pnpm install:*)"
  "Bash(cat .env)" "Bash(cat ./.env)"
  "Bash(rm:*)" "Bash(mv:*)"
)

# --effort low a proposito: este agente corre un script y lee su salida, no
# razona. Con el efecto heredado corria en "high" y se comia el cubo de 5 h
# para decidir si un `mvn test` salio en verde.
ARGS=(
  --agent verificador
  --effort low
  --permission-mode dontAsk
  --allowedTools "${PERMITIDO[@]}"
  --disallowedTools "${VETADO[@]}"
  --name "verificador-$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo suelto)"
)

if [ "$PRIMER_PLANO" -eq 1 ]; then
  exec claude "${ARGS[@]}" "$ENCARGO"
fi

echo "Lanzando el verificador en segundo plano sobre $RAIZ"
claude --bg "${ARGS[@]}" "$ENCARGO"
echo
echo "Sigue el avance con:  claude agents     |    claude logs <id>"
echo "El informe caera en:  .agy-salida/verificacion-<fecha>.md"
