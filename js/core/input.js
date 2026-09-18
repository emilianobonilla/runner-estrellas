/* Entrada: teclado + botones táctiles unificados.
   Teclas: ← → / A D para moverse, ↑ / W / Espacio para saltar, Esc / P pausa. */
(function (R) {
  var MAPA = {
    ArrowLeft: 'izq', KeyA: 'izq',
    ArrowRight: 'der', KeyD: 'der',
    ArrowUp: 'salto', KeyW: 'salto', Space: 'salto'
  };

  function Input() {
    this.teclado = { izq: false, der: false, salto: false };
    this.tactil = { izq: false, der: false, salto: false };
    this._latchSalto = false;    // registra un toque aunque dure menos de un frame
    this.saltoPulsado = false;   // verdadero solo el paso en que se presiona
    this.activo = false;         // si es verdadero, el juego captura las teclas
    this.onPausa = null;

    var self = this;
    window.addEventListener('keydown', function (e) {
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (self.activo && !e.repeat && self.onPausa) { e.preventDefault(); self.onPausa(); }
        return;
      }
      var accion = MAPA[e.code];
      if (!accion) return;
      if (self.activo) e.preventDefault();
      if (accion === 'salto' && !self.teclado.salto) self._latchSalto = true;
      self.teclado[accion] = true;
    });
    window.addEventListener('keyup', function (e) {
      var accion = MAPA[e.code];
      if (accion) self.teclado[accion] = false;
    });
    window.addEventListener('blur', function () { self.reiniciar(); });
  }

  Input.prototype.tocar = function (accion, abajo) {
    if (accion === 'salto' && abajo && !this.tactil.salto) this._latchSalto = true;
    this.tactil[accion] = abajo;
  };

  Object.defineProperties(Input.prototype, {
    izq: { get: function () { return this.teclado.izq || this.tactil.izq; } },
    der: { get: function () { return this.teclado.der || this.tactil.der; } },
    salto: { get: function () { return this.teclado.salto || this.tactil.salto; } }
  });

  // Llamar una vez por paso de simulación
  Input.prototype.actualizar = function () {
    this.saltoPulsado = this._latchSalto;
    this._latchSalto = false;
  };

  Input.prototype.reiniciar = function () {
    this.teclado.izq = this.teclado.der = this.teclado.salto = false;
    this.tactil.izq = this.tactil.der = this.tactil.salto = false;
    this._latchSalto = false;
    this.saltoPulsado = false;
  };

  R.Input = Input;
})(window.RUNNER);
