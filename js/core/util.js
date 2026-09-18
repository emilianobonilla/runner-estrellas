/* Espacio de nombres global y utilidades compartidas.
   Todo el juego vive en window.RUNNER para poder abrirse con doble clic
   (sin servidor ni módulos ES). */
window.RUNNER = window.RUNNER || {};
(function (R) {
  R.TILE = 48;          // tamaño de cada celda del mapa en píxeles
  R.ANCHO = 960;        // tamaño lógico del lienzo
  R.ALTO = 528;         // 11 filas de 48 px

  // Registros de contenido (los archivos de data/ se agregan aquí)
  R.niveles = [];
  R.personajes = [];
  R.temas = {};
  R.registrarNivel = function (n) { R.niveles.push(n); };
  R.registrarPersonaje = function (p) { R.personajes.push(p); };
  R.registrarTema = function (t) { R.temas[t.id] = t; };

  R.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  R.lerp = function (a, b, t) { return a + (b - a) * t; };

  R.formatearTiempo = function (seg) {
    seg = Math.max(0, seg || 0);
    var m = Math.floor(seg / 60);
    var s = seg - m * 60;
    return m + ':' + (s < 10 ? '0' : '') + s.toFixed(1);
  };

  R.uid = function () {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  };

  R.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  R.fechaCorta = function (iso) {
    try {
      var d = new Date(iso);
      return d.toLocaleDateString('es-UY', { day: '2-digit', month: '2-digit', year: '2-digit' });
    } catch (e) { return ''; }
  };
})(window.RUNNER);
