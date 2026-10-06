/* Arranque: escala el lienzo, corre el bucle de juego y conecta
   entrada, HUD, controles táctiles y pantallas. */
(function (R) {
  var canvas = document.getElementById('juego');
  var marco = document.getElementById('marco');
  var escenario = document.getElementById('escenario');
  var hudEl = document.getElementById('hud');
  var touchEl = document.getElementById('touch');

  var input = new R.Input();
  var audio = new R.Audio();
  var datos = R.Storage.cargar();
  var render = new R.Renderer(canvas);
  var partida = null;
  var actual = null;   // { nivelDef, contexto } de la partida en curso o recién terminada

  audio.silencio = !datos.perfil.sonido;
  R.ordenarNiveles();   // primero por mundo, después por el orden del nivel

  /* ---------- tamaño ---------- */
  function ajustar() {
    var w = escenario.clientWidth, h = escenario.clientHeight;
    var esc = Math.min(w / R.ANCHO, h / R.ALTO);
    marco.style.width = Math.floor(R.ANCHO * esc) + 'px';
    marco.style.height = Math.floor(R.ALTO * esc) + 'px';
  }
  window.addEventListener('resize', ajustar);
  ajustar();

  /* ---------- pantalla completa ---------- */
  var FS = R.Fullscreen;
  var hudFs = document.getElementById('hud-fs');
  // El botón ⛶ solo tiene sentido si el navegador lo soporta y no corre ya como app instalada
  var fsDisponible = FS.soportado() && !FS.instalada();
  hudFs.classList.toggle('oculto', !fsDisponible);
  hudFs.addEventListener('click', function () { FS.alternar().catch(function () {}); });
  function pantallaCompletaAlJugar() {
    if (!fsDisponible || !datos.perfil.pantallaCompleta || FS.activo()) return;
    FS.entrar().catch(function () { /* el navegador lo rechazó: seguimos en ventana */ });
  }
  FS.onCambio(function () {
    hudFs.title = FS.activo() ? 'Salir de pantalla completa' : 'Pantalla completa';
    ajustar();
    // Si el jugador sale de pantalla completa (Esc) en medio del nivel, pausamos
    if (!FS.activo() && partida && partida.estado === 'jugando') pausar();
    else if (R.UI.refrescar) R.UI.refrescar();
  });

  /* ---------- controles táctiles ---------- */
  var esTactil = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  function actualizarTactil() {
    var pref = datos.perfil.tactil;
    var mostrar = pref === 'si' || (pref === 'auto' && esTactil);
    touchEl.classList.toggle('oculto', !(mostrar && partida));
    // Con botones táctiles en pantalla el cartelito de versión estorbaría el
    // botón de saltar (mismo rincón): se esconde hasta salir del nivel.
    versionEl.classList.toggle('oculto', !!(mostrar && partida));
  }
  Array.prototype.forEach.call(touchEl.querySelectorAll('.touch-boton'), function (b) {
    var accion = b.dataset.tecla;
    function abajo(e) { e.preventDefault(); input.tocar(accion, true); b.classList.add('activo'); }
    function arriba(e) { e.preventDefault(); input.tocar(accion, false); b.classList.remove('activo'); }
    b.addEventListener('pointerdown', abajo);
    b.addEventListener('pointerup', arriba);
    b.addEventListener('pointercancel', arriba);
    b.addEventListener('pointerleave', arriba);
    b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  });

  /* ---------- HUD ---------- */
  var hud = {
    estrellas: document.getElementById('hud-estrellas'),
    puntos: document.getElementById('hud-puntos'),
    vidas: document.getElementById('hud-vidas'),
    tiempo: document.getElementById('hud-tiempo'),
    nombre: document.getElementById('hud-nombre')
  };
  var ultimoHUD = {};
  function setHUD(k, v) { if (ultimoHUD[k] !== v) { ultimoHUD[k] = v; hud[k].textContent = v; } }
  function actualizarHUD(p) {
    setHUD('estrellas', p.estrellas + '/' + p.totalEstrellas);
    setHUD('puntos', String(p.puntosPrevios + p.puntos));
    setHUD('vidas', p.infinitas ? '∞' : 'x' + p.vidas);
    setHUD('tiempo', R.formatearTiempo(p.tiempo));
  }
  document.getElementById('hud-pausa').addEventListener('click', function () { pausar(); });
  input.onPausa = function () {
    if (!partida) return;
    if (esCarrera()) { if (R.UI.pantalla === 'pausaCarrera') continuar(); else R.UI.pausaCarrera(); return; }
    if (partida.estado === 'jugando') pausar();
    else if (partida.estado === 'pausa') continuar();
  };

  /* ---------- cartelito de versión ---------- */
  // Para saber siempre qué versión se está probando (js/core/version.js).
  // El enlace lleva al código exacto de esa versión en GitHub.
  var versionEl = document.getElementById('version');
  versionEl.textContent = R.versionCorta();
  versionEl.href = R.versionURL();
  versionEl.title = R.versionTexto() + ' — ver este código en GitHub';

  // Si en la web ya hay otra versión publicada, el cartelito avisa y al
  // tocarlo recarga la página: así todos quedan jugando la misma.
  function hayVersionNueva(numero) {
    versionEl.textContent = '⬆ v' + numero + ' disponible · tocá para actualizar';
    versionEl.title = 'Estás jugando la ' + R.versionTexto() + '. Tocá para cargar la v' + numero + '.';
    versionEl.classList.add('nueva');
    versionEl.removeAttribute('target');
    versionEl.onclick = function (e) {
      e.preventDefault();
      // Se cambia la URL para que el navegador pida de nuevo el index.html (y con él los ?v= nuevos)
      location.replace(location.pathname + '?actualizar=' + Date.now());
    };
  }
  R.buscarVersionNueva(hayVersionNueva);
  // Y cada vez que se vuelve a la pestaña (por si quedó abierta de otro día)
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && !versionEl.classList.contains('nueva')) R.buscarVersionNueva(hayVersionNueva);
  });

  /* ---------- perfil ---------- */
  function personajeDe(ctx) {
    if (ctx && ctx.tipo === 'competencia') {
      var c = R.Storage.competencia(ctx.id);
      var id = c && R.Storage.personajeDe(c, ctx.jugador);
      var p = R.personajes.filter(function (x) { return x.id === id; })[0];
      if (p) return p;
    }
    return personajeActual();
  }
  function personajeActual() {
    return R.personajes.filter(function (p) { return p.id === datos.perfil.personaje; })[0] || R.personajes[0];
  }
  function temaPara(nivelDef) {
    // La estética la define el mundo del nivel (data/worlds.js); no se elige
    return R.temaDe(nivelDef) || R.temas[Object.keys(R.temas)[0]];
  }

  /* ---------- flujo de partida ---------- */
  function esCarrera() { return !!(actual && actual.contexto.tipo === 'carrera'); }

  /* Vidas del recorrido completo: se arranca con 3 y se van gastando nivel a
     nivel. Solo vuelven a 3 al empezar un recorrido nuevo (elegir un nivel en
     el menú, "Jugar de nuevo" o después del fin del juego); pasar al nivel
     siguiente o reintentar el nivel desde la pausa conserva las que quedan. */
  var vidas = R.VIDAS_INICIALES;
  /* Puntaje del recorrido: suma los niveles ya pasados con las 3 vidas. Se anota
     recién al terminar un nivel, así que reiniciarlo desde la pausa no deja
     repetir estrellas para sumar de más. */
  var puntosRecorrido = 0;

  function iniciarPartida(nivelDef, contexto, seguir) {
    contexto = contexto || { tipo: 'libre', nombre: datos.perfil.nombre || 'Anónimo' };
    var carrera = contexto.tipo === 'carrera';
    if (!seguir) { vidas = R.VIDAS_INICIALES; puntosRecorrido = 0; }
    // "inicio" es el nivel con el que arrancó el recorrido: "Jugar de nuevo" vuelve ahí
    actual = { nivelDef: nivelDef, contexto: contexto, inicio: seguir && actual && actual.inicio ? actual.inicio : nivelDef };
    pantallaCompletaAlJugar();
    R.UI.ocultar();
    partida = new R.Partida(nivelDef, {
      personaje: personajeDe(contexto), tema: temaPara(nivelDef), audio: audio, input: input,
      nombre: contexto.nombre,
      vidas: vidas,
      puntosPrevios: puntosRecorrido,
      infinitas: carrera,                                   // en la carrera se reaparece siempre
      cuenta: carrera ? (contexto.cuenta || 3) : 0,
      alLlegar: carrera ? function (p) { R.Carrera.avisarMeta(p); } : null,
      // En la carrera las estrellas y los enemigos son de todos: los reparte el árbitro
      pedirToma: carrera ? function (k, i) { R.Carrera.pedir(k, i); } : null,
      alTerminar: function (res) { terminar(res); }
    });
    if (carrera) R.Carrera.usarPartida(partida);
    ultimoHUD = {};
    hud.nombre.textContent = contexto.nombre || '';
    hudEl.classList.remove('oculto');
    input.reiniciar();
    input.activo = true;
    actualizarTactil();
  }

  function terminar(res) {
    var ctx = actual.contexto;
    vidas = res.vidas;          // lo que sobró se lleva al nivel siguiente
    puntosRecorrido = res.total;
    partida = null;
    input.activo = false;
    hudEl.classList.add('oculto');
    actualizarTactil();
    var esRecord = R.Storage.registrarPuntaje(res);
    var mejoro = false;
    if (ctx.tipo === 'competencia') mejoro = R.Storage.registrarResultadoCompetencia(ctx.id, ctx.jugador, res);
    if (ctx.tipo === 'carrera') { R.Carrera.terminar(res); return R.UI.resultadosCarrera(res); }
    // En una competencia sigue el próximo jugador en el mismo nivel; recién cuando todos jugaron se pasa al siguiente
    if (ctx.tipo === 'competencia') {
      var c = R.Storage.competencia(ctx.id), t = c && R.Storage.proximoTurno(c);
      if (!t) return R.UI.verCompetencia(ctx.id, '¡Todos jugaron todos los niveles!');
      return R.UI.turnoCompetencia(c, t, res, mejoro);
    }
    // Como en Mario: al pasar un nivel se sigue con el próximo sin volver a elegir
    var sig = res.completado && siguienteDe(res.nivelId, ctx);
    if (sig) return seguirConEl(sig, ctx, res);
    R.UI.resultados(res, ctx, esRecord, mejoro);
  }

  /* Próximo nivel del recorrido: en el modo libre, el que sigue en la lista;
     en una competencia, el que sigue entre los niveles de esa competencia. */
  function siguienteDe(nivelId, ctx) {
    var ids;
    if (ctx.tipo === 'competencia') {
      var c = R.Storage.competencia(ctx.id);
      ids = c ? c.niveles : [];
    } else if (ctx.tipo === 'libre') {
      ids = R.niveles.map(function (n) { return n.id; });
    } else return null;
    for (var i = ids.indexOf(nivelId) + 1; i > 0 && i < ids.length; i++) {
      var def = R.niveles.filter(function (n) { return n.id === ids[i]; })[0];
      if (def) return def;
    }
    return null;
  }

  /* Cartelito de transición y arranque automático del nivel siguiente. */
  var seguirToken = 0;
  function seguirConEl(sig, ctx, res) {
    var token = ++seguirToken;
    R.UI.transicion(sig, res, vidas);
    setTimeout(function () { if (token === seguirToken) seguirYa(sig.id); }, 2800);
  }
  function seguirYa(id) {
    if (!actual) return;
    var def = R.niveles.filter(function (n) { return n.id === id; })[0];
    if (!def) return;
    seguirToken++;
    iniciarPartida(def, actual.contexto, true);
  }
  function cancelarSeguir() { seguirToken++; }

  // En la carrera el reloj no se detiene: en vez de pausar mostramos un cartel encima.
  function pausar() {
    if (!partida) return;
    if (esCarrera()) return R.UI.pausaCarrera();
    if (partida.estado !== 'jugando') return;
    partida.pausar(); R.UI.pausa();
  }
  function continuar() { if (!partida) return; partida.continuar(); R.UI.ocultar(); input.reiniciar(); }
  function reiniciar(seguir) {
    if (seguir && partida) vidas = partida.vidas;   // las vidas ya perdidas en este intento no se recuperan
    if (actual) iniciarPartida(seguir ? actual.nivelDef : actual.inicio || actual.nivelDef, actual.contexto, seguir);
  }
  /* Deja la partida sin avisarle a nadie (lo usa la revancha del anfitrión). */
  function cortarPartida() {
    partida = null; input.activo = false;
    hudEl.classList.add('oculto'); actualizarTactil();
  }

  function abandonar() {
    cortarPartida();
    var ctx = actual && actual.contexto;
    if (ctx && ctx.tipo === 'carrera') { R.Carrera.abandonar(); return R.UI.carreraSala(); }
    if (ctx && ctx.tipo === 'competencia') R.UI.verCompetencia(ctx.id); else R.UI.menu();
  }

  /* ---------- bucle ---------- */
  var ultimo = performance.now(), acumulado = 0, PASO = 1 / 120;
  function frame(ahora) {
    var dt = Math.min(0.1, (ahora - ultimo) / 1000);
    ultimo = ahora;
    try {
      if (partida) {
        acumulado += dt;
        var pasos = 0;
        while (acumulado >= PASO && pasos < 10 && partida) {
          input.actualizar();
          partida.actualizar(PASO);
          acumulado -= PASO; pasos++;
        }
        if (partida) { render.dibujar(partida, dt); actualizarHUD(partida); }
      } else {
        render.escenaMenu(temaPara(R.niveles[0]), personajeActual(), dt);
      }
      // Va siempre, con partida o sin ella: el anfitrión tiene que seguir
      // devolviendo las estrellas aunque él ya haya terminado su carrera.
      R.Carrera.tick(partida, dt);
    } catch (e) {
      // Un error de dibujo o lógica no debe congelar el juego
      console.error('Error en el bucle del juego:', e);
    }
    requestAnimationFrame(frame);
  }

  /* ---------- utilidades para la interfaz ---------- */
  R.app = {
    datos: datos, audio: audio, input: input,
    siguienteDe: siguienteDe, seguirYa: seguirYa, cancelarSeguir: cancelarSeguir,
    iniciarPartida: iniciarPartida, pausar: pausar, continuar: continuar, reiniciar: reiniciar, abandonar: abandonar,
    personajeActual: personajeActual, personajeDe: personajeDe, temaPara: temaPara, actualizarTactil: actualizarTactil,
    cortarPartida: cortarPartida,
    vidas: function () { return vidas; },
    esCarrera: esCarrera,
    fsDisponible: fsDisponible,
    partida: function () { return partida; },

    dibujarPersonajeEn: function (cv, per) {
      var ctx = cv.getContext('2d');
      ctx.clearRect(0, 0, cv.width, cv.height);
      R.dibujarPersonaje(ctx, per, cv.width / 2, cv.height - 10, { enSuelo: true, mirando: 1, vx: 0, t: 0, esc: Math.min(1.35, (cv.height - 8) / 95) });
    },

    descargarJSON: function (nombre, obj) {
      var blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = nombre;
      document.body.appendChild(a); a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800);
    },

    leerJSON: function (archivo, cb) {
      var r = new FileReader();
      r.onload = function () { try { cb(null, JSON.parse(r.result)); } catch (e) { cb(e); } };
      r.onerror = function () { cb(r.error); };
      r.readAsText(archivo);
    }
  };

  /* ---------- carrera entre varios dispositivos ---------- */
  R.Carrera.onArrancar = function (nivelDef, cuenta) {
    iniciarPartida(nivelDef, { tipo: 'carrera', nombre: R.Carrera.yo().nombre, cuenta: cuenta });
  };
  R.Carrera.onCambio = function () { if (R.UI.alCambiarCarrera) R.UI.alCambiarCarrera(); };
  // El anfitrión pidió revancha mientras yo todavía corría: corto y vuelvo a la sala
  R.Carrera.onVolverASala = function () { cortarPartida(); R.UI.carreraSala(); };
  // Al cerrar la pestaña avisamos a la sala en vez de dejarlos esperando
  window.addEventListener('pagehide', function () { if (R.Carrera.activa()) R.Carrera.salir(); });

  R.UI.menu();
  requestAnimationFrame(frame);
})(window.RUNNER);
