/* Versión del juego.
   NO se toca a mano: cada vez que se hace un merge a main, la acción de GitHub
   (.github/workflows/version.yml) sube el número, pone el título del PR como
   nombre, la fecha y el commit, y crea la etiqueta vX.Y.Z en GitHub.

   Lo muestran el cartelito de abajo a la derecha, la pantalla "Cómo jugar" y
   la sala de la carrera (para ver que todos juegan la misma versión). */
(function (R) {
  R.VERSION = {
    numero: '1.0.0',              // lo sube la acción de GitHub en cada merge
    nombre: 'Cinco Mundos',       // título del PR que trajo esta versión
    fecha: '2026-09-21',          // día en que se publicó
    commit: '6cc7a9f',            // commit de main que generó la versión
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
     la acción de GitHub). Si GitHub muestra 404, estás jugando una copia de
     tu computadora que todavía no se publicó. */
  R.versionURL = function () { return R.VERSION.repo + '/releases/tag/v' + R.VERSION.numero; };

  /* Pregunta al servidor qué versión está publicada AHORA (sin usar la caché
     del navegador). Llama a cuando(numero) solo si es distinta de la que se
     está jugando. Sin internet o abriendo el archivo directo, no hace nada. */
  R.buscarVersionNueva = function (cuando) {
    if (!window.fetch || location.protocol === 'file:') return;
    fetch('js/core/version.js?buscar=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.text() : ''; })
      .then(function (txt) {
        var m = /numero:\s*'([^']+)'/.exec(txt);
        if (m && m[1] !== R.VERSION.numero) cuando(m[1]);
      })
      .catch(function () {});
  };
})(window.RUNNER);
