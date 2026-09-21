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
  R.mundos = [];
  R.tiposEnemigo = {};
  R.registrarNivel = function (n) { R.niveles.push(n); };
  R.registrarPersonaje = function (p) { R.personajes.push(p); };
  R.registrarTema = function (t) { R.temas[t.id] = t; };
  R.registrarMundo = function (m) { R.mundos.push(m); };
  R.registrarEnemigo = function (e) { R.tiposEnemigo[e.id] = e; };

  /* ---------- enemigos: cada mundo tiene el suyo ---------- */

  /* Tipo de enemigo por id ('caminante', 'saltarin'...). Si no existe, el primero. */
  R.tipoEnemigo = function (id) {
    return R.tiposEnemigo[id] || R.tiposEnemigo[Object.keys(R.tiposEnemigo)[0]] || null;
  };

  /* Tipo de enemigo que corresponde a la letra del mapa.
     'E' no es un tipo fijo: es "el enemigo de este mundo", así cada mundo
     tiene su propia criatura sin tocar los mapas. Las otras letras
     (ver data/enemies.js) fuerzan un tipo concreto en cualquier nivel. */
  R.tipoEnemigoPorSimbolo = function (ch, nivelDef) {
    if (ch === 'E') return R.enemigoDe(nivelDef);
    var ids = Object.keys(R.tiposEnemigo);
    for (var i = 0; i < ids.length; i++) {
      if (R.tiposEnemigo[ids[i]].simbolo === ch) return R.tiposEnemigo[ids[i]];
    }
    return null;
  };

  /* Enemigo propio del nivel, o el de su mundo, o el caminante de siempre. */
  R.enemigoDe = function (nivelDef) {
    var m = R.mundoDe(nivelDef);
    var id = (nivelDef && nivelDef.enemigo) || (m && m.enemigo) || 'caminante';
    return R.tipoEnemigo(id);
  };

  /* ---------- mundos: grupos de niveles con la misma estética ---------- */

  /* Mundo al que pertenece un nivel (null si el nivel no declara mundo). */
  R.mundoDe = function (nivelDef) {
    var id = nivelDef && nivelDef.mundo;
    if (!id) return null;
    return R.mundos.filter(function (m) { return m.id === id; })[0] || null;
  };

  /* Tema de un nivel: el suyo propio si lo declara, si no el de su mundo. */
  R.temaDe = function (nivelDef) {
    var m = R.mundoDe(nivelDef);
    var id = (nivelDef && nivelDef.tema) || (m && m.tema);
    return R.temas[id] || null;
  };

  /* Dificultad 1 a 5: la del nivel o, si no la declara, la de su mundo. */
  R.dificultadDe = function (nivelDef) {
    var m = R.mundoDe(nivelDef);
    return (nivelDef && nivelDef.dificultad) || (m && m.dificultad) || 1;
  };

  /* Niveles de un mundo, en orden. */
  R.nivelesDe = function (mundoId) {
    return R.niveles.filter(function (n) { return n.mundo === mundoId; });
  };

  /* Etiqueta estilo Mario: "2-1" = primer nivel del mundo 2.
     Si el nivel no tiene mundo, devuelve su número global. */
  R.etiquetaNivel = function (nivelDef) {
    var m = R.mundoDe(nivelDef);
    if (!m) return String(R.niveles.indexOf(nivelDef) + 1);
    return m.orden + '-' + (R.nivelesDe(m.id).indexOf(nivelDef) + 1);
  };

  /* Orden de juego: primero por mundo, después por el orden del nivel. */
  R.ordenarNiveles = function () {
    R.niveles.sort(function (a, b) {
      var ma = R.mundoDe(a), mb = R.mundoDe(b);
      var d = ((ma && ma.orden) || 0) - ((mb && mb.orden) || 0);
      return d !== 0 ? d : (a.orden || 0) - (b.orden || 0);
    });
    R.mundos.sort(function (a, b) { return (a.orden || 0) - (b.orden || 0); });
  };

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
