/* Persistencia local (localStorage): perfil, ranking por nivel y competencias.
   Todo queda en la computadora; nada sale a internet. */
(function (R) {
  var CLAVE = 'runner-estrellas.v1';

  var Storage = {
    datos: null,

    cargar: function () {
      var d = {};
      try { d = JSON.parse(localStorage.getItem(CLAVE)) || {}; } catch (e) { d = {}; }
      d.perfil = Object.assign({
        nombre: '', personaje: null, tema: 'auto', sonido: true, tactil: 'auto'
      }, d.perfil || {});
      d.ranking = d.ranking || {};        // { nivelId: [ {nombre, puntos, estrellas, tiempo, fecha} ] }
      d.progreso = d.progreso || {};      // { nivelId: {completado, mejorPuntaje, mejorEstrellas} }
      d.competencias = d.competencias || [];
      this.datos = d;
      return d;
    },

    guardar: function () {
      try { localStorage.setItem(CLAVE, JSON.stringify(this.datos)); } catch (e) { /* sin espacio */ }
    },

    /* Guarda un resultado en el ranking del nivel. Devuelve true si quedó primero. */
    registrarPuntaje: function (res) {
      var lista = this.datos.ranking[res.nivelId] = this.datos.ranking[res.nivelId] || [];
      var entrada = {
        nombre: res.nombre || 'Anónimo', puntos: res.puntos, estrellas: res.estrellas,
        tiempo: res.tiempo, completado: res.completado, fecha: new Date().toISOString()
      };
      lista.push(entrada);
      lista.sort(function (a, b) { return b.puntos - a.puntos || a.tiempo - b.tiempo; });
      if (lista.length > 20) lista.length = 20;

      var p = this.datos.progreso[res.nivelId] = this.datos.progreso[res.nivelId] || {};
      p.completado = p.completado || res.completado;
      p.mejorPuntaje = Math.max(p.mejorPuntaje || 0, res.puntos);
      p.mejorEstrellas = Math.max(p.mejorEstrellas || 0, res.estrellas);
      this.guardar();
      return lista[0] === entrada;
    },

    /* ----- Competencias ----- */
    competencia: function (id) {
      return this.datos.competencias.filter(function (c) { return c.id === id; })[0] || null;
    },

    crearCompetencia: function (nombre, niveles, jugadores) {
      var c = {
        id: R.uid(), nombre: nombre, creada: new Date().toISOString(),
        niveles: niveles, jugadores: jugadores, resultados: {}
      };
      this.datos.competencias.unshift(c);
      this.guardar();
      return c;
    },

    eliminarCompetencia: function (id) {
      this.datos.competencias = this.datos.competencias.filter(function (c) { return c.id !== id; });
      this.guardar();
    },

    /* Guarda el resultado de un jugador en una competencia si mejora el anterior. */
    registrarResultadoCompetencia: function (id, jugador, res) {
      var c = this.competencia(id); if (!c) return false;
      var porJugador = c.resultados[jugador] = c.resultados[jugador] || {};
      var previo = porJugador[res.nivelId];
      var nuevo = { puntos: res.puntos, estrellas: res.estrellas, tiempo: res.tiempo, completado: res.completado, fecha: new Date().toISOString() };
      if (!previo || nuevo.puntos > previo.puntos) { porJugador[res.nivelId] = nuevo; this.guardar(); return true; }
      return false;
    },

    /* Combina una competencia importada (misma id) tomando el mejor resultado por celda. */
    fusionarCompetencia: function (importada) {
      var local = this.competencia(importada.id);
      if (!local) {
        this.datos.competencias.unshift(importada);
        this.guardar();
        return 'nueva';
      }
      importada.jugadores.forEach(function (j) { if (local.jugadores.indexOf(j) < 0) local.jugadores.push(j); });
      importada.niveles.forEach(function (n) { if (local.niveles.indexOf(n) < 0) local.niveles.push(n); });
      Object.keys(importada.resultados || {}).forEach(function (j) {
        local.resultados[j] = local.resultados[j] || {};
        Object.keys(importada.resultados[j]).forEach(function (n) {
          var a = local.resultados[j][n], b = importada.resultados[j][n];
          if (!a || b.puntos > a.puntos) local.resultados[j][n] = b;
        });
      });
      this.guardar();
      return 'fusionada';
    },

    totalesCompetencia: function (c) {
      return c.jugadores.map(function (j) {
        var r = c.resultados[j] || {};
        var total = 0, estrellas = 0, completados = 0;
        c.niveles.forEach(function (n) {
          if (r[n]) { total += r[n].puntos; estrellas += r[n].estrellas; if (r[n].completado) completados++; }
        });
        return { jugador: j, total: total, estrellas: estrellas, completados: completados };
      }).sort(function (a, b) { return b.total - a.total || b.estrellas - a.estrellas; });
    }
  };

  R.Storage = Storage;
})(window.RUNNER);
