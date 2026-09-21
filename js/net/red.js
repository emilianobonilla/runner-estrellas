/* Red: conexión directa entre dos dispositivos (WebRTC vía PeerJS).
   El anfitrión abre una sala con un código de 4 dígitos y el otro jugador lo escribe.
   Solo el modo Carrera usa esto: el resto del juego sigue andando sin internet. */
(function (R) {
  var PREFIJO = 'runner-estrellas-';   // evita chocar con otras aplicaciones del servidor público
  var ESPERA = 15000;                  // ms máximos para abrir la sala o encontrar al anfitrión
  var PING = 2000;                     // ms entre mediciones de latencia
  var SILENCIO = 12000;                // ms sin recibir nada = damos la conexión por perdida

  var MENSAJES = {
    'browser-incompatible': 'Este navegador no puede conectarse con otros dispositivos. Probá con Chrome, Edge o Firefox.',
    'peer-unavailable': 'No encontramos ninguna sala con ese código. Fijate que esté bien escrito y que el otro jugador tenga abierta la pantalla de la sala.',
    'network': 'Se cortó la conexión con el servidor de salas. ¿Hay internet?',
    'server-error': 'El servidor de salas no responde. Probá de nuevo en un rato.',
    'socket-error': 'No pudimos llegar al servidor de salas. Revisá que haya internet.',
    'socket-closed': 'Se cortó la conexión con el servidor de salas.',
    'ssl-unavailable': 'La red está bloqueando la conexión segura con el servidor de salas.',
    'webrtc': 'No se pudo abrir la conexión directa entre los dos dispositivos. Puede que la red la esté bloqueando.',
    'unavailable-id': 'Ese código ya está en uso.',
    'invalid-id': 'Ese código no es válido.',
    'timeout': 'Tardó demasiado. Revisá que haya internet y probá de nuevo.'
  };

  function codigoAlAzar() {
    return String(Math.floor(Math.random() * 10000) + 10000).slice(1);   // siempre 4 dígitos
  }

  /* Deja solo dígitos: así "12 34" o "1.234" también sirven. */
  R.normalizarCodigo = function (cod) {
    return String(cod == null ? '' : cod).replace(/\D/g, '').slice(0, 4);
  };

  function Red() {
    this.peer = null;
    this.con = null;
    this.codigo = '';
    this.esAnfitrion = false;
    this.estado = 'inactivo';   // inactivo | abriendo | esperando | conectando | conectado | cerrado | error
    this.error = '';
    this.rtt = 0;
    this.onEstado = null;       // function (estado, error)
    this.onMensaje = null;      // function (tipo, datos)
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
    this.peer = null; this.con = null;
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
      self._ir('esperando');
    });

    peer.on('connection', function (con) {
      if (self.con) { try { con.close(); } catch (e) {} return; }   // la sala es de a dos
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
    this.con = con;

    con.on('open', function () {
      self._limpiarRelojes();
      self._ir('conectado');
      self._ultimo = Date.now();
      self._latido = setInterval(function () {
        // Si el otro cierra la pestaña o se queda sin señal no siempre llega el aviso:
        // lo damos por desconectado cuando pasa demasiado tiempo sin recibir nada.
        if (Date.now() - self._ultimo > SILENCIO) return self._perderConexion();
        self.enviar('__ping', { n: Date.now() });
      }, PING);
      self.enviar('__ping', { n: Date.now() });
    });

    con.on('data', function (m) {
      self._ultimo = Date.now();
      if (!m || typeof m.t !== 'string') return;
      if (m.t === '__ping') return self.enviar('__pong', { n: m.d && m.d.n });
      if (m.t === '__pong') {
        var ida = Date.now() - (m.d && m.d.n || Date.now());
        self.rtt = self.rtt ? Math.round(self.rtt * 0.6 + ida * 0.4) : ida;
        return;
      }
      if (self.onMensaje) self.onMensaje(m.t, m.d || {});
    });

    con.on('close', function () { self._perderConexion(); });

    con.on('error', function () { /* el evento close se encarga de avisar */ });
  };

  Red.prototype._perderConexion = function () {
    if (!this.con && this.estado !== 'conectado') return;
    if (this.con) { try { this.con.close(); } catch (e) {} }
    this.con = null;
    this._limpiarRelojes();
    this.rtt = 0;
    // Si somos anfitriones la sala sigue abierta: puede volver a entrar alguien con el mismo código
    if (this.esAnfitrion && this.peer && !this.peer.destroyed) this._ir('esperando');
    else this._ir('cerrado');
  };

  Red.prototype.enviar = function (tipo, datos) {
    if (!this.con || !this.con.open) return false;
    try { this.con.send({ t: tipo, d: datos || {} }); return true; }
    catch (e) { return false; }
  };

  Red.prototype.conectada = function () { return this.estado === 'conectado' && this.con && this.con.open; };

  Red.prototype.cerrar = function () {
    this._cerradaPorMi = true;
    this._limpiarRelojes();
    if (this.con) { try { this.con.close(); } catch (e) {} }
    this._destruirPeer();
    this.estado = 'cerrado';
  };

  R.Red = Red;
})(window.RUNNER);
