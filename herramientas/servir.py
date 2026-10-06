#!/usr/bin/env python3
"""Servidor local para desarrollar, que NUNCA deja al navegador guardar archivos.

    python3 herramientas/servir.py [puerto]      (por defecto 8123)

Con `python3 -m http.server` el navegador guarda en caché los .js y .css
(index.html los pide con "?v=1.7.0", y esa versión solo cambia al hacer merge a
main), así que tras editar un archivo se seguía viendo el viejo. Este servidor
manda "Cache-Control: no-store" y siempre se ve lo último que guardaste.
En la versión publicada no hace falta: ahí la acción de GitHub cambia el "?v="
en cada merge.
"""
import functools
import http.server
import pathlib
import sys

RAIZ = pathlib.Path(__file__).resolve().parent.parent


class SinCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, max-age=0')
        super().end_headers()


if __name__ == '__main__':
    puerto = int(sys.argv[1]) if len(sys.argv) > 1 else 8123
    manejador = functools.partial(SinCache, directory=str(RAIZ))
    with http.server.ThreadingHTTPServer(('0.0.0.0', puerto), manejador) as s:
        print('Sirviendo %s en http://localhost:%d (sin caché)' % (RAIZ, puerto))
        s.serve_forever()
