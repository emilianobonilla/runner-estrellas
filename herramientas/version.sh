#!/bin/bash
# Publica una versión nueva del juego.
#
#   herramientas/version.sh 1.1.0 "Nombre de la versión"
#
# Qué hace:
#   1. Escribe el número, el nombre y la fecha de hoy en js/core/version.js
#      (que es lo que muestra el cartelito de abajo a la derecha del juego).
#   2. Hace el commit con ese cambio.
#   3. Crea la etiqueta (tag) vX.Y.Z, que es a donde apunta el cartelito.
#   4. Pregunta si querés subir todo a GitHub.
#
# Así, viendo el cartelito mientras probás, siempre podés abrir en GitHub el
# código exacto de esa versión.

set -e
cd "$(dirname "$0")/.."

NUM="$1"
NOMBRE="$2"
ARCHIVO="js/core/version.js"

if [ -z "$NUM" ]; then
  ACTUAL=$(grep -o "numero: '[^']*'" "$ARCHIVO" | cut -d"'" -f2)
  echo "Versión actual: v$ACTUAL"
  echo "Uso: herramientas/version.sh 1.1.0 \"Nombre de la versión\""
  exit 1
fi

if ! echo "$NUM" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+$'; then
  echo "✗ El número tiene que ser del estilo 1.2.0 (mayor.menor.arreglo)."
  exit 1
fi

if git rev-parse "v$NUM" >/dev/null 2>&1; then
  echo "✗ La etiqueta v$NUM ya existe. Usá un número más alto."
  exit 1
fi

# Si no le pasás nombre, se queda con el que ya tenía
if [ -z "$NOMBRE" ]; then
  NOMBRE=$(grep -o "nombre: '[^']*'" "$ARCHIVO" | cut -d"'" -f2)
fi
HOY=$(date +%F)

# 1. Actualizar js/core/version.js
sed -e "s/numero: '[^']*'/numero: '$NUM'/" \
    -e "s/nombre: '[^']*'/nombre: '$NOMBRE'/" \
    -e "s/fecha: '[^']*'/fecha: '$HOY'/" \
    "$ARCHIVO" > "$ARCHIVO.tmp" && mv "$ARCHIVO.tmp" "$ARCHIVO"
echo "✓ $ARCHIVO → v$NUM · $NOMBRE · $HOY"

# 2 y 3. Commit y etiqueta
git add "$ARCHIVO"
if git diff --cached --quiet; then
  # El archivo ya decía v$NUM (por ejemplo, porque lo editaste a mano):
  # no hay nada que commitear, se etiqueta el commit que ya está.
  echo "· $ARCHIVO ya estaba en v$NUM: se etiqueta el último commit."
else
  git commit -m "Versión $NUM — $NOMBRE"
fi
git tag -a "v$NUM" -m "Versión $NUM — $NOMBRE"
echo "✓ Commit y etiqueta v$NUM creados en la rama $(git rev-parse --abbrev-ref HEAD)"

# 4. Subir (opcional)
printf '¿Subir la versión a GitHub ahora? [s/N] '
read -r RTA
case "$RTA" in
  s|S|si|SI|Si)
    RAMA=$(git rev-parse --abbrev-ref HEAD)
    git push origin "$RAMA"
    git push origin "v$NUM"
    echo "✓ Subido. Enlace del cartelito:"
    echo "  https://github.com/emilianobonilla/runner-estrellas/releases/tag/v$NUM"
    ;;
  *)
    echo "No se subió nada. Cuando quieras:"
    echo "  git push origin $(git rev-parse --abbrev-ref HEAD) && git push origin v$NUM"
    ;;
esac
