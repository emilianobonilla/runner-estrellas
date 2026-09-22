/* Entidades del nivel: estrellas, enemigos, checkpoints y partículas. */
(function (R) {
  var T = R.TILE;
  var GRAVEDAD_ENEMIGO = 2600, CAIDA_MAX_ENEMIGO = 1400;

  function Estrella(x, y) {
    this.x = x; this.y = y; this.r = 15;
    this.recogida = false;
    this.fase = Math.random() * Math.PI * 2;
  }

  function Checkpoint(x, yPies) { this.x = x; this.y = yPies; this.activo = false; }

  /* Enemigo: el "tipo" (data/enemies.js) decide tamaño, velocidad,
     si se puede aplastar y cómo se mueve. Si no se pasa tipo, camina. */
  function Enemigo(x, y, tipo) {
    this.tipo = tipo || R.tipoEnemigo('caminante');
    var t = this.tipo;
    this.w = t.ancho || 36; this.h = t.alto || 30;
    this.x = x + (T - this.w) / 2;
    // Los voladores nacen flotando en el medio de su celda; los demás, apoyados.
    this.y = t.comportamiento === 'volar' ? y + (T - this.h) / 2 : y + T - this.h;
    this.baseY = this.y;              // altura de referencia del vuelo
    this.vx = -(t.velocidad || 55);
    this.vy = 0;
    this.mirando = -1;
    this.enSuelo = t.comportamiento !== 'volar';
    this.vivo = true;
    this.t = 0;
    this.tiempoAplastado = 0;
    this.alerta = 0;                  // perseguidor: 0 tranquilo, 1 corriendo
    this.espera = t.esperaSalto ? Math.random() * t.esperaSalto : 0;
    this.puas = true;                 // blindado: ¿tiene las púas afuera?
    this.cambioPuas = t.puasFuera || 0;
  }

  Enemigo.prototype.actualizar = function (dt, nivel, jugador) {
    if (!this.vivo) { this.tiempoAplastado += dt; return; }
    this.t += dt;
    switch (this.tipo.comportamiento) {
      case 'volar': this.volar(dt, nivel); break;
      case 'saltar': this.saltar(dt, nivel); break;
      case 'perseguir': this.perseguir(dt, nivel, jugador); break;
      default: this.avanzar(dt, nivel, true);
    }
    if (this.tipo.puasFuera) this.alternarPuas(dt);
    if (this.vx !== 0) this.mirando = this.vx < 0 ? -1 : 1;
  };

  /* ¿Se lo puede aplastar en este momento? El blindado solo cuando esconde las púas. */
  Enemigo.prototype.aplastable = function () {
    if (this.tipo.puasFuera) return !this.puas;
    return this.tipo.aplastable !== false;
  };

  Enemigo.prototype.alternarPuas = function (dt) {
    this.cambioPuas -= dt;
    if (this.cambioPuas > 0) return;
    this.puas = !this.puas;
    this.cambioPuas = this.puas ? this.tipo.puasFuera : this.tipo.puasAdentro;
  };

  /* Avanza en horizontal y da media vuelta ante una pared, un pincho o
     (si mira el borde y está en el piso) el final de la plataforma. */
  Enemigo.prototype.avanzar = function (dt, nivel, mirarBorde) {
    if (this.vx === 0) return;
    var nx = this.x + this.vx * dt;
    var pies = Math.floor((this.y + this.h - 1) / T);
    var cabeza = Math.floor(this.y / T);
    var frente = this.vx < 0 ? Math.floor(nx / T) : Math.floor((nx + this.w - 1) / T);
    var pared = nivel.esSolido(frente, pies) || nivel.esPeligro(frente, pies) || nivel.esSolido(frente, cabeza);
    var vacio = mirarBorde && this.enSuelo && !nivel.esSolido(frente, pies + 1);
    if (pared || vacio) this.vx = -this.vx; else this.x = nx;
  };

  /* Gravedad y apoyo en el piso (lo usan los que saltan). */
  Enemigo.prototype.caer = function (dt, nivel) {
    this.vy = Math.min(this.vy + GRAVEDAD_ENEMIGO * dt, CAIDA_MAX_ENEMIGO);
    this.y += this.vy * dt;
    this.enSuelo = false;
    var cx0 = Math.floor(this.x / T), cx1 = Math.floor((this.x + this.w - 1) / T);
    var cy = this.vy > 0 ? Math.floor((this.y + this.h) / T) : Math.floor(this.y / T);
    for (var cx = cx0; cx <= cx1; cx++) {
      if (!nivel.esSolido(cx, cy)) continue;
      if (this.vy > 0) { this.y = cy * T - this.h; this.enSuelo = true; }
      else this.y = (cy + 1) * T;
      this.vy = 0;
      return;
    }
    // Si se cayó a un pozo, desaparece (no queda cayendo para siempre)
    if (this.y > nivel.alto + 80) { this.vivo = false; this.tiempoAplastado = 1; }
  };

  /* Saltarín: camina y, cuando está en el piso, cada tanto pega un salto. */
  Enemigo.prototype.saltar = function (dt, nivel) {
    this.avanzar(dt, nivel, true);
    this.caer(dt, nivel);
    if (!this.enSuelo) return;
    this.espera -= dt;
    if (this.espera <= 0) {
      this.vy = -(this.tipo.impulso || 620);
      this.enSuelo = false;
      this.espera = this.tipo.esperaSalto || 1.5;
    }
  };

  /* Volador: no le afecta la gravedad. Va en línea recta (solo lo frenan
     las paredes) mientras sube y baja suavemente. */
  Enemigo.prototype.volar = function (dt, nivel) {
    this.avanzar(dt, nivel, false);
    var y = this.baseY + Math.sin(this.t * (this.tipo.ritmo || 2.2)) * (this.tipo.amplitud || 20);
    var arriba = Math.floor(y / T), abajo = Math.floor((y + this.h - 1) / T);
    var cx0 = Math.floor(this.x / T), cx1 = Math.floor((this.x + this.w - 1) / T);
    for (var cx = cx0; cx <= cx1; cx++) {
      if (nivel.esSolido(cx, arriba) || nivel.esSolido(cx, abajo)) return;   // no atraviesa el terreno
    }
    this.y = y;
  };

  /* Perseguidor: patrulla tranquilo hasta que ve venir al jugador (todavía
     no lo pasó) cerca y a su misma altura; ahí le sale al encuentro, pero
     nunca se tira a un pozo. Apenas el jugador lo pasa de largo lo deja ir:
     vuelve a patrullar en vez de correrle atrás toda la pantalla. */
  Enemigo.prototype.perseguir = function (dt, nivel, jugador) {
    var t = this.tipo, viendo = false;
    if (jugador) {
      var dx = (jugador.x + jugador.w / 2) - (this.x + this.w / 2);
      var dy = Math.abs((jugador.y + jugador.h) - (this.y + this.h));
      // dx < 0: el jugador está a su izquierda, o sea viniendo de frente
      viendo = dx < -8 && dx > -(t.vista || 290) && dy < T * 2;
      if (viendo) {
        this.mirando = -1;
        this.alerta = Math.min(1, this.alerta + dt * 5);
        // Si adelante hay pared, pincho o vacío, se queda quieto mirándolo
        this.vx = this.caminoLibre(-1, nivel) ? -(t.velocidadCorriendo || 140) : 0;
      }
    }
    if (!viendo) {
      this.alerta = Math.max(0, this.alerta - dt * 2);
      this.vx = (this.vx < 0 || (this.vx === 0 && this.mirando < 0) ? -1 : 1) * (t.velocidad || 50);
    }
    this.avanzar(dt, nivel, true);
  };

  /* ¿Puede dar un paso hacia ese lado sin chocar ni caerse? */
  Enemigo.prototype.caminoLibre = function (dir, nivel) {
    var pies = Math.floor((this.y + this.h - 1) / T);
    var borde = dir < 0 ? Math.floor((this.x - 2) / T) : Math.floor((this.x + this.w + 1) / T);
    if (nivel.esSolido(borde, pies) || nivel.esPeligro(borde, pies)) return false;
    return nivel.esSolido(borde, pies + 1);
  };

  function Particula(x, y, vx, vy, color, vida, r, g) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.color = color; this.vida = vida; this.vidaMax = vida; this.r = r || 4; this.g = g == null ? 900 : g;
  }

  R.Estrella = Estrella;
  R.Checkpoint = Checkpoint;
  R.Enemigo = Enemigo;
  R.Particula = Particula;
})(window.RUNNER);
