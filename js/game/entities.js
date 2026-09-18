/* Entidades del nivel: estrellas, enemigos, checkpoints y partículas. */
(function (R) {
  var T = R.TILE;

  function Estrella(x, y) {
    this.x = x; this.y = y; this.r = 15;
    this.recogida = false;
    this.fase = Math.random() * Math.PI * 2;
  }

  function Checkpoint(x, yPies) { this.x = x; this.y = yPies; this.activo = false; }

  function Enemigo(x, y) {
    this.w = 36; this.h = 30;
    this.x = x + (T - this.w) / 2;
    this.y = y + T - this.h;
    this.vx = -55;
    this.vivo = true;
    this.t = 0;
    this.tiempoAplastado = 0;
  }
  Enemigo.prototype.actualizar = function (dt, nivel) {
    if (!this.vivo) { this.tiempoAplastado += dt; return; }
    this.t += dt;
    var nx = this.x + this.vx * dt;
    var cy = Math.floor((this.y + this.h - 1) / T);
    var frente = this.vx < 0 ? Math.floor(nx / T) : Math.floor((nx + this.w - 1) / T);
    var pared = nivel.esSolido(frente, cy) || nivel.esPeligro(frente, cy);
    var vacio = !nivel.esSolido(frente, cy + 1);
    if (pared || vacio) this.vx = -this.vx; else this.x = nx;
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
