/* Versión del juego.
   Este es el ÚNICO lugar donde se toca el número de versión: lo muestran el
   cartelito de abajo a la derecha y la pantalla "Cómo jugar", así al probar
   siempre se sabe qué versión se está jugando (la local o la de la web).

   Para publicar una versión nueva:
       herramientas/version.sh 1.1.0 "Nombre de la versión"
   ese script actualiza este archivo, hace el commit y crea la etiqueta
   (tag) en GitHub, que es a donde apunta el cartelito. */
(function (R) {
  R.VERSION = {
    numero: '1.0.0',              // se sube a mano o con herramientas/version.sh
    nombre: 'Cinco Mundos',       // apodo de la versión, para acordarse de qué trae
    fecha: '2026-09-21',          // día en que se publicó
    repo: 'https://github.com/emilianobonilla/runner-estrellas'
  };

  /* "v1.0.0" — lo corto, para el cartelito */
  R.versionCorta = function () { return 'v' + R.VERSION.numero; };

  /* "v1.0.0 · Cinco Mundos · 21/09/2026" — lo largo, para las pantallas */
  R.versionTexto = function () {
    var p = R.VERSION.fecha.split('-');   // 2026-09-21 -> 21/09/2026
    return R.versionCorta() +
      (R.VERSION.nombre ? ' · ' + R.VERSION.nombre : '') +
      (p.length === 3 ? ' · ' + p[2] + '/' + p[1] + '/' + p[0] : '');
  };

  /* Enlace al código exacto de esta versión en GitHub (la etiqueta que crea
     herramientas/version.sh). Si la etiqueta todavía no se publicó, GitHub
     muestra un 404: quiere decir que estás jugando una versión sin publicar. */
  R.versionURL = function () { return R.VERSION.repo + '/releases/tag/v' + R.VERSION.numero; };
})(window.RUNNER);
