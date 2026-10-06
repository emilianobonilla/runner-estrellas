/* Carrera: varios jugadores corren el mismo nivel desde dispositivos distintos.
   Uno crea la sala y dicta el código de 4 números; los demás lo escriben.
   Cuando están todos listos arranca la cuenta regresiva: gana el primero en
   tocar la bandera y los demás siguen corriendo por el 2º, 3º... puesto.

   EL ANFITRIÓN ES EL ÁRBITRO. Es el único conectado con todos, así que:
     · lleva la lista de corredores y se la reparte a la sala,
     · reenvía las posiciones de todos (y las de los enemigos),
     · decide quién se queda con cada estrella y con cada enemigo pisado
       —por eso desaparecen para TODOS los corredores a la vez—,
     · y arma la tabla de puestos del final.

   Mensajes que un invitado le manda al anfitrión:
     hola     {nombre, personaje,sesion} presentación al conectarse o reconectarse
     personaje {personaje}            cambié mi personaje en la sala
     listo    {listo}                 estoy pronto (o me arrepentí)
     pos      {x,y,vx,m,s,mu,pr,t}    dónde voy, 15 veces por segundo
     pido     {k,i}                   me quedo con la estrella/enemigo número i
     meta     {llego,tiempo,...}      terminé mi carrera
     revancha {}                      quiero volver a la sala
     chau     {}                      me voy

   Mensajes que el anfitrión le manda a la sala:
     bienvenida {jid,max}             tu número de corredor
     sala       {nivelId,jugadores}   la lista completa (con los resultados)
     arrancar   {}                    larguen
     poss       {j:[[jid,x,y,...]]}   dónde va cada uno, 15 veces por segundo
     enes       {e:[[i,x,y,vx]]}      dónde van los enemigos, 10 por segundo
     tomada     {k,i,de}              esa estrella/enemigo es de tal corredor
     vuelve     {i}                   esa estrella volvió a aparecer
     llego      {jid,puesto}          alguien tocó la bandera
     revancha   {}                    todos de vuelta a la sala                 */
(function (R) {
  /* Cuántos corren juntos, contando al anfitrión. Seis es lo que entra cómodo
     en la barra de avance y lo que aguanta la conexión del anfitrión (habla
     con todos). Se puede subir, pero con muchos más la barra se amontona y
     las máquinas lentas empiezan a sufrir. */
  var MAX = 6;
  var HZ = 15;                 // envíos de posición por segundo
  var HZ_ENEMIGOS = 10;        // correcciones de enemigos por segundo (las manda el árbitro)
  var CUENTA = 3;              // segundos de cuenta regresiva
  /* Las estrellas vuelven a aparecer a los 3 segundos de que alguien se las
     lleva, así el que viene último también tiene su oportunidad. Los enemigos
     NO vuelven: al que lo pisó le queda el camino limpio. */
  var VUELVE_ESTRELLA = 3;
  var VISTA = R.ANCHO * 1.5;   // los enemigos se sincronizan solo si hay alguien cerca
  var RESERVA_RECONEXION = 60000; // el anfitrión guarda el lugar un minuto
  var ESPERAS_RECONEXION = [1000, 2000, 4000, 7000, 10000];

  R.MAX_CORREDORES = MAX;

  /* Un color por corredor: se usa en su nombre, en su fantasma y en la barra. */
  var COLORES = ['#ffd23f', '#9ad7ff', '#57cc99', '#ff8fab', '#c792ea', '#ffa94d'];
  R.colorCorredor = function (jid) { return COLORES[((jid % COLORES.length) + COLORES.length) % COLORES.length]; };

  var C = {
    estado: 'inactiva',   // inactiva | conectando | sala | corriendo | fin
    red: null,
    esAnfitrion: false,
    codigo: '',
    miId: 0,              // mi número de corredor (el anfitrión siempre es el 0)
    max: MAX,
    error: '',
    aviso: '',
    reconectando: false,
    jugadores: [],        // [{ jid, peer, nombre, personajeId, listo, conectado, res }]
    nivelId: null,
    yaLargaron: false,    // la carrera ya empezó (para el que entra tarde)
    onCambio: null,       // la interfaz se vuelve a dibujar
    onArrancar: null,     // main.js arranca la partida
    onVolverASala: null,  // main.js corta la partida en curso (revancha del anfitrión)
    _partida: null,
    _abandone: false,     // anfitrión: me fui de la pista pero los demás siguen corriendo
    _avance: null,
    _acum: 0,
    _acumEne: 0,
    _pos: {},             // anfitrión: última posición conocida de cada corredor
    _tomadas: {},         // anfitrión: de quién es cada estrella/enemigo
    _vuelven: [],         // estrellas esperando para volver a aparecer: [{i, t}]
    _sesion: '',          // identifica al mismo dispositivo aunque PeerJS le cambie el peer id
    _puedeReconectar: false,
    _reconexionIntento: 0,
    _reconexionTimer: null,
    _salidaVoluntaria: false
  };

  function avisarCambio() { if (C.onCambio) C.onCambio(); }
  function perfil() { return R.Storage.datos.perfil; }
  function nivelPorId(id) { return R.niveles.filter(function (n) { return n.id === id; })[0] || null; }
  function personajePorId(id) {
    return R.personajes.filter(function (p) { return p.id === id; })[0] || R.personajes[0];
  }
  function personajeValido(id) {
    return R.personajes.some(function (p) { return p.id === id; });
  }
  function miNombre() { return (perfil().nombre || '').trim() || 'Anónimo'; }
  function miPersonaje() { return (R.app.personajeActual() || {}).id; }
  function nuevaSesion() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    return R.uid() + '-' + R.uid();
  }

  C.activa = function () { return C.estado !== 'inactiva'; };
  C.corriendo = function () { return C.estado === 'corriendo'; };
  C.conectada = function () { return !!(C.red && C.red.conectada()); };
  C.soportada = function () { return typeof window.Peer === 'function'; };
  C.nivel = function () { return nivelPorId(C.nivelId) || R.niveles[0]; };

  /* ---------- la lista de corredores ---------- */
  function nuevoJugador(jid, peer, nombre, personajeId, version, sesion) {
    return { jid: jid, peer: peer || null, nombre: nombre, personajeId: personajeId, version: version || '', sesion: sesion || '', listo: false, conectado: true, res: null, espera: false, _reconexionTimer: null };
  }

  C.jugador = function (jid) { return C.jugadores.filter(function (j) { return j.jid === jid; })[0] || null; };
  C.porPeer = function (peer) { return C.jugadores.filter(function (j) { return j.peer === peer; })[0] || null; };
  C.conectados = function () { return C.jugadores.filter(function (j) { return j.conectado; }); };
  C.otros = function () { return C.jugadores.filter(function (j) { return j.jid !== C.miId; }); };
  /* Corredores conectados que juegan otra versión del juego que la mía (con
     versiones distintas los niveles o las reglas pueden no coincidir). */
  C.otraVersion = function () {
    return C.conectados().filter(function (j) { return j.version !== R.VERSION.numero; });
  };
  C.lugaresLibres = function () { return Math.max(0, MAX - C.jugadores.length); };

  /* Yo, o una ficha provisoria mientras el anfitrión todavía no me dio número. */
  C.yo = function () {
    return C.jugador(C.miId) ||
      { jid: -1, nombre: miNombre(), personajeId: miPersonaje(), listo: false, conectado: C.conectada(), res: null };
  };

  /* Se larga cuando hay al menos dos corredores conectados y todos dijeron "listo". */
  C.todosListos = function () {
    var c = C.conectados();
    if (c.length < 2) return false;
    return c.every(function (j) { return j.listo; });
  };

  function proximoJid() {
    for (var n = 1; n < MAX; n++) if (!C.jugador(n)) return n;
    return MAX;   // no debería pasar: la red no deja entrar de más
  }

  function quitarJugador(jid) {
    var j = C.jugador(jid);
    if (j && j._reconexionTimer) clearTimeout(j._reconexionTimer);
    C.jugadores = C.jugadores.filter(function (p) { return p.jid !== jid; });
    delete C._pos[jid];
  }

  function prepararRed() {
    var red = C.red = new R.Red(MAX);
    red.onEstado = alCambiarRed;
    red.onMensaje = alRecibir;
    red.onSale = alSalir;
    return red;
  }

  function cancelarReconexion() {
    if (C._reconexionTimer) clearTimeout(C._reconexionTimer);
    C._reconexionTimer = null;
    C.reconectando = false;
  }

  /* ---------- abrir y cerrar ---------- */
  function arrancarRed(anfitrion) {
    C.estado = 'conectando';
    C.esAnfitrion = anfitrion;
    C.error = ''; C.aviso = '';
    C.miId = anfitrion ? 0 : -1;
    C.max = MAX;
    C.yaLargaron = false;
    C._sesion = nuevaSesion();
    C._puedeReconectar = false;
    C._reconexionIntento = 0;
    C._salidaVoluntaria = false;
    cancelarReconexion();
    C.jugadores = anfitrion ? [nuevoJugador(0, null, miNombre(), miPersonaje(), R.VERSION.numero, C._sesion)] : [];
    C._partida = null; C._pos = {}; C._tomadas = {}; C._vuelven = [];
    C.nivelId = C.nivelId || (R.niveles[0] && R.niveles[0].id);
    prepararRed();
  }

  C.crearSala = function () { arrancarRed(true); C.red.crearSala(); avisarCambio(); };
  C.unirse = function (codigo) { arrancarRed(false); C.red.unirse(codigo); avisarCambio(); };

  C.salir = function () {
    C._salidaVoluntaria = true;
    clearTimeout(C._avance); C._avance = null; C._abandone = false;
    cancelarReconexion();
    C.jugadores.forEach(function (j) { if (j._reconexionTimer) clearTimeout(j._reconexionTimer); });
    if (C.red) {
      if (C.red.conectada()) C.red.enviar(C.esAnfitrion ? 'salaCerrada' : 'chau', {});
      C.red.cerrar();
    }
    C.red = null;
    C.estado = 'inactiva';
    C.jugadores = []; C._partida = null; C._pos = {}; C._tomadas = {}; C._vuelven = [];
    C.error = ''; C.aviso = ''; C._puedeReconectar = false;
  };

  function programarReconexion() {
    if (C.esAnfitrion || C._salidaVoluntaria || !C._puedeReconectar || C.estado === 'inactiva' || C._reconexionTimer) return;
    if (C._reconexionIntento >= ESPERAS_RECONEXION.length) {
      C.reconectando = false;
      C.error = 'No pudimos recuperar la conexión con la sala. Podés probar de nuevo manualmente.';
      avisarCambio();
      return;
    }
    var espera = ESPERAS_RECONEXION[C._reconexionIntento];
    C.reconectando = true;
    C.aviso = 'Reconectando automáticamente… intento ' + (C._reconexionIntento + 1) + ' de ' + ESPERAS_RECONEXION.length + '.';
    C._reconexionTimer = setTimeout(function () {
      C._reconexionTimer = null;
      C._reconexionIntento++;
      var codigo = C.codigo;
      if (C.red) C.red.cerrar();
      prepararRed().unirse(codigo);
      avisarCambio();
    }, espera);
    avisarCambio();
  }

  function alCambiarRed(estado, error) {
    C.codigo = C.red ? C.red.codigo : '';
    if (estado === 'error') {
      if (!C.esAnfitrion && C._puedeReconectar) {
        C.reconectando = true;
        C.aviso = 'La red falló; intentaremos recuperar la sala.';
        return programarReconexion();
      }
      C.error = error;
      if (C.estado !== 'corriendo' && C.estado !== 'fin') C.estado = 'sala';

    } else if (estado === 'conectado') {          // invitado: ya hay canal con el anfitrión
      C.error = '';
      cancelarReconexion();
      if (C.estado === 'conectando') C.estado = 'sala';
      C.red.enviar('hola', { nombre: miNombre(), personaje: miPersonaje(), version: R.VERSION.numero, sesion: C._sesion });

    } else if (estado === 'abierta') {            // anfitrión: la sala quedó abierta
      C.error = '';
      if (C.estado === 'conectando') C.estado = 'sala';

    } else if (estado === 'cerrado') {            // invitado: se cayó el anfitrión
      C.aviso = 'Se cortó la conexión con la sala. Intentaremos recuperarla.';
      C.otros().forEach(function (j) { j.conectado = false; j.listo = false; });
      quietosTodos();
      if (C.estado === 'corriendo' && C._partida) C._partida.avisar('Reconectando… seguí corriendo', 2.5);
      else if (C.estado !== 'fin') C.estado = 'sala';
      programarReconexion();

    } else if (estado === 'preparando' || estado === 'abriendo' || estado === 'conectando') {
      if (!C.reconectando && C.estado !== 'corriendo' && C.estado !== 'fin') C.estado = 'conectando';
    }
    avisarCambio();
  }

  /* Alguien se fue (lo avisa la red, en el anfitrión). */
  function alSalir(peer, definitivo) {
    var j = C.porPeer(peer);
    if (!j) return;
    j.conectado = false; j.listo = false; j.peer = null;
    C.aviso = j.nombre + (definitivo ? ' salió de la sala.' : ' perdió la conexión; guardamos su lugar por un minuto.');
    pararRival(j.jid);
    if (definitivo) {
      if ((C.estado === 'corriendo' || C.estado === 'fin') && !j.res) j.res = { llego: false, abandono: true, tiempo: 0, puntos: 0, estrellas: 0 };
      else if (C.estado !== 'corriendo' && C.estado !== 'fin') quitarJugador(j.jid);
    } else {
      if (j._reconexionTimer) clearTimeout(j._reconexionTimer);
      j._reconexionTimer = setTimeout(function () {
        var reservado = C.jugadores.filter(function (p) { return p.sesion === j.sesion; })[0];
        if (!reservado || reservado.conectado) return;
        if (C.estado === 'corriendo' || C.estado === 'fin') {
          if (!reservado.res) reservado.res = { llego: false, abandono: true, tiempo: 0, puntos: 0, estrellas: 0 };
        } else quitarJugador(reservado.jid);
        C.aviso = reservado.nombre + ' no pudo reconectarse.';
        difundirSala(); avanzarSiAbandone(); avisarCambio();
      }, RESERVA_RECONEXION);
    }
    difundirSala();
    avanzarSiAbandone();
    avisarCambio();
  }

  /* ---------- mensajes ---------- */
  function alRecibir(tipo, d, peer) {
    if (C.esAnfitrion) recibirDeInvitado(tipo, d, peer);
    else recibirDelAnfitrion(tipo, d);
  }

  function recibirDeInvitado(tipo, d, peer) {
    var j = C.porPeer(peer);

    if (tipo === 'hola') {
      var sesion = String(d.sesion || '').slice(0, 64);
      if (!j && sesion) j = C.jugadores.filter(function (p) { return p.sesion === sesion && !p.conectado; })[0] || null;
      if (j) {
        if (j._reconexionTimer) clearTimeout(j._reconexionTimer);
        j._reconexionTimer = null;
        j.peer = peer; j.conectado = true; j.listo = false;
        j.version = String(d.version || j.version || '').slice(0, 12);
        if (personajeValido(d.personaje)) j.personajeId = d.personaje;
        C.aviso = j.nombre + ' se reconectó.';
      } else if (C.jugadores.length >= MAX) {
        C.red.enviarA(peer, 'rechazada', { mensaje: 'La sala está completa; hay lugares reservados para jugadores que se están reconectando.' });
        return;
      }
      if (!j) {
        j = nuevoJugador(proximoJid(), peer, String(d.nombre || 'Corredor').slice(0, 20), d.personaje,
          String(d.version || '').slice(0, 12), sesion);   // las versiones viejas no lo mandan
        j.espera = C.estado === 'corriendo' || C.estado === 'fin' || C._abandone;   // entró con la carrera en marcha
        C.jugadores.push(j);
        C.aviso = j.nombre + ' entró a la sala.';
      }
      C.red.enviarA(peer, 'bienvenida', { jid: j.jid, max: MAX });
      difundirSala();

    } else if (!j) {
      return;                     // todavía no se presentó: lo ignoramos

    } else if (tipo === 'listo') {
      j.listo = !!d.listo;
      difundirSala();
      if (C.estado === 'sala' && C.todosListos()) return largar();   // en plena carrera no se larga otra

    } else if (tipo === 'personaje') {
      if (C.estado !== 'sala' || C.yaLargaron || !personajeValido(d.personaje)) return;
      j.personajeId = d.personaje;
      difundirSala();

    } else if (tipo === 'pos') {
      guardarPosicion(j.jid, d);
      aplicarPosicion(j.jid, d);
      return;                     // 15 veces por segundo: no redibujamos la interfaz

    } else if (tipo === 'pido') {
      arbitrar(d.k === 'x' ? 'x' : 'e', d.i | 0, j.jid);
      return;

    } else if (tipo === 'meta') {
      anotarResultado(j, d);

    } else if (tipo === 'revancha') {
      // Un invitado que ya terminó no corta la carrera de los que siguen
      if (C.estado === 'corriendo' || C.faltanLlegar() > 0) return;
      volverTodosALaSala();
      return;

    } else if (tipo === 'chau') {
      alSalir(peer, true);
      return;
    }
    avisarCambio();
  }

  function recibirDelAnfitrion(tipo, d) {
    if (tipo === 'bienvenida') {
      C.miId = d.jid | 0;
      C.max = d.max || MAX;
      C._puedeReconectar = true;
      C.aviso = C._reconexionIntento ? 'Conexión recuperada.' : '';
      C._reconexionIntento = 0;

    } else if (tipo === 'rechazada') {
      C._salidaVoluntaria = true;
      cancelarReconexion();
      C.error = String(d.mensaje || 'No se pudo volver a entrar a la sala.');
      if (C.red) C.red.cerrar();

    } else if (tipo === 'salaCerrada') {
      C._salidaVoluntaria = true;
      cancelarReconexion();
      C.aviso = 'El anfitrión cerró la sala.';
      if (C.red) C.red.cerrar();

    } else if (tipo === 'sala') {
      aplicarSala(d);

    } else if (tipo === 'arrancar') {
      // Descontamos medio viaje de ida y vuelta para largar todos casi juntos
      return comenzar(Math.max(1.5, CUENTA - (C.red.rtt || 0) / 2000));

    } else if (tipo === 'poss') {
      aplicarPosiciones(d.j);
      return;

    } else if (tipo === 'enes') {
      if (C._partida) C._partida.sincronizarEnemigos(d.e);
      return;

    } else if (tipo === 'tomada') {
      aplicarTomada(d.k === 'x' ? 'x' : 'e', d.i | 0, d.de | 0);
      return;

    } else if (tipo === 'vuelve') {
      if (C._partida) C._partida.revivirEstrella(d.i | 0);
      return;

    } else if (tipo === 'llego') {
      cantarLlegada(d.jid | 0, d.puesto | 0);
      return;

    } else if (tipo === 'revancha') {
      return volverASalaLocal();
    }
    avisarCambio();
  }

  /* El anfitrión manda la lista entera cada vez que cambia algo: así todos
     ven lo mismo sin tener que ir juntando avisos sueltos. */
  function difundirSala() {
    if (!C.esAnfitrion || !C.red) return;
    C.red.enviar('sala', {
      nivelId: C.nivelId,
      yaLargaron: C.estado === 'corriendo' || C.estado === 'fin',
      jugadores: C.jugadores.map(function (j) {
        return {
          jid: j.jid, nombre: j.nombre, personaje: j.personajeId, version: j.version,
          listo: !!j.listo, conectado: !!j.conectado, res: j.res || null, espera: !!j.espera
        };
      })
    });
  }

  function aplicarSala(d) {
    if (nivelPorId(d.nivelId)) C.nivelId = d.nivelId;
    C.yaLargaron = !!d.yaLargaron;
    C.jugadores = (d.jugadores || []).map(function (p) {
      return {
        jid: p.jid | 0, peer: null, nombre: String(p.nombre || 'Corredor').slice(0, 20),
        personajeId: p.personaje, version: String(p.version || '').slice(0, 12), listo: !!p.listo, conectado: !!p.conectado, res: p.res || null, espera: !!p.espera
      };
    });
    // Si alguien se desconectó mientras corremos, su fantasma se queda quieto
    C.jugadores.forEach(function (j) { if (!j.conectado) pararRival(j.jid); });
  }

  /* ---------- sala ---------- */
  C.elegirNivel = function (id) {
    if (!C.esAnfitrion || !nivelPorId(id)) return;
    C.nivelId = id;
    C.jugadores.forEach(function (j) { j.listo = false; });   // cambió el nivel: se vuelve a confirmar
    difundirSala();
    avisarCambio();
  };

  /* El nombre queda fijado al entrar, pero el personaje se puede cambiar en
     la sala hasta que largue la carrera. El anfitrión reparte el cambio para
     que todos vean la misma ficha y creen el rival con el personaje correcto. */
  C.elegirPersonaje = function (id) {
    if (C.estado !== 'sala' || C.yaLargaron || !C.conectada() || !personajeValido(id)) return;
    var yo = C.jugador(C.miId);
    if (!yo || yo.personajeId === id) return;
    perfil().personaje = id;
    R.Storage.guardar();
    yo.personajeId = id;
    if (C.esAnfitrion) difundirSala();
    else C.red.enviar('personaje', { personaje: id });
    avisarCambio();
  };

  C.alternarListo = function () {
    if (!C.conectada()) return;
    var yo = C.jugador(C.miId);
    if (!yo) return;
    yo.listo = !yo.listo;
    if (C.esAnfitrion) {
      difundirSala();
      if (C.estado === 'sala' && C.todosListos()) return largar();
    } else {
      C.red.enviar('listo', { listo: yo.listo });
    }
    avisarCambio();
  };

  /* Nivel que sigue al de esta carrera (null si era el último). */
  C.siguiente = function () {
    var i = R.niveles.indexOf(C.nivel());
    return i >= 0 ? R.niveles[i + 1] || null : null;
  };

  /* Solo el anfitrión: cuando todos terminaron, larga el nivel siguiente sin
     pasar por la sala (la lista nueva con el nivel viaja antes del "arrancar"). */
  C.seguir = function () {
    var sig = C.siguiente();
    if (!C.esAnfitrion || !sig || (C.estado !== 'fin' && !C._abandone) || !C.conectada() || C.faltanLlegar() > 0) return false;
    C.nivelId = sig.id;
    C.jugadores.forEach(function (j) { j.res = null; j.listo = false; });
    difundirSala();
    largar();
    return true;
  };

  function largar() {
    if (!C.esAnfitrion) return;
    C.red.enviar('arrancar', {});
    comenzar(CUENTA);
  }

  function comenzar(cuenta) {
    C.estado = 'corriendo';
    C._abandone = false;
    C.yaLargaron = true;
    C._acum = 0; C._acumEne = 0;
    C._pos = {}; C._tomadas = {}; C._vuelven = [];
    C.jugadores.forEach(function (j) { j.res = null; j.listo = false; j.espera = false; });
    if (C.esAnfitrion) difundirSala();
    if (C.onArrancar) C.onArrancar(C.nivel(), cuenta);
    avisarCambio();
  }

  /* ---------- durante la carrera ---------- */
  C.usarPartida = function (p) {
    C._partida = p;
    p.sigueAlAnfitrion = !C.esAnfitrion;   // los enemigos los comanda el árbitro
    p.miColor = R.colorCorredor(C.miId);
    p.rivales = [];
    p.rivalPorId = {};
    C.otros().forEach(function (j) {
      var r = {
        jid: j.jid, activo: !!j.conectado, nombre: j.nombre, color: R.colorCorredor(j.jid),
        personaje: personajePorId(j.personajeId),
        x: p.nivel.inicio.x, y: p.nivel.inicio.y - 44,
        dx: p.nivel.inicio.x, dy: p.nivel.inicio.y - 44,
        w: 30, h: 44,                      // el mismo cuerpo que el jugador (js/game/player.js)
        vx: 0, mirando: 1, enSuelo: true, muerto: false, prog: 0, tiempo: 0, anim: 0, t: 0, llego: false
      };
      p.rivales.push(r);
      p.rivalPorId[j.jid] = r;
    });
  };

  function pararRival(jid) {
    var p = C._partida;
    if (p && p.rivalPorId && p.rivalPorId[jid]) p.rivalPorId[jid].activo = false;
  }
  function quietosTodos() {
    var p = C._partida;
    if (p && p.rivales) p.rivales.forEach(function (r) { r.activo = false; });
  }

  function guardarPosicion(jid, d) {
    C._pos[jid] = [jid, Number(d.x) || 0, Number(d.y) || 0, Number(d.vx) || 0,
      d.m < 0 ? -1 : 1, d.s ? 1 : 0, d.mu ? 1 : 0, Number(d.pr) || 0, Number(d.t) || 0];
  }

  function aplicarPosicion(jid, d) {
    var p = C._partida; if (!p || !p.rivalPorId) return;
    var r = p.rivalPorId[jid]; if (!r) return;
    r.dx = Number(d.x) || 0;
    r.dy = Number(d.y) || 0;
    r.vx = Number(d.vx) || 0;
    r.mirando = d.m < 0 ? -1 : 1;
    r.enSuelo = !!d.s;
    r.muerto = !!d.mu;
    r.prog = R.clamp(Number(d.pr) || 0, 0, 1);
    r.tiempo = Number(d.t) || 0;
    r.activo = true;
  }

  /* La tanda que reparte el anfitrión: [jid, x, y, vx, mirando, suelo, muerto, avance, tiempo] */
  function aplicarPosiciones(lista) {
    if (!lista) return;
    for (var i = 0; i < lista.length; i++) {
      var a = lista[i];
      if (!a || (a[0] | 0) === C.miId) continue;   // mi propia posición la sé mejor yo
      aplicarPosicion(a[0] | 0, { x: a[1], y: a[2], vx: a[3], m: a[4], s: a[5], mu: a[6], pr: a[7], t: a[8] });
    }
  }

  /* Se llama una vez por cuadro desde el bucle del juego. Puede venir sin
     partida: el anfitrión tiene que seguir devolviendo las estrellas aunque él
     ya haya terminado su carrera y los demás sigan corriendo. */
  C.tick = function (p, dt) {
    var anfitrionFuera = C.esAnfitrion && (C.estado === 'fin' || C._abandone);   // terminé o abandoné, pero otros siguen
    if (C.estado !== 'corriendo' && C.estado !== 'fin' && !anfitrionFuera) return;
    devolverEstrellas(dt);
    if (anfitrionFuera && C.conectada() && C.faltanLlegar() > 0) {
      // Ya terminé pero otros siguen: sigo de relé para que se vean entre ellos
      C._acum += dt;
      if (C._acum >= 1 / HZ) { C._acum = 0; C.red.enviar('poss', { j: listaPosiciones() }); }
      return;
    }
    if (!p || C.estado !== 'corriendo' || !C.conectada()) return;
    var j = p.jugador;

    C._acum += dt;
    if (C._acum >= 1 / HZ) {
      C._acum = 0;
      var mio = {
        x: Math.round(j.x), y: Math.round(j.y), vx: Math.round(j.vx),
        m: j.mirando, s: j.enSuelo ? 1 : 0, mu: p.estado === 'muriendo' ? 1 : 0,
        pr: Math.round(p.progreso() * 1000) / 1000,
        t: Math.round(p.tiempo * 10) / 10
      };
      if (C.esAnfitrion) {
        guardarPosicion(C.miId, mio);
        C.red.enviar('poss', { j: listaPosiciones() });
      } else {
        C.red.enviar('pos', mio);
      }
    }

    // Los enemigos los maneja el anfitrión: manda dónde va cada uno y los
    // demás corrigen de a poco lo que venían simulando por su cuenta.
    if (C.esAnfitrion) {
      C._acumEne += dt;
      if (C._acumEne >= 1 / HZ_ENEMIGOS) { C._acumEne = 0; enviarEnemigos(p); }
    }
  };

  function listaPosiciones() {
    var lista = [];
    for (var k in C._pos) if (C._pos.hasOwnProperty(k)) lista.push(C._pos[k]);
    return lista;
  }

  function enviarEnemigos(p) {
    var xs = [p.jugador.x], lista = [], i;
    for (i = 0; i < p.rivales.length; i++) if (p.rivales[i].activo) xs.push(p.rivales[i].x);
    for (i = 0; i < p.nivel.enemigos.length; i++) {
      var e = p.nivel.enemigos[i];
      if (!e.vivo || !cercaDeAlguien(e.x, xs)) continue;
      lista.push([i, Math.round(e.x), Math.round(e.y), Math.round(e.vx)]);
    }
    if (lista.length) C.red.enviar('enes', { e: lista });
  }

  function cercaDeAlguien(x, xs) {
    for (var i = 0; i < xs.length; i++) if (Math.abs(x - xs[i]) < VISTA) return true;
    return false;
  }

  /* ---------- estrellas y enemigos compartidos ---------- */
  /* La partida avisa que toqué una estrella ('e') o pisé un enemigo ('x').
     El árbitro decide de quién es: si dos llegan casi juntos, gana el que
     avisó primero, pero el bicho desaparece para todos igual. */
  C.pedir = function (k, i) {
    if (C.estado !== 'corriendo') return;
    if (C.esAnfitrion) return arbitrar(k, i, C.miId);
    if (C.conectada()) return C.red.enviar('pido', { k: k, i: i });
    // Sin red seguimos la carrera en solitario: me la quedo y me la devuelvo yo
    aplicarTomada(k, i, C.miId);
    if (k === 'e') programarVuelta(i);
  };

  function arbitrar(k, i, jid) {
    var clave = k + i;
    if (C._tomadas[clave] != null) return;   // llegó tarde: ya era de otro
    C._tomadas[clave] = jid;
    C.red.enviar('tomada', { k: k, i: i, de: jid });
    aplicarTomada(k, i, jid);
    if (k === 'e') programarVuelta(i);
  }

  /* La estrella number i vuelve a aparecer en unos segundos. El reloj lo lleva
     el árbitro (o cada uno, si se cortó la red), así vuelve a la vez para todos. */
  function programarVuelta(i) {
    for (var n = 0; n < C._vuelven.length; n++) if (C._vuelven[n].i === i) return;
    C._vuelven.push({ i: i, t: VUELVE_ESTRELLA });
  }

  function devolverEstrellas(dt) {
    for (var n = C._vuelven.length - 1; n >= 0; n--) {
      var v = C._vuelven[n];
      v.t -= dt;
      if (v.t > 0) continue;
      C._vuelven.splice(n, 1);
      delete C._tomadas['e' + v.i];          // vuelve a estar en juego
      if (C.esAnfitrion) C.red.enviar('vuelve', { i: v.i });
      if (C._partida) C._partida.revivirEstrella(v.i);
    }
  }

  function aplicarTomada(k, i, jid) {
    if (!C._partida) return;
    var j = C.jugador(jid);
    C._partida.aplicarToma(k, i, jid === C.miId, j ? j.nombre : 'otro corredor');
  }

  /* ---------- llegadas y puestos ---------- */
  /* Toqué la bandera: lo avisamos enseguida, sin esperar la animación. */
  C.avisarMeta = function (p) {
    registrarMiResultado({
      llego: true, tiempo: Math.round(p.tiempo * 10) / 10,
      puntos: p.puntos, estrellas: p.estrellas
    });
  };

  /* Terminó mi partida (llegué, me quedé sin ganas o abandoné). */
  C.terminar = function (res) {
    if (C.estado !== 'corriendo') return;
    C.estado = 'fin';
    registrarMiResultado({
      llego: !!res.completado, tiempo: res.tiempo, puntos: res.puntos, estrellas: res.estrellas
    });
    avisarCambio();
  };

  function registrarMiResultado(r) {
    var res = {
      llego: !!r.llego, abandono: !!r.abandono,
      tiempo: Number(r.tiempo) || 0, puntos: Number(r.puntos) || 0, estrellas: Number(r.estrellas) || 0
    };
    if (C.esAnfitrion) return anotarResultado(C.jugador(C.miId), res);
    var yo = C.jugador(C.miId);
    if (yo) yo.res = res;                    // el anfitrión lo confirma al mandar la lista
    if (C.conectada()) C.red.enviar('meta', res);
  }

  /* Solo en el anfitrión: anota el resultado y, si es una llegada, canta el puesto. */
  function anotarResultado(j, d) {
    if (!j) return;
    var primeraVez = !j.res;
    j.res = {
      llego: !!d.llego, abandono: !!d.abandono,
      tiempo: Number(d.tiempo) || 0, puntos: Number(d.puntos) || 0, estrellas: Number(d.estrellas) || 0
    };
    if (j.res.llego && primeraVez) {
      var puesto = puestoDe(j.jid);
      C.red.enviar('llego', { jid: j.jid, puesto: puesto });
      cantarLlegada(j.jid, puesto);
    }
    difundirSala();
    avanzarSiAbandone();
    avisarCambio();
  }

  /* Si el anfitrión abandonó la pista, la pantalla de resultados no está para
     avanzar: cuando el último termina, él lleva a todos al nivel siguiente (o a la sala). */
  function avanzarSiAbandone() {
    if (!C.esAnfitrion || !C._abandone || C._avance || C.faltanLlegar() > 0) return;
    C._avance = setTimeout(function () {
      C._avance = null;
      if (!C._abandone || C.faltanLlegar() > 0) return;
      if (!C.seguir()) C.pedirRevancha();
    }, 5000);
  }

  function puestoDe(jid) {
    var llegaron = C.jugadores.filter(function (j) { return j.res && j.res.llego; }).sort(porTiempo);
    for (var i = 0; i < llegaron.length; i++) if (llegaron[i].jid === jid) return i + 1;
    return 0;
  }

  function porTiempo(a, b) {
    if (Math.abs(a.res.tiempo - b.res.tiempo) >= 0.05) return a.res.tiempo - b.res.tiempo;
    return a.jid - b.jid;    // empate al décimo de segundo: el que entró antes a la sala
  }

  /* Cartel en pantalla cuando alguien toca la bandera (a los demás no los corta:
     la carrera sigue para ver quién sale 2º, 3º...). */
  function cantarLlegada(jid, puesto) {
    var p = C._partida;
    if (jid === C.miId || !p) return;
    var j = C.jugador(jid);
    var r = p.rivalPorId && p.rivalPorId[jid];
    if (r) r.llego = true;
    p.avisar('🏁 ' + (j ? j.nombre : 'Otro corredor') + ' llegó ' + (puesto || 1) + 'º — ¡seguí!', 2.2);
  }

  /* ---------- resultados ---------- */
  /* Tabla de puestos: primero los que llegaron (por tiempo), después los que
     terminaron sin llegar (por puntos) y al final los que siguen corriendo. */
  C.ranking = function () {
    return C.jugadores.filter(function (j) { return !j.espera; }).sort(function (a, b) {
      var ga = a.res ? (a.res.llego ? 0 : 1) : 2;
      var gb = b.res ? (b.res.llego ? 0 : 1) : 2;
      if (ga !== gb) return ga - gb;
      if (ga === 0) return porTiempo(a, b);
      if (ga === 1) return (b.res.puntos - a.res.puntos) || (a.jid - b.jid);
      return a.jid - b.jid;
    });
  };

  C.miPuesto = function () {
    var r = C.ranking();
    for (var i = 0; i < r.length; i++) if (r[i].jid === C.miId) return i + 1;
    return 0;
  };

  /* Corredores que todavía están en la pista (los esperamos para cerrar la tabla). */
  C.faltanLlegar = function () {
    // Cuenta también a los que perdieron la conexión: tienen el lugar guardado un minuto
    return C.jugadores.filter(function (j) { return !j.espera && !j.res; }).length;
  };

  C.abandonar = function () {
    C._abandone = C.esAnfitrion;   // antes de anotar el resultado: ahí se decide si avanzar
    registrarMiResultado({ llego: false, abandono: true, tiempo: 0, puntos: 0, estrellas: 0 });
    C.estado = 'sala';
    var yo = C.jugador(C.miId);
    if (yo) yo.listo = false;
    if (!C.esAnfitrion && C.conectada()) C.red.enviar('listo', { listo: false });
    C._partida = null;
    avisarCambio();
  };

  /* Revancha: el anfitrión lleva a TODOS de vuelta a la sala (aunque alguno
     siga corriendo); un invitado solo se vuelve él. */
  C.pedirRevancha = function () {
    if (C.esAnfitrion) volverTodosALaSala();
    else {
      if (C.conectada()) C.red.enviar('revancha', {});
      volverASalaLocal();
    }
  };

  function volverTodosALaSala() {
    if (!C.esAnfitrion) return;
    C.jugadores.forEach(function (j) { j.res = null; j.listo = false; j.espera = false; });
    C.red.enviar('revancha', {});
    volverASalaLocal();
    difundirSala();
  }

  function volverASalaLocal() {
    var corria = C.estado === 'corriendo';
    C.estado = 'sala';
    C._abandone = false;
    C.yaLargaron = false;
    C._partida = null;
    var yo = C.jugador(C.miId);
    if (yo) { yo.listo = false; yo.res = null; }
    if (corria && C.onVolverASala) C.onVolverASala();   // cortar la partida que seguía
    avisarCambio();
  }

  R.Carrera = C;
})(window.RUNNER);
