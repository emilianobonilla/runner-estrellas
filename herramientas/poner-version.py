#!/usr/bin/env python3
"""Escribe la versión del juego en los archivos.

    herramientas/poner-version.py 1.2.0 "Nombre de la versión" abc1234

Normalmente NO hace falta correrlo a mano: lo usa la acción de GitHub
(.github/workflows/version.yml) cada vez que se hace un merge a main.

Qué toca:
  1. js/core/version.js: número, nombre, fecha de hoy y commit.
  2. index.html: le agrega "?v=1.2.0" a cada .js y .css propio, para que el
     navegador no se quede con archivos viejos guardados en caché después de
     publicar una versión nueva.
"""
import datetime
import pathlib
import re
import sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent

if len(sys.argv) < 2 or not re.fullmatch(r"\d+\.\d+\.\d+", sys.argv[1]):
    sys.exit('Uso: herramientas/poner-version.py 1.2.0 "Nombre" [commit]')

numero = sys.argv[1]
# Comillas simples → tipográficas y sin barras invertidas: así no rompen el
# string de JavaScript
nombre = sys.argv[2] if len(sys.argv) > 2 else ""
nombre = re.sub(r"[\\\n\r]", "", nombre.replace("'", "’"))[:60]
commit = re.sub(r"[^0-9a-f]", "", sys.argv[3] if len(sys.argv) > 3 else "")[:7]
hoy = datetime.date.today().isoformat()


def campo(texto, clave, valor):
    return re.sub(r"(%s: )'[^']*'" % clave, lambda m: m.group(1) + "'" + valor + "'", texto, count=1)


archivo = RAIZ / "js/core/version.js"
js = archivo.read_text(encoding="utf-8")
for clave, valor in (("numero", numero), ("nombre", nombre), ("fecha", hoy), ("commit", commit)):
    js = campo(js, clave, valor)
archivo.write_text(js, encoding="utf-8")

archivo = RAIZ / "index.html"
html = archivo.read_text(encoding="utf-8")
html = re.sub(r'((?:src|href)="(?:js|data|css)/[^"?]+\.(?:js|css))(?:\?v=[^"]*)?"',
              lambda m: m.group(1) + '?v=' + numero + '"', html)
archivo.write_text(html, encoding="utf-8")

print("✓ v%s · %s · %s · %s" % (numero, nombre, hoy, commit or "sin commit"))
