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
    this.alLlegar = op.alLlegar || null;   // aviso inmediato al tocar la meta (lo usa la carrera)
    this.nombre = op.nombre || '';
    this.infinitas = !!op.infinitas;       // en la carrera se reaparece siempre: el castigo es el tiempo
    // Las vidas vienen de afuera: son del recorrido completo, no de este nivel (js/main.js)
    this.cuenta = op.cuenta || 0;          // segundos de cuenta regresiva antes de largar
    // En una carrera las estrellas y los enemigos son de todos: quién se queda
    // con cada uno lo decide el árbitro (js/net/carrera.js), no esta partida.
    this.pedirToma = op.pedirToma || null;
    this.rivales = [];                     // los completa R.Carrera.usarPartida
    this.rivalPorId = {};
    this.sigueAlAnfitrion = false;         // los enemigos los comanda otro dispositivo
    this.miColor = '#ffd23f';              // color de mi marca en la barra de la carrera

    this.jugador = new R.Jugador();
    this.camara = { x: 0 };
    this.tiempo = 0;
    this.puntos = 0;
    this.vidas = op.vidas == null ? R.VIDAS_INICIALES : op.vidas;
    this.estrellas = 0;
    this.totalEstrellas = this.nivel.estrellas.length;
    this.enemigosPisados = 0;
    this.puntosEnemigos = 0;       // los tipos de enemigo dan distintos puntos
    this.muertes = 0;
    this.estado = this.cuenta > 0 ? 'preparando' : 'jugando';   // preparando | jugando | pausa | muriendo | ganado | perdida | fin
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

    if (this.estado === 'preparando') {
      this.cuenta -= dt;
      if (this.cuenta <= 0) { this.estado = 'jugando'; this.avisar('¡YA!', 0.9); }
      this.actualizarRivales(dt);
      return;
    }
    this.actualizarRivales(dt);

    if (this.estado === 'jugando') {
      this.tiempo += dt;
      j.actualizar(dt, n, this.input, this.camara.x + 4, this);
      // Los enemigos nunca se sacan de la lista: en la carrera cada uno tiene
      // que seguir teniendo el mismo número en todos los dispositivos.
      var objetivos = this.objetivos();
      for (i = 0; i < n.enemigos.length; i++) {
        n.enemigos[i].actualizar(dt, n, objetivos);
        if (this.sigueAlAnfitrion) n.enemigos[i].corregir(dt);
      }
      this.colisiones();
      this.actualizarCamara(false);
      if (j.y > n.alto + 40) this.morir(true);
    } else if (this.estado === 'muriendo') {
      j.vy += 2600 * dt; j.y += j.vy * dt; j.x += j.vx * dt;
      this.temporizador -= dt;
      if (this.temporizador <= 0) {
        if (this.infinitas || this.vidas > 0) this.reaparecer(); else this.terminar(false);
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
    } else if (this.estado === 'perdida') {
      this.temporizador -= dt;
      j.anim += dt;
      if (this.temporizador <= 0) this.terminar(false);
    }

    for (i = this.particulas.length - 1; i >= 0; i--) {
      var p = this.particulas[i];
      p.vida -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt;
      if (p.vida <= 0) this.particulas.splice(i, 1);
    }
    if (this.mensaje) { this.mensaje.t -= dt; if (this.mensaje.t <= 0) this.mensaje = null; }
  };

  /* Cada rival llega 15 veces por segundo: acercamos su muñeco de a poco para que no salte. */
  Partida.prototype.actualizarRivales = function (dt) {
    var k = Math.min(1, dt * 14);
    for (var i = 0; i < this.rivales.length; i++) {
      var r = this.rivales[i];
      if (!r.activo) continue;
      r.x += (r.dx - r.x) * k;
      r.y += (r.dy - r.y) * k;
      r.t += dt;
      if (r.enSuelo) r.anim += dt * Math.abs(r.vx) / 320;
    }
  };

  /* A quién miran los enemigos que persiguen: en una carrera, a cualquiera
     de los corredores (el perseguidor elige al que tenga más cerca). */
  Partida.prototype.objetivos = function () {
    if (!this.rivales.length) return [this.jugador];
    var lista = [this.jugador];
    for (var i = 0; i < this.rivales.length; i++) {
      var r = this.rivales[i];
      if (r.activo && !r.muerto) lista.push(r);
    }
    return lista;
  };

  /* Llegó la posición de los enemigos que manda el anfitrión: no los movemos
     de golpe (se vería un salto), los vamos corrigiendo cuadro a cuadro. */
  Partida.prototype.sincronizarEnemigos = function (lista) {
    if (!lista) return;
    for (var k = 0; k < lista.length; k++) {
      var d = lista[k], e = this.nivel.enemigos[d[0] | 0];
      if (!e || !e.vivo) continue;
      e.vx = d[3];
      e.apuntarA(d[1], d[2]);
    }
  };

  /* Cuánto del nivel lleva recorrido (0 a 1). Lo usa la barra de la carrera. */
  Partida.prototype.progreso = function () {
    var x0 = this.nivel.inicio.x, x1 = this.nivel.meta.x;
    return R.clamp((this.jugador.x - x0) / Math.max(1, x1 - x0), 0, 1);
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
        this.audio.estrella();
        this.reclamar('e', i);
      }
    }

    // Checkpoints: se activan al cruzar la línea de la bandera, a cualquier
    // altura (no hace falta tocar el mástil). La meta sí hay que tocarla.
    for (i = 0; i < n.checkpoints.length; i++) {
      e = n.checkpoints[i]; if (e.activo) continue;
      if (j.x + j.w / 2 >= e.x) {
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
        var desdeArriba = j.vy > 0 && j.y + j.h - e.y < 18;
        if (desdeArriba && e.aplastable()) {
          j.vy = -430; j.saltando = false;
          this.audio.pisar();
          this.reclamar('x', i);
        } else if (j.invulnerable <= 0) {
          var pinchado = desdeArriba && !e.aplastable();
          this.morir(false);
          // Aviso claro: al blindado hay que esperarlo sin púas, no aplastarlo siempre
          if (pinchado) this.avisar('¡Las púas pinchan! Esperá a que las esconda', 2.2);
          return;
        }
      }
    }

    // Pinchos
    if (j.invulnerable <= 0 && n.peligroEnRect(j.x + 5, j.y + 6, j.w - 10, j.h - 6)) this.morir(false);
  };

  /* ---------- estrellas y enemigos (compartidos en la carrera) ---------- */

  /* Me quedo con la estrella ('e') o el enemigo ('x') número i. Jugando solo
     es mío y listo; en una carrera desaparece enseguida de la pantalla pero
     los puntos los reparte el árbitro, que es el que sabe quién llegó primero. */
  Partida.prototype.reclamar = function (tipo, i) {
    var cosa = tipo === 'e' ? this.nivel.estrellas[i] : this.nivel.enemigos[i];
    if (!cosa) return;
    cosa.pedida = true;
    if (!this.pedirToma) return this.aplicarToma(tipo, i, true, '');
    this.hacerDesaparecer(tipo, i);
    this.pedirToma(tipo, i);
  };

  /* Sacarlo de la pantalla (los puntos se anotan aparte). */
  Partida.prototype.hacerDesaparecer = function (tipo, i) {
    if (tipo === 'e') {
      var s = this.nivel.estrellas[i];
      if (!s || s.recogida) return;
      s.recogida = true;
      this.explotar(s.x, s.y, this.tema.estrella, 10, 220);
    } else {
      var e = this.nivel.enemigos[i];
      if (!e || !e.vivo) return;
      e.vivo = false;
      this.explotar(e.x + e.w / 2, e.y + e.h / 2, this.tema.enemigo, 8, 160);
    }
  };

  /* El árbitro repartió: la estrella o el enemigo desaparece para todos y los
     puntos van para uno solo. Llega también cuando el que se lo llevó fui yo. */
  Partida.prototype.aplicarToma = function (tipo, i, esMia, quien) {
    var cosa = tipo === 'e' ? this.nivel.estrellas[i] : this.nivel.enemigos[i];
    if (!cosa || cosa.contada) return;
    cosa.contada = true;
    this.hacerDesaparecer(tipo, i);
    if (esMia) {
      if (tipo === 'e') {
        this.puntos += PUNTOS_ESTRELLA;
        // El marcador cuenta cuántas de las del nivel junté: en la carrera una
        // estrella puede volver a aparecer, pero el ⭐ x/y no se pasa del total.
        if (this.estrellas < this.totalEstrellas) {
          this.estrellas++;
          if (this.estrellas === this.totalEstrellas) this.avisar('¡Todas las estrellas!');
        }
      } else {
        var vale = cosa.tipo.puntos || PUNTOS_ENEMIGO;
        this.puntos += vale; this.puntosEnemigos += vale; this.enemigosPisados++;
      }
    } else if (cosa.pedida && tipo === 'e') {
      this.avisar('⭐ Te la ganó ' + (quien || 'otro corredor'), 1.6);
    }
  };

  /* La estrella vuelve a aparecer (solo en la carrera, a los pocos segundos de
     que alguien se la llevó): queda otra vez en juego para todos, con las
     mismas reglas. Los enemigos no vuelven. */
  Partida.prototype.revivirEstrella = function (i) {
    var s = this.nivel.estrellas[i];
    if (!s || !s.recogida) return;
    s.recogida = false; s.pedida = false; s.contada = false;
    this.explotar(s.x, s.y, this.tema.estrella, 6, 120);
  };

  Partida.prototype.morir = function (cayo) {
    if (this.estado !== 'jugando') return;
    if (!this.infinitas) this.vidas--;
    this.muertes++;
    this.estado = 'muriendo';
    this.temporizador = 1.2;
    var j = this.jugador;
    j.vy = cayo ? 0 : -620; j.vx = 0; j.enSuelo = false;
    this.audio.golpe();
    if (!cayo) this.explotar(j.x + j.w / 2, j.y + j.h / 2, '#ffffff', 8, 200);
    this.avisar(this.infinitas ? '¡Ay! Seguí corriendo'
      : this.vidas > 0 ? '¡Ay! Te quedan ' + this.vidas + (this.vidas === 1 ? ' vida' : ' vidas') : 'Sin vidas...');
  };

  Partida.prototype.reaparecer = function () {
    var j = this.jugador;
    j.reiniciar(this.respawn.x, this.respawn.y);
    j.invulnerable = 1.6;
    this.estado = 'jugando';
    this.actualizarCamara(true);
  };

  Partida.prototype.ganar = function () {
    if (this.alLlegar) this.alLlegar(this);   // primero avisamos al árbitro, después la animación
    this.estado = 'ganado';
    this.temporizador = 2.4;
    var j = this.jugador; j.vx = 0; j.enSuelo = true;
    var bonusTiempo = Math.max(0, Math.round((this.def.tiempoObjetivo || 60) - this.tiempo) * 10);
    var bonusTodas = this.totalEstrellas > 0 && this.estrellas === this.totalEstrellas ? PUNTOS_TODAS : 0;
    this.desglose = {
      estrellas: this.estrellas * PUNTOS_ESTRELLA,
      enemigos: this.puntosEnemigos,
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
      this.desglose = { estrellas: this.estrellas * PUNTOS_ESTRELLA, enemigos: this.puntosEnemigos, meta: 0, bonusTiempo: 0, bonusTodas: 0 };
      this.audio.derrota();
    }
    if (this.alTerminar) this.alTerminar({
      nivelId: this.def.id, nombre: this.nombre,
      puntos: this.puntos, estrellas: this.estrellas, totalEstrellas: this.totalEstrellas,
      tiempo: Math.round(this.tiempo * 10) / 10, completado: completado,
      muertes: this.muertes, vidas: this.vidas, desglose: this.desglose
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
