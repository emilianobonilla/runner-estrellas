/* Red: conexión directa entre varios dispositivos (WebRTC vía PeerJS).
   La sala tiene forma de estrella: el anfitrión abre un código de 4 dígitos y
   todos los demás se conectan a él. Como es el único que habla con todos,
   el anfitrión también hace de árbitro de la carrera (ver js/net/carrera.js).
   Solo el modo Carrera usa esto: el resto del juego sigue andando sin internet. */
(function (R) {
  var PREFIJO = 'runner-estrellas-';   // evita chocar con otras aplicaciones del servidor público
  var ESPERA = 15000;                  // ms máximos para abrir la sala o encontrar al anfitrión
  var PING = 2000;                     // ms entre mediciones de latencia
  var SILENCIO = 12000;                // ms sin recibir nada = damos la conexión por perdida

  var MENSAJES = {
    'browser-incompatible': 'Este navegador no puede conectarse con otros dispositivos. Probá con Chrome, Edge o Firefox.',
    'peer-unavailable': 'No encontramos ninguna sala con ese código. Fijate que esté bien escrito y que el anfitrión tenga abierta la pantalla de la sala.',
    'network': 'Se cortó la conexión con el servidor de salas. ¿Hay internet?',
    'server-error': 'El servidor de salas no responde. Probá de nuevo en un rato.',
    'socket-error': 'No pudimos llegar al servidor de salas. Revisá que haya internet.',
    'socket-closed': 'Se cortó la conexión con el servidor de salas.',
    'ssl-unavailable': 'La red está bloqueando la conexión segura con el servidor de salas.',
    'webrtc': 'No se pudo abrir la conexión directa entre los dispositivos. Puede que la red la esté bloqueando.',
    'unavailable-id': 'Ese código ya está en uso.',
    'invalid-id': 'Ese código no es válido.',
    'sala-llena': 'Esa sala ya está completa. Pedile al anfitrión que abra otra o esperá a la próxima carrera.',
    'timeout': 'Tardó demasiado. Revisá que haya internet y probá de nuevo.'
  };

  function codigoAlAzar() {
    return String(Math.floor(Math.random() * 10000) + 10000).slice(1);   // siempre 4 dígitos
  }

  /* Deja solo dígitos: así "12 34" o "1.234" también sirven. */
  R.normalizarCodigo = function (cod) {
    return String(cod == null ? '' : cod).replace(/\D/g, '').slice(0, 4);
  };

  /* maxJugadores cuenta al anfitrión: con 6, entran 5 invitados. */
  function Red(maxJugadores) {
    this.maxInvitados = Math.max(1, (maxJugadores || 2) - 1);
    this.peer = null;
    this.conexiones = [];       // [{ con, rtt, ultimo }] — al invitado le queda una sola: el anfitrión
    this.codigo = '';
    this.esAnfitrion = false;
    this.estado = 'inactivo';   // inactivo | abriendo | abierta | conectando | conectado | cerrado | error
    this.error = '';
    this.rtt = 0;               // latencia al anfitrión (invitado) o la peor de la sala (anfitrión)
    this.onEstado = null;       // function (estado, error)
    this.onMensaje = null;      // function (tipo, datos, peer)
    this.onEntra = null;        // function (peer)        se conectó alguien
    this.onSale = null;         // function (peer)        se fue alguien
    this._intentos = 0;
    this._reloj = null;
    this._latido = null;
    this._cerradaPorMi = false;
  }

  Red.prototype.soportado = function () { return typeof window.Peer === 'function'; };

  Red.prototype._ir = function (estado, error) {
    if (this._cerradaPorMi) return;   // el jugador ya salió: no avisamos más cambios
    this.estado = estado;
    this.error = error || '';
    if (this.onEstado) this.onEstado(estado, this.error);
  };

  Red.prototype._fallar = function (tipo) {
    this._limpiarRelojes();
    this._ir('error', MENSAJES[tipo] || ('Falló la conexión (' + tipo + ').'));
    this._destruirPeer();
  };

  Red.prototype._limpiarRelojes = function () {
    if (this._reloj) { clearTimeout(this._reloj); this._reloj = null; }
    if (this._latido) { clearInterval(this._latido); this._latido = null; }
  };

  Red.prototype._destruirPeer = function () {
    if (this.peer) { try { this.peer.destroy(); } catch (e) { /* ya estaba cerrado */ } }
    this.peer = null; this.conexiones = [];
  };

  /* ---------- anfitrión ---------- */
  Red.prototype.crearSala = function () {
    if (!this.soportado()) return this._fallar('browser-incompatible');
    this.esAnfitrion = true;
    this._intentos = 0;
    this._abrirSala();
  };

  Red.prototype._abrirSala = function () {
    var self = this;
    this.codigo = codigoAlAzar();
    this._ir('abriendo');

    var peer = this.peer = new window.Peer(PREFIJO + this.codigo, { debug: 0 });
    this._reloj = setTimeout(function () { self._fallar('timeout'); }, ESPERA);

    peer.on('open', function () {
      clearTimeout(self._reloj); self._reloj = null;
      self._ir('abierta');
    });

    peer.on('connection', function (con) {
      // La sala tiene lugares contados: al que llega de más le avisamos y cerramos
      if (self.conexiones.length >= self.maxInvitados) {
        con.on('open', function () {
          try { con.send({ t: '__llena', d: {} }); } catch (e) {}
          setTimeout(function () { try { con.close(); } catch (e) {} }, 400);
        });
        return;
      }
      self._tomarConexion(con);
    });

    peer.on('error', function (err) {
      // Código ocupado: probamos con otro sin molestar al jugador
      if (err && err.type === 'unavailable-id' && self._intentos < 5) {
        self._intentos++;
        self._limpiarRelojes();
        self._destruirPeer();
        return self._abrirSala();
      }
      self._fallar(err && err.type);
    });

    peer.on('disconnected', function () { try { peer.reconnect(); } catch (e) {} });
  };

  /* ---------- invitado ---------- */
  Red.prototype.unirse = function (codigo) {
    if (!this.soportado()) return this._fallar('browser-incompatible');
    var self = this;
    this.esAnfitrion = false;
    this.codigo = R.normalizarCodigo(codigo);
    this._ir('conectando');

    var peer = this.peer = new window.Peer(null, { debug: 0 });
    this._reloj = setTimeout(function () { self._fallar('timeout'); }, ESPERA);

    peer.on('open', function () {
      self._tomarConexion(peer.connect(PREFIJO + self.codigo, { reliable: true }));
    });
    peer.on('error', function (err) { self._fallar(err && err.type); });
    peer.on('disconnected', function () { try { peer.reconnect(); } catch (e) {} });
  };

  /* ---------- canal de datos ---------- */
  Red.prototype._tomarConexion = function (con) {
    var self = this;
    var c = { con: con, rtt: 0, ultimo: Date.now() };
    this.conexiones.push(c);

    con.on('open', function () {
      c.ultimo = Date.now();
      if (!self.esAnfitrion) { self._limpiarRelojes(); self._ir('conectado'); }
      self._arrancarLatido();
      self._pingar(c);
      if (self.onEntra) self.onEntra(con.peer);
      if (self.esAnfitrion) self._ir('abierta');   // que la sala se vuelva a dibujar
    });

    con.on('data', function (m) {
      c.ultimo = Date.now();
      if (!m || typeof m.t !== 'string') return;
      if (m.t === '__ping') { try { con.send({ t: '__pong', d: { n: m.d && m.d.n } }); } catch (e) {} return; }
      if (m.t === '__pong') {
        var ida = Date.now() - ((m.d && m.d.n) || Date.now());
        c.rtt = c.rtt ? Math.round(c.rtt * 0.6 + ida * 0.4) : ida;
        self._recalcularRtt();
        return;
      }
      if (m.t === '__llena') return self._fallar('sala-llena');
      if (self.onMensaje) self.onMensaje(m.t, m.d || {}, con.peer);
    });

    con.on('close', function () { self._perderConexion(c); });
    con.on('error', function () { /* el evento close se encarga de avisar */ });
  };

  /* Un solo reloj para toda la sala: mide latencia y detecta a los que se colgaron. */
  Red.prototype._arrancarLatido = function () {
    var self = this;
    if (this._latido) return;
    this._latido = setInterval(function () {
      for (var i = self.conexiones.length - 1; i >= 0; i--) {
        var c = self.conexiones[i];
        // Si el otro cierra la pestaña o se queda sin señal no siempre llega el aviso:
        // lo damos por desconectado cuando pasa demasiado tiempo sin recibir nada.
        if (Date.now() - c.ultimo > SILENCIO) self._perderConexion(c);
        else self._pingar(c);
      }
    }, PING);
  };

  Red.prototype._pingar = function (c) {
    try { c.con.send({ t: '__ping', d: { n: Date.now() } }); } catch (e) {}
  };

  Red.prototype._recalcularRtt = function () {
    var peor = 0;
    for (var i = 0; i < this.conexiones.length; i++) peor = Math.max(peor, this.conexiones[i].rtt);
    this.rtt = peor;
  };

  Red.prototype._perderConexion = function (c) {
    var i = this.conexiones.indexOf(c);
    if (i < 0) return;                      // ya la habíamos dado de baja
    this.conexiones.splice(i, 1);
    try { c.con.close(); } catch (e) {}
    this._recalcularRtt();
    if (this.onSale) this.onSale(c.con.peer);
    if (this.esAnfitrion) {
      // La sala sigue abierta: puede entrar otro con el mismo código
      if (!this.conexiones.length) this.rtt = 0;
      this._ir('abierta');
    } else {
      this._limpiarRelojes();
      this.rtt = 0;
      this._ir('cerrado');
    }
  };

  /* ---------- envíos ---------- */
  function mandar(c, tipo, datos) {
    if (!c || !c.con || !c.con.open) return false;
    try { c.con.send({ t: tipo, d: datos || {} }); return true; }
    catch (e) { return false; }
  }

  /* Invitado: al anfitrión. Anfitrión: a toda la sala. */
  Red.prototype.enviar = function (tipo, datos) {
    var ok = false;
    for (var i = 0; i < this.conexiones.length; i++) ok = mandar(this.conexiones[i], tipo, datos) || ok;
    return ok;
  };

  /* A toda la sala menos a uno (sirve para reenviar lo que mandó ese mismo). */
  Red.prototype.difundirSalvo = function (peer, tipo, datos) {
    for (var i = 0; i < this.conexiones.length; i++) {
      if (this.conexiones[i].con.peer === peer) continue;
      mandar(this.conexiones[i], tipo, datos);
    }
  };

  Red.prototype.enviarA = function (peer, tipo, datos) {
    for (var i = 0; i < this.conexiones.length; i++) {
      if (this.conexiones[i].con.peer === peer) return mandar(this.conexiones[i], tipo, datos);
    }
    return false;
  };

  /* ¿Se puede jugar? El anfitrión necesita la sala abierta; el invitado, su conexión. */
  Red.prototype.conectada = function () {
    if (this.esAnfitrion) return this.estado === 'abierta' && !!this.peer;
    return this.estado === 'conectado' && !!this.conexiones[0] && this.conexiones[0].con.open;
  };

  Red.prototype.cantidad = function () { return this.conexiones.length; };

  Red.prototype.cerrar = function () {
    this._cerradaPorMi = true;
    this._limpiarRelojes();
    for (var i = 0; i < this.conexiones.length; i++) { try { this.conexiones[i].con.close(); } catch (e) {} }
    this.conexiones = [];
    this._destruirPeer();
    this.estado = 'cerrado';
  };

  R.Red = Red;
})(window.RUNNER);
