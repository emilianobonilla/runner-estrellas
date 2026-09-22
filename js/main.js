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
    setHUD('puntos', String(p.puntos));
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

  /* ---------- perfil ---------- */
  function personajeActual() {
    return R.personajes.filter(function (p) { return p.id === datos.perfil.personaje; })[0] || R.personajes[0];
  }
  function temaPara(nivelDef) {
    var pref = datos.perfil.tema;
    if (pref && pref !== 'auto' && R.temas[pref]) return R.temas[pref];
    // Si no hay preferencia, manda la estética del mundo del nivel
    return R.temaDe(nivelDef) || R.temas[Object.keys(R.temas)[0]];
  }

  /* ---------- flujo de partida ---------- */
  function esCarrera() { return !!(actual && actual.contexto.tipo === 'carrera'); }

  /* Vidas del recorrido completo: se arranca con 3 y se van gastando nivel a
     nivel. Solo vuelven a 3 al empezar un recorrido nuevo (elegir un nivel en
     el menú, "Jugar de nuevo" o después del fin del juego); pasar al nivel
     siguiente o reintentar el nivel desde la pausa conserva las que quedan. */
  var vidas = R.VIDAS_INICIALES;

  function iniciarPartida(nivelDef, contexto, seguir) {
    contexto = contexto || { tipo: 'libre', nombre: datos.perfil.nombre || 'Anónimo' };
    var carrera = contexto.tipo === 'carrera';
    if (!seguir) vidas = R.VIDAS_INICIALES;
    actual = { nivelDef: nivelDef, contexto: contexto };
    pantallaCompletaAlJugar();
    R.UI.ocultar();
    partida = new R.Partida(nivelDef, {
      personaje: personajeActual(), tema: temaPara(nivelDef), audio: audio, input: input,
      nombre: contexto.nombre,
      vidas: vidas,
      infinitas: carrera,                                   // en la carrera se reaparece siempre
      cuenta: carrera ? (contexto.cuenta || 3) : 0,
      alLlegar: carrera ? function (p) { R.Carrera.avisarMeta(p); } : null,
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
    partida = null;
    input.activo = false;
    hudEl.classList.add('oculto');
    actualizarTactil();
    var esRecord = R.Storage.registrarPuntaje(res);
    var mejoro = false;
    if (ctx.tipo === 'competencia') mejoro = R.Storage.registrarResultadoCompetencia(ctx.id, ctx.jugador, res);
    if (ctx.tipo === 'carrera') { R.Carrera.terminar(res); return R.UI.resultadosCarrera(res); }
    R.UI.resultados(res, ctx, esRecord, mejoro);
  }

  // En la carrera el reloj no se detiene: en vez de pausar mostramos un cartel encima.
  function pausar() {
    if (!partida) return;
    if (esCarrera()) return R.UI.pausaCarrera();
    if (partida.estado !== 'jugando') return;
    partida.pausar(); R.UI.pausa();
  }
  function continuar() { if (!partida) return; partida.continuar(); R.UI.ocultar(); input.reiniciar(); }
  function reiniciar(seguir) { if (actual) iniciarPartida(actual.nivelDef, actual.contexto, seguir); }
  function abandonar() {
    partida = null; input.activo = false;
    hudEl.classList.add('oculto'); actualizarTactil();
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
        if (partida) {
          R.Carrera.tick(partida, dt);
          render.dibujar(partida, dt); actualizarHUD(partida);
        }
      } else {
        if (R.Carrera.activa()) R.Carrera.descontarEspera(dt);
        render.escenaMenu(temaPara(R.niveles[0]), personajeActual(), dt);
      }
    } catch (e) {
      // Un error de dibujo o lógica no debe congelar el juego
      console.error('Error en el bucle del juego:', e);
    }
    requestAnimationFrame(frame);
  }

  /* ---------- utilidades para la interfaz ---------- */
  R.app = {
    datos: datos, audio: audio, input: input,
    iniciarPartida: iniciarPartida, pausar: pausar, continuar: continuar, reiniciar: reiniciar, abandonar: abandonar,
    personajeActual: personajeActual, temaPara: temaPara, actualizarTactil: actualizarTactil,
    vidas: function () { return vidas; },
    esCarrera: esCarrera,
    fsDisponible: fsDisponible,
    partida: function () { return partida; },

    dibujarPersonajeEn: function (cv, per) {
      var ctx = cv.getContext('2d');
      ctx.clearRect(0, 0, cv.width, cv.height);
      R.dibujarPersonaje(ctx, per, cv.width / 2, cv.height - 10, { enSuelo: true, mirando: 1, vx: 0, t: 0, esc: 1.35 });
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

  /* ---------- carrera entre dos dispositivos ---------- */
  R.Carrera.onArrancar = function (nivelDef, cuenta) {
    iniciarPartida(nivelDef, { tipo: 'carrera', nombre: R.Carrera.yo.nombre, cuenta: cuenta });
  };
  R.Carrera.onCambio = function () { if (R.UI.alCambiarCarrera) R.UI.alCambiarCarrera(); };
  // Al cerrar la pestaña avisamos al rival en vez de dejarlo esperando
  window.addEventListener('pagehide', function () { if (R.Carrera.activa()) R.Carrera.salir(); });

  R.UI.menu();
  requestAnimationFrame(frame);
})(window.RUNNER);
