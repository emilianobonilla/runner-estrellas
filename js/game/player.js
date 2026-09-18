/* Jugador: física de plataformas con colisión contra la grilla del nivel. */
(function (R) {
  var T = R.TILE;
  // Ajustes de "sensación" del salto y la carrera
  var GRAVEDAD = 3000;      // px/s²
  var SALTO = 1180;         // velocidad inicial del salto (sube ~4.8 celdas manteniendo la tecla)
  var SALTO_MINIMO = 810;   // al soltar la tecla el salto se corta, pero nunca por debajo de ~2.3 celdas
  var VEL_MAX = 320;        // px/s corriendo
  var ACELERACION = 2800;
  var FRICCION = 2600;
  var CAIDA_MAX = 1300;
  var COYOTE = 0.1;         // segundos para saltar tras dejar un borde
  var BUFFER = 0.12;        // segundos que se recuerda un salto pulsado antes de tocar el suelo

  function Jugador() { this.w = 30; this.h = 44; this.reiniciar(0, 0); }

  Jugador.prototype.reiniciar = function (x, yPies) {
    this.x = x; this.y = yPies - this.h;
    this.vx = 0; this.vy = 0;
    this.enSuelo = false; this.mirando = 1;
    this.anim = 0; this.t = 0;
    this.coyote = 0; this.buffer = 0; this.saltando = false;
    this.invulnerable = 0;
  };

  Jugador.prototype.actualizar = function (dt, nivel, input, minX, partida) {
    this.t += dt;
    if (this.invulnerable > 0) this.invulnerable -= dt;

    // Horizontal
    var dir = (input.der ? 1 : 0) - (input.izq ? 1 : 0);
    if (dir !== 0) { this.vx += dir * ACELERACION * dt; this.mirando = dir; }
    else {
      var f = FRICCION * dt;
      if (Math.abs(this.vx) <= f) this.vx = 0; else this.vx -= Math.sign(this.vx) * f;
    }
    this.vx = R.clamp(this.vx, -VEL_MAX, VEL_MAX);

    // Salto (con coyote time y buffer)
    if (this.enSuelo) this.coyote = COYOTE; else this.coyote -= dt;
    if (input.saltoPulsado) this.buffer = BUFFER; else this.buffer -= dt;
    if (this.buffer > 0 && this.coyote > 0) {
      this.vy = -SALTO; this.enSuelo = false; this.coyote = 0; this.buffer = 0; this.saltando = true;
      if (partida) partida.audio.salto();
    }
    // Soltar el botón corta el salto (salto corto/largo)
    if (this.saltando && !input.salto && this.vy < -SALTO_MINIMO) { this.vy = -SALTO_MINIMO; this.saltando = false; }
    if (this.vy >= 0) this.saltando = false;

    this.vy = Math.min(this.vy + GRAVEDAD * dt, CAIDA_MAX);

    this.moverX(this.vx * dt, nivel);
    this.moverY(this.vy * dt, nivel);

    // No se puede volver más atrás que el borde izquierdo de la pantalla
    if (this.x < minX) { this.x = minX; if (this.vx < 0) this.vx = 0; }

    if (this.enSuelo) this.anim += dt * Math.abs(this.vx) / VEL_MAX;
  };

  var TOLERANCIA_ESQUINA = 14; // px: si los pies rozan el borde superior de un bloque, el jugador sube a él

  Jugador.prototype.moverX = function (dx, nivel) {
    if (dx === 0) return;
    this.x += dx;
    var cy0 = Math.floor(this.y / T), cy1 = Math.floor((this.y + this.h - 1) / T);
    var cx = dx > 0 ? Math.floor((this.x + this.w - 1) / T) : Math.floor(this.x / T);
    for (var cy = cy0; cy <= cy1; cy++) {
      if (nivel.esSolido(cx, cy)) {
        // Tolerancia de esquina: solo choca la fila de los pies, por muy poco, y arriba hay lugar
        var sobra = this.y + this.h - cy * T;
        if (cy === cy1 && cy > cy0 && sobra <= TOLERANCIA_ESQUINA && !nivel.esSolido(cx, cy - 1) && this.vy >= -60) {
          this.y = cy * T - this.h;
          if (this.vy > 0) this.vy = 0;
          this.enSuelo = true;
          return;
        }
        this.x = dx > 0 ? cx * T - this.w : (cx + 1) * T;
        this.vx = 0;
        return;
      }
    }
  };

  Jugador.prototype.moverY = function (dy, nivel) {
    this.y += dy;
    this.enSuelo = false;
    var cx0 = Math.floor(this.x / T), cx1 = Math.floor((this.x + this.w - 1) / T);
    // Al caer se usa el borde inferior inclusive: así, parado justo sobre una superficie,
    // enSuelo se mantiene estable en cada paso (sin hundirse 1 px)
    var cy = dy > 0 ? Math.floor((this.y + this.h) / T) : Math.floor(this.y / T);
    for (var cx = cx0; cx <= cx1; cx++) {
      if (nivel.esSolido(cx, cy)) {
        if (dy > 0) { this.y = cy * T - this.h; this.vy = 0; this.enSuelo = true; }
        else { this.y = (cy + 1) * T; this.vy = 0; this.saltando = false; }
        return;
      }
    }
  };

  R.Jugador = Jugador;
})(window.RUNNER);
