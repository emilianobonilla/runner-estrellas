/* Sonidos sintetizados con WebAudio: no necesita archivos externos. */
(function (R) {
  function Audio() { this.ctx = null; this.silencio = false; }

  Audio.prototype._contexto = function () {
    if (!this.ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  };

  Audio.prototype.tono = function (freq, dur, tipo, vol, deslizar) {
    if (this.silencio) return;
    try {
      var c = this._contexto(); if (!c) return;
      var o = c.createOscillator(), g = c.createGain();
      o.type = tipo || 'square';
      o.frequency.setValueAtTime(freq, c.currentTime);
      if (deslizar) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + deslizar), c.currentTime + dur);
      g.gain.setValueAtTime(vol || 0.08, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
      o.connect(g); g.connect(c.destination);
      o.start(); o.stop(c.currentTime + dur + 0.02);
    } catch (e) { /* sin audio */ }
  };

  Audio.prototype.salto = function () { this.tono(280, 0.16, 'square', 0.05, 320); };
  Audio.prototype.estrella = function () {
    var self = this;
    this.tono(880, 0.08, 'triangle', 0.08);
    setTimeout(function () { self.tono(1320, 0.14, 'triangle', 0.08); }, 70);
  };
  Audio.prototype.golpe = function () { this.tono(220, 0.35, 'sawtooth', 0.09, -160); };
  Audio.prototype.pisar = function () { this.tono(160, 0.12, 'square', 0.08, -110); };
  Audio.prototype.checkpoint = function () {
    var self = this;
    this.tono(660, 0.1, 'triangle', 0.08);
    setTimeout(function () { self.tono(990, 0.16, 'triangle', 0.08); }, 90);
  };
  Audio.prototype.victoria = function () {
    var self = this;
    [523, 659, 784, 1047].forEach(function (f, i) {
      setTimeout(function () { self.tono(f, 0.28, 'triangle', 0.1); }, i * 130);
    });
  };
  Audio.prototype.derrota = function () {
    var self = this;
    [392, 330, 262].forEach(function (f, i) {
      setTimeout(function () { self.tono(f, 0.3, 'square', 0.06); }, i * 160);
    });
  };
  Audio.prototype.clic = function () { this.tono(600, 0.05, 'square', 0.03); };

  R.Audio = Audio;
})(window.RUNNER);
