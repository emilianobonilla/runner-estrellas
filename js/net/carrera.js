/* Carrera: partida de dos jugadores en dispositivos distintos.
   Uno crea la sala y comparte el código; el otro lo escribe. Cuando los dos
   están listos arranca la cuenta regresiva y gana el primero en tocar la meta.

   Mensajes que viajan por la red:
     hola     {nombre, personaje}     presentación al conectarse
     nivel    {nivelId}               el anfitrión elige en qué nivel se corre
     listo    {listo}                 cada uno avisa que está pronto
     arrancar {}                      el anfitrión larga la cuenta regresiva
     pos      {x,y,vx,m,s,mu,pr,t}    posición y avance, 15 veces por segundo
     meta     {tiempo,puntos,...}     llegué a la meta (o terminé)
     revancha {}                      volver a la sala para correr de nuevo   */
(function (R) {
  var HZ = 15;                 // envíos de posición por segundo
  var CUENTA = 3;              // segundos de cuenta regresiva
  var ESPERA_RIVAL = 6;        // segundos que esperamos su resultado antes de decidir

  var C = {
    estado: 'inactiva',   // inactiva | conectando | sala | corriendo | fin
    red: null,
    esAnfitrion: false,
    codigo: '',
    error: '',
    aviso: '',
    yo: null,             // { nombre, personajeId, listo }
    rival: null,          // { nombre, personajeId, listo, conectado }
    nivelId: null,
    miResultado: null,
    resultadoRival: null,
    onCambio: null,       // la interfaz se vuelve a dibujar
    onArrancar: null,     // main.js arranca la partida
    _partida: null,
    _acum: 0,
    _espera: 0
  };

  function avisarCambio() { if (C.onCambio) C.onCambio(); }
  function perfil() { return R.Storage.datos.perfil; }
  function nivelPorId(id) { return R.niveles.filter(function (n) { return n.id === id; })[0] || null; }
  function personajePorId(id) {
    return R.personajes.filter(function (p) { return p.id === id; })[0] || R.personajes[0];
  }

  C.activa = function () { return C.estado !== 'inactiva'; };
  C.corriendo = function () { return C.estado === 'corriendo'; };
  C.conectada = function () { return !!(C.red && C.red.conectada()); };
  C.soportada = function () { return typeof window.Peer === 'function'; };
  C.nivel = function () { return nivelPorId(C.nivelId) || R.niveles[0]; };
  C.listosLosDos = function () { return !!(C.yo && C.yo.listo && C.rival && C.rival.listo); };

  /* ---------- abrir y cerrar ---------- */
  function arrancarRed(anfitrion) {
    C.estado = 'conectando';
    C.esAnfitrion = anfitrion;
    C.error = ''; C.aviso = '';
    C.rival = null;
    C.miResultado = null; C.resultadoRival = null;
    C._partida = null;
    C.nivelId = C.nivelId || (R.niveles[0] && R.niveles[0].id);
    C.yo = {
      nombre: (perfil().nombre || '').trim() || 'Anónimo',
      personajeId: (R.app.personajeActual() || {}).id,
      listo: false
    };
    C.red = new R.Red();
    C.red.onEstado = alCambiarRed;
    C.red.onMensaje = alRecibir;
  }

  C.crearSala = function () { arrancarRed(true); C.red.crearSala(); avisarCambio(); };
  C.unirse = function (codigo) { arrancarRed(false); C.red.unirse(codigo); avisarCambio(); };

  C.salir = function () {
    if (C.red) { if (C.red.conectada()) C.red.enviar('chau', {}); C.red.cerrar(); }
    C.red = null;
    C.estado = 'inactiva';
    C.rival = null; C.yo = null; C._partida = null;
    C.miResultado = null; C.resultadoRival = null;
    C.error = ''; C.aviso = '';
  };

  function alCambiarRed(estado, error) {
    C.codigo = C.red ? C.red.codigo : '';
    if (estado === 'error') {
      C.error = error;
      C.estado = 'sala';
    } else if (estado === 'conectado') {
      C.error = '';
      C.estado = 'sala';
      C.red.enviar('hola', { nombre: C.yo.nombre, personaje: C.yo.personajeId });
      if (C.esAnfitrion) C.red.enviar('nivel', { nivelId: C.nivelId });
    } else if (estado === 'esperando' || estado === 'cerrado') {
      // Si ya habíamos jugado juntos, es que el otro se fue
      if (C.rival) {
        C.aviso = C.rival.nombre + ' se desconectó.';
        C.rival.conectado = false;
        if (C.estado === 'corriendo' && C._partida) {
          // La carrera sigue en solitario: se puede terminar el nivel igual
          C._partida.avisar('Se cortó la conexión con ' + C.rival.nombre, 2.5);
          if (C._partida.rival) C._partida.rival.activo = false;
        } else C.rival = null;
      }
      if (C.yo) C.yo.listo = false;
      if (C.estado !== 'corriendo' && C.estado !== 'fin') C.estado = 'sala';
    } else if (estado === 'abriendo' || estado === 'conectando') {
      C.estado = 'conectando';
    }
    avisarCambio();
  }

  /* ---------- mensajes ---------- */
  function alRecibir(tipo, d) {
    if (tipo === 'hola') {
      C.rival = { nombre: String(d.nombre || 'Rival').slice(0, 20), personajeId: d.personaje, listo: false, conectado: true };
      C.aviso = '';
      if (C.esAnfitrion) C.red.enviar('nivel', { nivelId: C.nivelId });

    } else if (tipo === 'nivel') {
      if (!C.esAnfitrion && nivelPorId(d.nivelId)) { C.nivelId = d.nivelId; if (C.yo) C.yo.listo = false; }

    } else if (tipo === 'listo') {
      if (C.rival) C.rival.listo = !!d.listo;
      if (C.esAnfitrion && C.listosLosDos()) return largar();

    } else if (tipo === 'arrancar') {
      // Descontamos medio viaje de ida y vuelta para largar los dos casi al mismo tiempo
      comenzar(Math.max(1.5, CUENTA - (C.red.rtt || 0) / 2000));

    } else if (tipo === 'pos') {
      aplicarPosicion(d);
      return;   // 15 veces por segundo: no redibujamos la interfaz

    } else if (tipo === 'meta') {
      C.resultadoRival = {
        llego: !!d.llego, abandono: false,
        tiempo: Number(d.tiempo) || 0, puntos: Number(d.puntos) || 0, estrellas: Number(d.estrellas) || 0
      };
      if (C.estado === 'corriendo' && C._partida && d.llego) C._partida.perderCarrera(C.rival ? C.rival.nombre : 'El rival');

    } else if (tipo === 'revancha') {
      volverALaSala();

    } else if (tipo === 'chau') {
      if (C.estado === 'corriendo' && C._partida) {
        C.resultadoRival = { llego: false, abandono: true, tiempo: 0, puntos: 0, estrellas: 0 };
        C._partida.avisar((C.rival ? C.rival.nombre : 'El rival') + ' abandonó', 2.5);
        if (C._partida.rival) C._partida.rival.activo = false;
      }
      if (C.rival) { C.rival.conectado = false; C.rival.listo = false; }
    }
    avisarCambio();
  }

  /* ---------- sala ---------- */
  C.elegirNivel = function (id) {
    if (!C.esAnfitrion || !nivelPorId(id)) return;
    C.nivelId = id;
    if (C.yo) C.yo.listo = false;
    if (C.rival) C.rival.listo = false;
    C.red.enviar('nivel', { nivelId: id });
    C.red.enviar('listo', { listo: false });
    avisarCambio();
  };

  C.alternarListo = function () {
    if (!C.yo || !C.conectada()) return;
    C.yo.listo = !C.yo.listo;
    C.red.enviar('listo', { listo: C.yo.listo });
    if (C.esAnfitrion && C.listosLosDos()) return largar();
    avisarCambio();
  };

  function largar() {
    C.red.enviar('arrancar', {});
    comenzar(CUENTA);
  }

  function comenzar(cuenta) {
    C.estado = 'corriendo';
    C.miResultado = null;
    C.resultadoRival = null;
    C._acum = 0;
    if (C.onArrancar) C.onArrancar(C.nivel(), cuenta);
    avisarCambio();
  }

  /* ---------- durante la carrera ---------- */
  C.usarPartida = function (p) {
    C._partida = p;
    p.rival = {
      activo: !!C.rival, nombre: C.rival ? C.rival.nombre : '',
      personaje: personajePorId(C.rival && C.rival.personajeId),
      x: p.nivel.inicio.x, y: p.nivel.inicio.y - 44, dx: p.nivel.inicio.x, dy: p.nivel.inicio.y - 44,
      vx: 0, mirando: 1, enSuelo: true, muerto: false, prog: 0, tiempo: 0, anim: 0, t: 0, llego: false
    };
  };

  function aplicarPosicion(d) {
    var p = C._partida; if (!p || !p.rival) return;
    var r = p.rival;
    r.dx = Number(d.x) || 0;
    r.dy = Number(d.y) || 0;
    r.vx = Number(d.vx) || 0;
    r.mirando = d.m < 0 ? -1 : 1;
    r.enSuelo = !!d.s;
    r.muerto = !!d.mu;
    r.prog = R.clamp(Number(d.pr) || 0, 0, 1);
    r.tiempo = Number(d.t) || 0;
  }

  /* Se llama una vez por cuadro desde el bucle del juego. */
  C.tick = function (p, dt) {
    if (C.estado !== 'corriendo' || !C.conectada()) return;
    C._acum += dt;
    if (C._acum < 1 / HZ) return;
    C._acum = 0;
    var j = p.jugador;
    C.red.enviar('pos', {
      x: Math.round(j.x), y: Math.round(j.y), vx: Math.round(j.vx),
      m: j.mirando, s: j.enSuelo ? 1 : 0, mu: p.estado === 'muriendo' ? 1 : 0,
      pr: Math.round(p.progreso() * 1000) / 1000,
      t: Math.round(p.tiempo * 10) / 10
    });
  };

  /* El jugador tocó la bandera: avisamos enseguida, sin esperar la animación. */
  C.avisarMeta = function (p) {
    if (C.estado !== 'corriendo') return;
    C.red.enviar('meta', {
      llego: true, tiempo: Math.round(p.tiempo * 10) / 10,
      puntos: p.puntos, estrellas: p.estrellas
    });
  };

  /* Terminó mi partida (llegué, me alcanzaron o abandoné). */
  C.terminar = function (res) {
    if (C.estado !== 'corriendo') return;
    C.estado = 'fin';
    C.miResultado = {
      llego: !!res.completado, abandono: false,
      tiempo: res.tiempo, puntos: res.puntos, estrellas: res.estrellas
    };
    if (!res.completado) C.red.enviar('meta', { llego: false, tiempo: res.tiempo, puntos: res.puntos, estrellas: res.estrellas });
    C._espera = ESPERA_RIVAL;
    avisarCambio();
  };

  C.abandonar = function () {
    if (C.red) C.red.enviar('chau', {});
    C.estado = 'sala';
    C.miResultado = null; C.resultadoRival = null;
    if (C.yo) C.yo.listo = false;
    // El otro sigue corriendo su carrera: no puede largar una nueva hasta que vuelva a la sala
    if (C.rival) C.rival.listo = false;
    C._partida = null;
    avisarCambio();
  };

  /* Cuenta atrás mientras esperamos el resultado del rival (la usa la pantalla de resultados). */
  C.esperandoRival = function () {
    return C.estado === 'fin' && !C.resultadoRival && C.rival && C.rival.conectado && C._espera > 0;
  };
  C.descontarEspera = function (dt) {
    if (C._espera > 0) {
      C._espera -= dt;
      if (C._espera <= 0) avisarCambio();
    }
  };

  /* Quién ganó. Los dos dispositivos llegan siempre a la misma conclusión:
     gana el que tocó la meta; si los dos llegaron, el de menor tiempo;
     si empatan al décimo de segundo, el anfitrión. */
  C.resultado = function () {
    var mio = C.miResultado, suyo = C.resultadoRival;
    if (!mio) return 'corriendo';
    if (!suyo) return C.esperandoRival() ? 'esperando' : 'sin-datos';
    if (suyo.abandono) return 'gane';
    if (mio.llego && !suyo.llego) return 'gane';
    if (!mio.llego && suyo.llego) return 'perdi';
    if (!mio.llego && !suyo.llego) return 'ninguno';
    if (Math.abs(mio.tiempo - suyo.tiempo) < 0.05) return C.esAnfitrion ? 'gane' : 'perdi';
    return mio.tiempo < suyo.tiempo ? 'gane' : 'perdi';
  };

  C.pedirRevancha = function () {
    if (C.red) C.red.enviar('revancha', {});
    volverALaSala();
    avisarCambio();
  };

  function volverALaSala() {
    C.estado = 'sala';
    C.miResultado = null; C.resultadoRival = null;
    C._partida = null;
    if (C.yo) C.yo.listo = false;
    if (C.rival) C.rival.listo = false;
  }

  R.Carrera = C;
})(window.RUNNER);
