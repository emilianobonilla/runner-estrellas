/* Pantallas de interfaz (DOM): menú, selección de nivel, personalizar,
   ranking, competencias, pausa y resultados. */
(function (R) {
  var cont = document.getElementById('pantallas');
  var esc = R.esc;
  var UI = {};

  function datos() { return R.Storage.datos; }
  function nivel(id) { return R.niveles.filter(function (n) { return n.id === id; })[0] || null; }
  function personajeActual() { return R.app.personajeActual(); }

  UI.mostrar = function (html, op) {
    UI.refrescar = null;   // pantalla a redibujar cuando cambia el modo pantalla completa
    cont.innerHTML = html;
    cont.classList.remove('oculto');
    cont.classList.toggle('transparente', !!(op && op.transparente));
    cont.scrollTop = 0;
    // Dibuja previsualizaciones de personajes si las hay
    cont.querySelectorAll('canvas[data-personaje]').forEach(function (cv) {
      var per = R.personajes.filter(function (p) { return p.id === cv.dataset.personaje; })[0];
      if (per) R.app.dibujarPersonajeEn(cv, per);
    });
    var foco = cont.querySelector('[autofocus]'); if (foco) foco.focus();
  };
  UI.ocultar = function () { cont.classList.add('oculto'); cont.innerHTML = ''; UI.refrescar = null; };

  /* ---------- helpers de plantilla ---------- */
  function botonVolver(accion, texto) {
    return '<button class="btn chico" data-accion="' + (accion || 'menu') + '">← ' + (texto || 'Menú') + '</button>';
  }
  function muestraTema(t) {
    return '<div class="muestra-tema" style="background:linear-gradient(' + t.cielo[0] + ',' + t.cielo[1] + ')">' +
      '<div class="colina" style="background:' + t.colinas[0] + '"></div>' +
      '<div class="suelo" style="background:' + t.sueloRelleno + ';border-top:5px solid ' + t.sueloTop + '"></div></div>';
  }
  function botonPantallaCompleta() {
    if (!R.app.fsDisponible) return '';
    return '<button class="btn" data-accion="pantallaCompleta">⛶ &nbsp;' + (R.Fullscreen.activo() ? 'Salir de pantalla completa' : 'Pantalla completa') + '</button>';
  }
  function avisoIOS() {
    if (!(R.Fullscreen.esIOS() && !R.Fullscreen.instalada())) return '';
    return '<p class="aviso" style="margin-top:12px">📱 Para jugar a pantalla completa en iPhone o iPad: tocá <b>Compartir</b> y luego <b>Agregar a pantalla de inicio</b>. Abrilo desde ahí.</p>';
  }
  function nombreJugador() { return (datos().perfil.nombre || '').trim() || 'Anónimo'; }

  /* ================= MENÚ ================= */
  UI.menu = function () {
    var per = personajeActual();
    UI.mostrar(
      '<div class="panel angosto centrado">' +
      '<h1 class="titulo">Runner de <span class="estrella">Estrellas</span></h1>' +
      '<p class="subtitulo">Corré, saltá y juntá todas las estrellas</p>' +
      '<div class="botones">' +
      '<button class="btn principal" data-accion="jugar">▶ &nbsp;Jugar</button>' +
      '<button class="btn" data-accion="competencias">🏁 &nbsp;Competencias</button>' +
      '<button class="btn" data-accion="ranking">🏆 &nbsp;Ranking</button>' +
      '<button class="btn" data-accion="personalizar">🎨 &nbsp;Personalizar</button>' +
      '<button class="btn" data-accion="comoJugar">❓ &nbsp;Cómo jugar</button>' +
      botonPantallaCompleta() +
      '</div>' +
      '<p class="aviso" style="margin-top:18px">Jugás como <b>' + esc(nombreJugador()) + '</b> con <b>' + esc(per.nombre) + '</b></p>' +
      avisoIOS() +
      '</div>', { transparente: true });
    UI.refrescar = UI.menu;
  };

  /* ================= JUGAR: elegir nivel ================= */
  UI.jugar = function () {
    var prog = datos().progreso;
    var tarjetas = R.niveles.map(function (n, i) {
      var p = prog[n.id] || {};
      var total = new R.Nivel(n).estrellas.length;
      return '<div class="tarjeta" data-accion="iniciarNivel" data-arg="' + esc(n.id) + '">' +
        '<span class="num">Nivel ' + (i + 1) + '</span>' +
        '<h4>' + esc(n.nombre) + (p.completado ? ' <span class="check">✓</span>' : '') + '</h4>' +
        '<div class="meta">' + esc(n.descripcion || '') + '</div>' +
        '<div class="meta" style="margin-top:8px">⭐ ' + (p.mejorEstrellas || 0) + '/' + total + ' &nbsp; 🏆 ' + (p.mejorPuntaje || 0) + '</div>' +
        '</div>';
    }).join('');
    UI.mostrar(
      '<div class="panel">' +
      '<div class="barra-superior"><h2>Elegí un nivel</h2>' + botonVolver('menu') + '</div>' +
      '<label class="campo"><span>Tu nombre</span><input type="text" maxlength="20" data-campo="nombre" placeholder="Escribí tu nombre" value="' + esc(datos().perfil.nombre) + '"></label>' +
      '<div class="tarjetas">' + tarjetas + '</div>' +
      '<p class="aviso" style="margin-top:16px">Personaje: <b>' + esc(personajeActual().nombre) + '</b> · <a href="#" data-accion="personalizar" style="color:var(--acento2)">cambiar</a></p>' +
      '</div>');
  };

  /* ================= PERSONALIZAR ================= */
  UI.personalizar = function () {
    var perfil = datos().perfil;
    var personajes = R.personajes.map(function (p) {
      return '<div class="tarjeta centrado ' + (p.id === personajeActual().id ? 'sel' : '') + '" data-accion="elegirPersonaje" data-arg="' + esc(p.id) + '">' +
        '<canvas width="110" height="110" data-personaje="' + esc(p.id) + '"></canvas>' +
        '<h4>' + esc(p.nombre) + '</h4><div class="meta">' + esc(p.descripcion || '') + '</div></div>';
    }).join('');
    var temas = '<div class="tarjeta ' + (perfil.tema === 'auto' ? 'sel' : '') + '" data-accion="elegirTema" data-arg="auto">' +
      '<div class="muestra-tema" style="background:linear-gradient(135deg,#63b8ff,#141a2b,#ff9a8b)"></div><h4>Automático</h4><div class="meta">Cada nivel usa su propio tema</div></div>';
    Object.keys(R.temas).forEach(function (id) {
      var t = R.temas[id];
      temas += '<div class="tarjeta ' + (perfil.tema === id ? 'sel' : '') + '" data-accion="elegirTema" data-arg="' + esc(id) + '">' + muestraTema(t) + '<h4>' + esc(t.nombre) + '</h4></div>';
    });
    function chip(campo, valor, texto) {
      return '<label class="chip ' + (perfil[campo] === valor ? 'sel' : '') + '" data-accion="opcion" data-arg="' + campo + ':' + valor + '">' + texto + '</label>';
    }
    UI.mostrar(
      '<div class="panel">' +
      '<div class="barra-superior"><h2>Personalizar</h2>' + botonVolver('menu') + '</div>' +
      '<label class="campo"><span>Tu nombre</span><input type="text" maxlength="20" data-campo="nombre" placeholder="Escribí tu nombre" value="' + esc(perfil.nombre) + '"></label>' +
      '<h3>Personaje</h3><div class="tarjetas">' + personajes + '</div>' +
      '<h3>Estética</h3><div class="tarjetas">' + temas + '</div>' +
      '<h3>Sonido</h3><div class="opciones">' + chip('sonido', true, '🔊 Con sonido') + chip('sonido', false, '🔇 Silencio') + '</div>' +
      '<h3>Controles táctiles</h3><div class="opciones">' + chip('tactil', 'auto', 'Automático') + chip('tactil', 'si', 'Siempre') + chip('tactil', 'no', 'Nunca') + '</div>' +
      (R.app.fsDisponible ? '<h3>Pantalla completa</h3><div class="opciones">' + chip('pantallaCompleta', true, '⛶ Al empezar un nivel') + chip('pantallaCompleta', false, 'Nunca') + '</div>' : '') +
      avisoIOS() +
      '<p class="aviso" style="margin-top:16px">Para agregar personajes o temas nuevos, editá <code>data/characters.js</code> y <code>data/themes.js</code>.</p>' +
      '</div>');
  };

  /* ================= RANKING ================= */
  UI.ranking = function (nivelId) {
    nivelId = nivelId || (R.niveles[0] && R.niveles[0].id);
    var chips = R.niveles.map(function (n) {
      return '<span class="chip ' + (n.id === nivelId ? 'sel' : '') + '" data-accion="ranking" data-arg="' + esc(n.id) + '">' + esc(n.nombre) + '</span>';
    }).join('');
    var lista = (datos().ranking[nivelId] || []).slice(0, 10);
    var filas = lista.map(function (r, i) {
      return '<tr' + (i === 0 ? ' class="destacado"' : '') + '><td class="pos">' + (i + 1) + '</td><td>' + esc(r.nombre) + '</td>' +
        '<td class="num">' + r.puntos + '</td><td class="num">⭐ ' + r.estrellas + '</td><td class="num">' + R.formatearTiempo(r.tiempo) + '</td>' +
        '<td class="num suave">' + (r.completado ? '✓' : '✗') + '</td><td class="suave">' + R.fechaCorta(r.fecha) + '</td></tr>';
    }).join('');
    UI.mostrar(
      '<div class="panel">' +
      '<div class="barra-superior"><h2>🏆 Ranking</h2>' + botonVolver('menu') + '</div>' +
      '<div class="opciones">' + chips + '</div>' +
      '<div class="contenedor-tabla">' +
      (filas ? '<table class="tabla"><thead><tr><th></th><th>Jugador</th><th class="num">Puntos</th><th class="num">Estrellas</th><th class="num">Tiempo</th><th class="num">Meta</th><th>Fecha</th></tr></thead><tbody>' + filas + '</tbody></table>'
        : '<p class="suave centrado" style="margin-top:30px">Todavía nadie jugó este nivel. ¡Sé el primero!</p>') +
      '</div></div>');
  };

  /* ================= COMPETENCIAS ================= */
  UI.competencias = function (mensaje) {
    var lista = datos().competencias;
    var tarjetas = lista.map(function (c) {
      var top = R.Storage.totalesCompetencia(c)[0];
      return '<div class="tarjeta" data-accion="verCompetencia" data-arg="' + esc(c.id) + '">' +
        '<h4>' + esc(c.nombre) + '</h4>' +
        '<div class="meta">👥 ' + c.jugadores.length + ' jugadores · 🗺 ' + c.niveles.length + ' niveles · ' + R.fechaCorta(c.creada) + '</div>' +
        (top && top.total ? '<div class="meta" style="margin-top:6px">🥇 ' + esc(top.jugador) + ' — ' + top.total + ' pts</div>' : '<div class="meta" style="margin-top:6px">Sin resultados aún</div>') +
        '</div>';
    }).join('');
    UI.mostrar(
      '<div class="panel">' +
      '<div class="barra-superior"><h2>🏁 Competencias</h2>' + botonVolver('menu') + '</div>' +
      (mensaje ? '<div class="mensaje">' + esc(mensaje) + '</div>' : '') +
      '<p class="suave">Una competencia reúne varios jugadores en uno o más niveles. Cada uno juega su turno en esta computadora y gana quien suma más puntos. También podés exportarla a un archivo para juntar resultados de otras computadoras.</p>' +
      '<div class="botones fila" style="margin:14px 0 20px">' +
      '<button class="btn principal" data-accion="nuevaCompetencia">＋ Nueva competencia</button>' +
      '<button class="btn" data-accion="importar">📂 Importar archivo</button>' +
      '<input type="file" id="archivo-importar" accept=".json,application/json" class="oculto">' +
      '</div>' +
      (tarjetas ? '<div class="tarjetas">' + tarjetas + '</div>' : '<p class="suave centrado">No hay competencias todavía.</p>') +
      '</div>');
  };

  UI.nuevaCompetencia = function () {
    var chips = R.niveles.map(function (n, i) {
      return '<label class="chip sel"><input type="checkbox" name="niveles" value="' + esc(n.id) + '" checked> ' + (i + 1) + '. ' + esc(n.nombre) + '</label>';
    }).join('');
    UI.mostrar(
      '<div class="panel">' +
      '<div class="barra-superior"><h2>Nueva competencia</h2>' + botonVolver('competencias', 'Competencias') + '</div>' +
      '<label class="campo"><span>Nombre de la competencia</span><input type="text" id="comp-nombre" maxlength="40" placeholder="Ej: Torneo de la clase 5°B" autofocus></label>' +
      '<label class="campo"><span>Niveles (tocá para activar o desactivar)</span></label><div class="opciones" id="comp-niveles">' + chips + '</div>' +
      '<label class="campo" style="margin-top:18px"><span>Jugadores (uno por línea)</span><textarea id="comp-jugadores" placeholder="Ana&#10;Bruno&#10;Camila"></textarea></label>' +
      '<div id="comp-error" class="aviso" style="color:var(--peligro)"></div>' +
      '<div class="pie"><span></span><button class="btn principal" data-accion="crearCompetencia">Crear competencia</button></div>' +
      '</div>');
  };

  UI.verCompetencia = function (id, mensaje) {
    var c = R.Storage.competencia(id);
    if (!c) return UI.competencias('Esa competencia ya no existe.');
    var totales = R.Storage.totalesCompetencia(c);
    var cab = c.niveles.map(function (nid) { var n = nivel(nid); return '<th class="num">' + esc(n ? n.nombre : nid) + '</th>'; }).join('');
    var filas = totales.map(function (t, i) {
      var r = c.resultados[t.jugador] || {};
      var celdas = c.niveles.map(function (nid) {
        var x = r[nid], n = nivel(nid);
        var arg = esc(JSON.stringify({ id: c.id, jugador: t.jugador, nivel: nid }));
        var boton = n ? '<button class="btn chico ' + (x ? '' : 'secundario') + '" data-accion="jugarTurno" data-arg="' + arg + '">' + (x ? 'Mejorar' : '▶ Jugar') + '</button>' : '<span class="suave">nivel no disponible</span>';
        return '<td class="num celda-comp">' + (x ? '<b>' + x.puntos + '</b><small>⭐ ' + x.estrellas + ' · ' + R.formatearTiempo(x.tiempo) + (x.completado ? ' ✓' : '') + '</small>' : '<span class="suave">—</span>') + '<div style="margin-top:6px">' + boton + '</div></td>';
      }).join('');
      var medalla = t.total ? ['🥇', '🥈', '🥉'][i] || '' : '';
      return '<tr' + (i === 0 && t.total ? ' class="destacado"' : '') + '><td class="pos">' + (i + 1) + '</td><td>' + medalla + ' ' + esc(t.jugador) + '</td>' + celdas + '<td class="num"><b>' + t.total + '</b><br><small class="suave">⭐ ' + t.estrellas + '</small></td></tr>';
    }).join('');
    UI.mostrar(
      '<div class="panel ancho">' +
      '<div class="barra-superior"><h2>🏁 ' + esc(c.nombre) + '</h2>' + botonVolver('competencias', 'Competencias') + '</div>' +
      (mensaje ? '<div class="mensaje">' + esc(mensaje) + '</div>' : '') +
      '<p class="suave">Creada el ' + R.fechaCorta(c.creada) + ' · Cada jugador puede repetir un nivel: se guarda su mejor puntaje.</p>' +
      '<div class="contenedor-tabla"><table class="tabla"><thead><tr><th></th><th>Jugador</th>' + cab + '<th class="num">Total</th></tr></thead><tbody>' + filas + '</tbody></table></div>' +
      '<div class="pie">' +
      '<div class="botones fila" style="justify-content:flex-start">' +
      '<button class="btn chico" data-accion="exportarCompetencia" data-arg="' + esc(c.id) + '">💾 Exportar</button>' +
      '<button class="btn chico" data-accion="importar">📂 Importar resultados</button>' +
      '<input type="file" id="archivo-importar" accept=".json,application/json" class="oculto" data-competencia="' + esc(c.id) + '">' +
      '</div>' +
      '<button class="btn chico peligro" data-accion="eliminarCompetencia" data-arg="' + esc(c.id) + '">🗑 Eliminar</button>' +
      '</div></div>');
  };

  /* ================= PAUSA ================= */
  UI.pausa = function () {
    UI.mostrar(
      '<div class="panel angosto centrado">' +
      '<h2 style="font-size:36px">⏸ Pausa</h2>' +
      '<div class="botones">' +
      '<button class="btn principal" data-accion="continuar" autofocus>▶ Continuar</button>' +
      '<button class="btn" data-accion="reiniciar">↻ Reiniciar nivel</button>' +
      '<button class="btn" data-accion="abandonar">✕ Salir</button>' +
      botonPantallaCompleta() +
      '</div><p class="aviso" style="margin-top:14px">Esc o P para continuar</p></div>', { transparente: true });
    UI.refrescar = UI.pausa;
  };

  /* ================= RESULTADOS ================= */
  UI.resultados = function (res, ctx, esRecord, mejoro) {
    var d = res.desglose || {};
    var idx = R.niveles.findIndex(function (n) { return n.id === res.nivelId; });
    var siguiente = res.completado && ctx.tipo === 'libre' && R.niveles[idx + 1];
    var filas = '<li><span>⭐ Estrellas ' + res.estrellas + '/' + res.totalEstrellas + '</span><b>' + (d.estrellas || 0) + '</b></li>';
    if (d.enemigos) filas += '<li><span>👟 Enemigos pisados</span><b>' + d.enemigos + '</b></li>';
    if (res.completado) {
      filas += '<li><span>🏁 Llegar a la meta</span><b>' + d.meta + '</b></li>';
      filas += '<li><span>⏱ Bonus de tiempo (' + R.formatearTiempo(res.tiempo) + ')</span><b>' + d.bonusTiempo + '</b></li>';
      if (d.bonusTodas) filas += '<li><span>🌟 ¡Todas las estrellas!</span><b>' + d.bonusTodas + '</b></li>';
    }
    filas += '<li class="total"><span>Total</span><b>' + res.puntos + '</b></li>';

    var volver = ctx.tipo === 'competencia'
      ? '<button class="btn secundario" data-accion="verCompetencia" data-arg="' + esc(ctx.id) + '">🏁 Volver a la competencia</button>'
      : '<button class="btn" data-accion="menu">Menú</button>';

    UI.mostrar(
      '<div class="panel angosto centrado">' +
      '<h2 style="font-size:34px">' + (res.completado ? '🎉 ¡Nivel completado!' : '💀 Fin del juego') + '</h2>' +
      '<p class="suave">' + esc(res.nombre || nombreJugador()) + ' · ' + esc((nivel(res.nivelId) || {}).nombre || '') + '</p>' +
      '<div class="gran-numero">' + res.puntos + '</div>' +
      (esRecord ? '<span class="etiqueta-record">🏆 ¡Récord del nivel!</span>' : '') +
      (ctx.tipo === 'competencia' && mejoro ? '<p class="suave">Resultado guardado en la competencia.</p>' : '') +
      (ctx.tipo === 'competencia' && !mejoro ? '<p class="suave">No superaste tu mejor puntaje en la competencia.</p>' : '') +
      '<ul class="desglose" style="text-align:left">' + filas + '</ul>' +
      '<div class="botones">' +
      (siguiente ? '<button class="btn principal" data-accion="iniciarNivel" data-arg="' + esc(siguiente.id) + '">▶ Siguiente nivel: ' + esc(siguiente.nombre) + '</button>' : '') +
      '<button class="btn ' + (siguiente ? '' : 'principal') + '" data-accion="reiniciar">↻ Jugar de nuevo</button>' +
      volver +
      '</div></div>');
  };

  /* ================= CÓMO JUGAR ================= */
  UI.comoJugar = function () {
    UI.mostrar(
      '<div class="panel">' +
      '<div class="barra-superior"><h2>❓ Cómo jugar</h2>' + botonVolver('menu') + '</div>' +
      '<div class="ayuda">' +
      '<div><h3>Controles</h3><p><span class="tecla">←</span><span class="tecla">→</span> o <span class="tecla">A</span><span class="tecla">D</span> moverse<br>' +
      '<span class="tecla">↑</span>, <span class="tecla">W</span> o <span class="tecla">Espacio</span> saltar (mantené para saltar más alto)<br>' +
      '<span class="tecla">Esc</span> o <span class="tecla">P</span> pausa</p>' +
      '<p class="suave">En tablets aparecen botones en pantalla.</p></div>' +
      '<div><h3>Pantalla completa</h3><p>Al empezar un nivel el juego pasa a pantalla completa (se puede cambiar en Personalizar). También con el botón ⛶ del menú o del marcador. <span class="tecla">Esc</span> sale y pausa el juego.</p>' + avisoIOS() + '</div>' +
      '<div><h3>Objetivo</h3><p>Llegá a la bandera 🏁 juntando la mayor cantidad de estrellas ⭐. Podés retroceder un poco, pero la pantalla no vuelve atrás.</p></div>' +
      '<div><h3>Puntos</h3><p>Estrella: 100 · Pisar un enemigo: 50 · Llegar a la meta: 500<br>Bonus por terminar rápido y por juntar todas las estrellas.</p></div>' +
      '<div><h3>Peligros</h3><p>Los pinchos y los enemigos te quitan una vida (tenés 3). Saltá encima de los enemigos para vencerlos. Los checkpoints guardan tu avance.</p></div>' +
      '</div></div>');
  };

  /* ================= ACCIONES (delegación) ================= */
  var acciones = {
    menu: function () { UI.menu(); },
    jugar: function () { UI.jugar(); },
    personalizar: function () { UI.personalizar(); },
    ranking: function (id) { UI.ranking(id); },
    competencias: function () { UI.competencias(); },
    comoJugar: function () { UI.comoJugar(); },
    continuar: function () { R.app.continuar(); },
    reiniciar: function () { R.app.reiniciar(); },
    abandonar: function () { R.app.abandonar(); },
    pantallaCompleta: function () { R.Fullscreen.alternar().catch(function () {}); },

    iniciarNivel: function (id) {
      var def = nivel(id); if (!def) return;
      R.app.iniciarPartida(def, { tipo: 'libre', nombre: nombreJugador() });
    },

    elegirPersonaje: function (id) { datos().perfil.personaje = id; R.Storage.guardar(); UI.personalizar(); },
    elegirTema: function (id) { datos().perfil.tema = id; R.Storage.guardar(); UI.personalizar(); },
    opcion: function (arg) {
      var partes = arg.split(':'), campo = partes[0], valor = partes[1];
      if (valor === 'true') valor = true; else if (valor === 'false') valor = false;
      datos().perfil[campo] = valor;
      if (campo === 'sonido') R.app.audio.silencio = !valor;
      R.Storage.guardar(); UI.personalizar();
    },

    nuevaCompetencia: function () { UI.nuevaCompetencia(); },
    crearCompetencia: function () {
      var nombre = (document.getElementById('comp-nombre').value || '').trim();
      var niveles = Array.prototype.map.call(cont.querySelectorAll('input[name="niveles"]:checked'), function (i) { return i.value; });
      var jugadores = document.getElementById('comp-jugadores').value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
      jugadores = jugadores.filter(function (j, i) { return jugadores.indexOf(j) === i; });
      var err = document.getElementById('comp-error');
      if (!nombre) return err.textContent = 'Poné un nombre a la competencia.';
      if (!niveles.length) return err.textContent = 'Elegí al menos un nivel.';
      if (jugadores.length < 2) return err.textContent = 'Agregá al menos dos jugadores.';
      var c = R.Storage.crearCompetencia(nombre, niveles, jugadores);
      UI.verCompetencia(c.id, '¡Competencia creada! Cada jugador toca "Jugar" en su turno.');
    },
    verCompetencia: function (id) { UI.verCompetencia(id); },
    eliminarCompetencia: function (id) {
      var c = R.Storage.competencia(id);
      if (c && confirm('¿Eliminar la competencia "' + c.nombre + '"? Se pierden sus resultados.')) {
        R.Storage.eliminarCompetencia(id); UI.competencias('Competencia eliminada.');
      }
    },
    exportarCompetencia: function (id) {
      var c = R.Storage.competencia(id); if (!c) return;
      var archivo = 'competencia-' + c.nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.json';
      R.app.descargarJSON(archivo, c);
    },
    importar: function () { var inp = document.getElementById('archivo-importar'); if (inp) inp.click(); },
    jugarTurno: function (arg) {
      var t = JSON.parse(arg), def = nivel(t.nivel); if (!def) return;
      R.app.iniciarPartida(def, { tipo: 'competencia', id: t.id, jugador: t.jugador, nombre: t.jugador });
    }
  };

  cont.addEventListener('click', function (e) {
    var el = e.target.closest('[data-accion]');
    if (!el || !cont.contains(el)) return;
    // Los chips con checkbox alternan su estado visual sin acción
    if (el.tagName === 'A') e.preventDefault();
    var accion = el.dataset.accion;
    if (acciones[accion]) { R.app.audio.clic(); acciones[accion](el.dataset.arg, el); }
  });

  // Chips con checkbox (selección de niveles)
  cont.addEventListener('change', function (e) {
    if (e.target.matches('input[name="niveles"]')) e.target.closest('.chip').classList.toggle('sel', e.target.checked);
    if (e.target.id === 'archivo-importar') {
      var archivo = e.target.files[0], compId = e.target.dataset.competencia;
      if (!archivo) return;
      R.app.leerJSON(archivo, function (err, obj) {
        if (err || !obj || !obj.id || !Array.isArray(obj.jugadores) || !Array.isArray(obj.niveles)) {
          return compId ? UI.verCompetencia(compId, 'El archivo no parece una competencia válida.') : UI.competencias('El archivo no parece una competencia válida.');
        }
        obj.resultados = obj.resultados || {};
        var r = R.Storage.fusionarCompetencia(obj);
        var msg = r === 'nueva' ? 'Competencia importada.' : 'Resultados combinados con la competencia existente.';
        if (compId) UI.verCompetencia(compId, msg); else UI.competencias(msg);
      });
    }
  });

  // Campos que guardan directo en el perfil
  cont.addEventListener('input', function (e) {
    if (e.target.dataset.campo) { datos().perfil[e.target.dataset.campo] = e.target.value; R.Storage.guardar(); }
  });

  // Evitar que las teclas del juego muevan el scroll mientras hay pantallas con inputs
  cont.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.matches('input[type="text"]') && e.target.id === 'comp-nombre') {
      e.preventDefault(); document.getElementById('comp-jugadores').focus();
    }
  });

  R.UI = UI;
})(window.RUNNER);
