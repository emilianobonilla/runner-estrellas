/* Nivel: interpreta el mapa de caracteres y responde consultas de colisión. */
(function (R) {
  var T = R.TILE;

  function Nivel(def) {
    this.def = def;
    this.id = def.id;
    this.nombre = def.nombre;
    var filas = def.mapa;
    this.filas = filas.length;
    this.cols = 0;
    filas.forEach(function (f) { if (f.length > this.cols) this.cols = f.length; }, this);
    this.ancho = this.cols * T;
    this.alto = this.filas * T;

    this.celdas = [];
    this.estrellas = [];
    this.enemigos = [];
    this.checkpoints = [];
    this.meta = null;
    this.inicio = { x: T * 2, y: this.alto - T };

    for (var y = 0; y < this.filas; y++) {
      var fila = filas[y], arr = [];
      for (var x = 0; x < this.cols; x++) {
        var ch = fila[x] || '.', celda = '.';
        switch (ch) {
          case 'G': case '#': case '^': celda = ch; break;
          case '*': this.estrellas.push(new R.Estrella(x * T + T / 2, y * T + T / 2)); break;
          case 'C': this.checkpoints.push(new R.Checkpoint(x * T + T / 2, (y + 1) * T)); break;
          case 'F': this.meta = { x: x * T, y: (y + 1) * T }; break;
          case 'P': this.inicio = { x: x * T + 9, y: (y + 1) * T }; break;
          default:
            // 'E' es el enemigo del mundo; las otras letras, un tipo concreto
            var tipoEnemigo = R.tipoEnemigoPorSimbolo(ch, def);
            if (tipoEnemigo) this.enemigos.push(new R.Enemigo(x * T, y * T, tipoEnemigo));
        }
        arr.push(celda);
      }
      this.celdas.push(arr);
    }
    if (!this.meta) this.meta = { x: this.ancho - 2 * T, y: this.alto - T };
  }

  Nivel.prototype.celda = function (cx, cy) {
    if (cx < 0 || cx >= this.cols) return 'G';        // paredes en los bordes
    if (cy < 0 || cy >= this.filas) return '.';       // arriba y abajo: vacío (abajo = pozo)
    return this.celdas[cy][cx];
  };
  Nivel.prototype.esSolido = function (cx, cy) {
    var c = this.celda(cx, cy);
    return c === 'G' || c === '#';
  };
  Nivel.prototype.esPeligro = function (cx, cy) { return this.celda(cx, cy) === '^'; };

  /* ¿Hay algún pincho tocando este rectángulo? (el pincho ocupa la mitad inferior de su celda) */
  Nivel.prototype.peligroEnRect = function (x, y, w, h) {
    var cx0 = Math.floor(x / T), cx1 = Math.floor((x + w - 1) / T);
    var cy0 = Math.floor(y / T), cy1 = Math.floor((y + h - 1) / T);
    for (var cy = cy0; cy <= cy1; cy++) for (var cx = cx0; cx <= cx1; cx++) {
      if (!this.esPeligro(cx, cy)) continue;
      var px = cx * T + 8, py = cy * T + T * 0.45, pw = T - 16, ph = T * 0.55;
      if (x < px + pw && x + w > px && y < py + ph && y + h > py) return true;
    }
    return false;
  };

  R.Nivel = Nivel;
})(window.RUNNER);
