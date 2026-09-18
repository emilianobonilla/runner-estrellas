/* Partida: una jugada de un nivel. Coordina jugador, entidades, cámara,
   puntaje, vidas y el final (victoria o derrota). */
(function (R) {
  var T = R.TILE;
  var PUNTOS_ESTRELLA = 100, PUNTOS_ENEMIGO = 50, PUNTOS_META = 500, PUNTOS_TODAS = 300;

  function Partida(def, op) {
    this.def = def;
    this.nivel = new R.Nivel(def);
    this.tema = op.tema;
    this.personaje = op.personaje;
    this.audio = op.audio;
    this.input = op.input;
    this.alTerminar = op.alTerminar;
    this.nombre = op.nombre || '';

    this.jugador = new R.Jugador();
    this.camara = { x: 0 };
    this.tiempo = 0;
    this.puntos = 0;
    this.vidas = 3;
    this.estrellas = 0;
    this.totalEstrellas = this.nivel.estrellas.length;
    this.enemigosPisados = 0;
    this.muertes = 0;
    this.estado = 'jugando';   // jugando | pausa | muriendo | ganado | fin
    this.temporizador = 0;
    this.particulas = [];
    this.mensaje = null;
    this.desglose = null;

    this.respawn = { x: this.nivel.inicio.x, y: this.nivel.inicio.y };
    this.jugador.reiniciar(this.respawn.x, this.respawn.y);
    this.actualizarCamara(true);
  }

  Partida.prototype.actualizar = function (dt) {
    if (this.estado === 'pausa' || this.estado === 'fin') return;
    var j = this.jugador, n = this.nivel, i;

    if (this.estado === 'jugando') {
      this.tiempo += dt;
      j.actualizar(dt, n, this.input, this.camara.x + 4, this);
      for (i = 0; i < n.enemigos.length; i++) n.enemigos[i].actualizar(dt, n);
      n.enemigos = n.enemigos.filter(function (e) { return e.vivo || e.tiempoAplastado < 0.6; });
      this.colisiones();
      this.actualizarCamara(false);
      if (j.y > n.alto + 40) this.morir(true);
    } else if (this.estado === 'muriendo') {
      j.vy += 2600 * dt; j.y += j.vy * dt; j.x += j.vx * dt;
      this.temporizador -= dt;
      if (this.temporizador <= 0) {
        if (this.vidas > 0) this.reaparecer(); else this.terminar(false);
      }
    } else if (this.estado === 'ganado') {
      this.temporizador -= dt;
      j.anim += dt;
      if (Math.random() < 0.35) {
        var m = n.meta;
        this.particulas.push(new R.Particula(m.x + T / 2 + (Math.random() - .5) * 80, m.y - 3 * T,
          (Math.random() - .5) * 160, -120 - Math.random() * 120,
          ['#ffd23f', '#4cc9f0', '#e63946', '#57cc99', '#fff'][Math.floor(Math.random() * 5)], 1.2, 3 + Math.random() * 3, 400));
      }
      if (this.temporizador <= 0) this.terminar(true);
    }

    for (i = this.particulas.length - 1; i >= 0; i--) {
      var p = this.particulas[i];
      p.vida -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt;
      if (p.vida <= 0) this.particulas.splice(i, 1);
    }
    if (this.mensaje) { this.mensaje.t -= dt; if (this.mensaje.t <= 0) this.mensaje = null; }
  };

  Partida.prototype.actualizarCamara = function (forzar) {
    var j = this.jugador;
    var objetivo = j.x + j.w / 2 - R.ANCHO * 0.4;
    var max = Math.max(0, this.nivel.ancho - R.ANCHO);
    if (forzar) this.camara.x = R.clamp(objetivo, 0, max);
    else this.camara.x = R.clamp(Math.max(this.camara.x, objetivo), 0, max);
  };

  Partida.prototype.colisiones = function () {
    var j = this.jugador, n = this.nivel, i, e;

    // Estrellas
    for (i = 0; i < n.estrellas.length; i++) {
      e = n.estrellas[i]; if (e.recogida) continue;
      var dx = Math.abs(j.x + j.w / 2 - e.x), dy = Math.abs(j.y + j.h / 2 - e.y);
      if (dx < j.w / 2 + e.r - 4 && dy < j.h / 2 + e.r - 4) {
        e.recogida = true; this.estrellas++; this.puntos += PUNTOS_ESTRELLA;
        this.audio.estrella();
        this.explotar(e.x, e.y, this.tema.estrella, 10, 220);
        if (this.estrellas === this.totalEstrellas) this.avisar('¡Todas las estrellas!');
      }
    }

    // Checkpoints
    for (i = 0; i < n.checkpoints.length; i++) {
      e = n.checkpoints[i]; if (e.activo) continue;
      if (Math.abs(j.x + j.w / 2 - e.x) < 34 && j.y + j.h > e.y - 2 * T && j.y < e.y) {
        e.activo = true;
        this.respawn = { x: e.x - j.w / 2, y: e.y };
        this.audio.checkpoint();
        this.avisar('Checkpoint');
      }
    }

    // Meta
    var m = n.meta;
    if (j.x + j.w > m.x + 12 && j.x < m.x + T - 12 && j.y + j.h > m.y - 3 * T) { this.ganar(); return; }

    // Enemigos
    for (i = 0; i < n.enemigos.length; i++) {
      e = n.enemigos[i]; if (!e.vivo) continue;
      if (j.x < e.x + e.w && j.x + j.w > e.x && j.y < e.y + e.h && j.y + j.h > e.y) {
        if (j.vy > 0 && j.y + j.h - e.y < 18) {
          e.vivo = false; j.vy = -430; j.saltando = false;
          this.puntos += PUNTOS_ENEMIGO; this.enemigosPisados++;
          this.audio.pisar();
          this.explotar(e.x + e.w / 2, e.y + e.h / 2, this.tema.enemigo, 8, 160);
        } else if (j.invulnerable <= 0) { this.morir(false); return; }
      }
    }

    // Pinchos
    if (j.invulnerable <= 0 && n.peligroEnRect(j.x + 5, j.y + 6, j.w - 10, j.h - 6)) this.morir(false);
  };

  Partida.prototype.morir = function (cayo) {
    if (this.estado !== 'jugando') return;
    this.vidas--; this.muertes++;
    this.estado = 'muriendo';
    this.temporizador = 1.2;
    var j = this.jugador;
    j.vy = cayo ? 0 : -620; j.vx = 0; j.enSuelo = false;
    this.audio.golpe();
    if (!cayo) this.explotar(j.x + j.w / 2, j.y + j.h / 2, '#ffffff', 8, 200);
    this.avisar(this.vidas > 0 ? '¡Ay! Te quedan ' + this.vidas + (this.vidas === 1 ? ' vida' : ' vidas') : 'Sin vidas...');
  };

  Partida.prototype.reaparecer = function () {
    var j = this.jugador;
    j.reiniciar(this.respawn.x, this.respawn.y);
    j.invulnerable = 1.6;
    this.estado = 'jugando';
    this.actualizarCamara(true);
  };

  Partida.prototype.ganar = function () {
    this.estado = 'ganado';
    this.temporizador = 2.4;
    var j = this.jugador; j.vx = 0; j.enSuelo = true;
    var bonusTiempo = Math.max(0, Math.round((this.def.tiempoObjetivo || 60) - this.tiempo) * 10);
    var bonusTodas = this.totalEstrellas > 0 && this.estrellas === this.totalEstrellas ? PUNTOS_TODAS : 0;
    this.desglose = {
      estrellas: this.estrellas * PUNTOS_ESTRELLA,
      enemigos: this.enemigosPisados * PUNTOS_ENEMIGO,
      meta: PUNTOS_META,
      bonusTiempo: bonusTiempo,
      bonusTodas: bonusTodas
    };
    this.puntos += PUNTOS_META + bonusTiempo + bonusTodas;
    this.audio.victoria();
    this.avisar('¡Nivel completado!', 3);
  };

  Partida.prototype.terminar = function (completado) {
    this.estado = 'fin';
    if (!completado) {
      this.desglose = { estrellas: this.estrellas * PUNTOS_ESTRELLA, enemigos: this.enemigosPisados * PUNTOS_ENEMIGO, meta: 0, bonusTiempo: 0, bonusTodas: 0 };
      this.audio.derrota();
    }
    if (this.alTerminar) this.alTerminar({
      nivelId: this.def.id, nombre: this.nombre,
      puntos: this.puntos, estrellas: this.estrellas, totalEstrellas: this.totalEstrellas,
      tiempo: Math.round(this.tiempo * 10) / 10, completado: completado,
      muertes: this.muertes, desglose: this.desglose
    });
  };

  Partida.prototype.explotar = function (x, y, color, n, vel) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, v = vel * (0.4 + Math.random() * 0.6);
      this.particulas.push(new R.Particula(x, y, Math.cos(a) * v, Math.sin(a) * v - 80, color, 0.5 + Math.random() * 0.4, 3 + Math.random() * 3));
    }
  };

  Partida.prototype.avisar = function (texto, dur) { this.mensaje = { texto: texto, t: dur || 1.6, dur: dur || 1.6 }; };

  Partida.prototype.pausar = function () { if (this.estado === 'jugando') this.estado = 'pausa'; };
  Partida.prototype.continuar = function () { if (this.estado === 'pausa') this.estado = 'jugando'; };

  R.Partida = Partida;
})(window.RUNNER);
