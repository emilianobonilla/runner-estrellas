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
    UI.pantalla = null;    // nombre de la pantalla visible (lo usa la carrera para refrescarse)
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
    // Con botón de volver dejamos una entrada en el historial: así el botón
    // Atrás del celular (o del navegador) retrocede en vez de cerrar el juego.
    if (cont.querySelector('.btn.volver') && !(history.state && history.state.runner)) {
      try { history.pushState({ runner: 1 }, ''); } catch (e) { /* file:// no lo permite */ }
    }
  };
  UI.ocultar = function () { cont.classList.add('oculto'); cont.innerHTML = ''; UI.refrescar = null; UI.pantalla = null; };

  /* ---------- helpers de plantilla ---------- */
  function botonVolver(accion, texto) {
    return '<button class="btn volver" data-accion="' + (accion || 'menu') + '">← ' + (texto || 'Menú') + '</button>';
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
      '<button class="btn" data-accion="carrera">🏃 &nbsp;Carrera multijugador</button>' +
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

  /* Dificultad del nivel en estrellitas (1 a 5). */
  function dificultad(n) {
    n = Math.max(1, Math.min(5, n || 1));
    return '<span class="dificultad" title="Dificultad ' + n + ' de 5">' +
      new Array(n + 1).join('★') + new Array(6 - n).join('☆') + '</span>';
  }

  /* Nombre corto de un nivel para listas: "2-1. La Cueva" */
  function etiqueta(n) { return R.etiquetaNivel(n) + '. ' + n.nombre; }

  /* ================= JUGAR: elegir nivel ================= */
  UI.jugar = function () {
    var prog = datos().progreso;

    function tarjeta(n) {
      var p = prog[n.id] || {};
      var total = new R.Nivel(n).estrellas.length;
      return '<div class="tarjeta" data-accion="iniciarNivel" data-arg="' + esc(n.id) + '">' +
        '<span class="num">' + esc(R.etiquetaNivel(n)) + '</span>' +
        '<h4>' + esc(n.nombre) + (p.completado ? ' <span class="check">✓</span>' : '') + '</h4>' +
        '<div class="meta">' + dificultad(R.dificultadDe(n)) + '</div>' +
        '<div class="meta">' + esc(n.descripcion || '') + '</div>' +
        '<div class="meta" style="margin-top:8px">⭐ ' + (p.mejorEstrellas || 0) + '/' + total + ' &nbsp; 🏆 ' + (p.mejorPuntaje || 0) + '</div>' +
        '</div>';
    }

    /* Los niveles van agrupados por mundo: todos los de un mundo comparten estética. */
    function grupo(titulo, desc, tema, niveles) {
      if (!niveles.length) return '';
      return '<section class="mundo">' +
        '<div class="mundo-cabezal">' + (tema ? muestraTema(tema) : '') +
        '<div class="mundo-texto"><h3>' + esc(titulo) + '</h3>' +
        (desc ? '<div class="meta">' + esc(desc) + '</div>' : '') + '</div></div>' +
        '<div class="tarjetas">' + niveles.map(tarjeta).join('') + '</div>' +
        '</section>';
    }

    var grupos = R.mundos.map(function (m) {
      return grupo('Mundo ' + m.orden + ' · ' + m.nombre, m.descripcion, R.temas[m.tema], R.nivelesDe(m.id));
    }).join('');
    // Por las dudas: niveles que todavía no pertenecen a ningún mundo
    grupos += grupo('Otros niveles', '', null, R.niveles.filter(function (n) { return !R.mundoDe(n); }));

    UI.mostrar(
      '<div class="panel">' +
      '<div class="barra-superior"><h2>Elegí un nivel</h2>' + botonVolver('menu') + '</div>' +
      '<label class="campo"><span>Tu nombre</span><input type="text" maxlength="20" data-campo="nombre" placeholder="Escribí tu nombre" value="' + esc(datos().perfil.nombre) + '"></label>' +
      grupos +
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
      '<p class="aviso" style="margin-top:16px">Cada mundo tiene su estética. Para cambiarla o agregar mundos nuevos, editá <code>data/themes.js</code> y <code>data/worlds.js</code>.</p>' +
      '</div>');
  };

  /* Al elegir una opción la pantalla se vuelve a dibujar: conservamos el
     scroll para no saltar al tope (se nota mucho en vertical). */
  function repintarPersonalizar() {
    var y = cont.scrollTop;
    UI.personalizar();
    cont.scrollTop = y;
  }

  /* ================= RANKING ================= */
  UI.ranking = function (nivelId) {
    nivelId = nivelId || (R.niveles[0] && R.niveles[0].id);
    var chips = R.niveles.map(function (n) {
      return '<span class="chip ' + (n.id === nivelId ? 'sel' : '') + '" data-accion="ranking" data-arg="' + esc(n.id) + '">' + esc(etiqueta(n)) + '</span>';
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
    var chips = R.niveles.map(function (n) {
      return '<label class="chip sel"><input type="checkbox" name="niveles" value="' + esc(n.id) + '" checked> ' + esc(etiqueta(n)) + '</label>';
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
      '<button class="btn" data-accion="reintentar">↻ Reiniciar nivel</button>' +
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
    // Las vidas son de toda la partida: conviene ver con cuántas se sigue
    var vidasTexto = res.completado
      ? '❤️ Te quedan ' + res.vidas + (res.vidas === 1 ? ' vida' : ' vidas') + ' para el resto del juego'
      : '❤️ Te quedaste sin vidas: el juego vuelve a empezar con ' + R.VIDAS_INICIALES;

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
      (ctx.tipo === 'libre' ? '<p class="suave">' + vidasTexto + '</p>' : '') +
      '<div class="botones">' +
      (siguiente ? '<button class="btn principal" data-accion="siguienteNivel" data-arg="' + esc(siguiente.id) + '">▶ Siguiente nivel: ' + esc(siguiente.nombre) + '</button>' : '') +
      '<button class="btn ' + (siguiente ? '' : 'principal') + '" data-accion="reiniciar">↻ Jugar de nuevo</button>' +
      volver +
      '</div></div>');
  };

  /* ================= CÓMO JUGAR ================= */

  /* Los 5 tipos de enemigos, en el orden en que aparecen (mundo 1 a 5). */
  function listaEnemigos() {
    return R.mundos.map(function (m) {
      var e = R.tipoEnemigo(m.enemigo);
      if (!e) return '';
      return '<li><b>' + esc(e.nombre) + '</b> <span class="suave">(' + esc(m.nombre) + ')</span><br>' +
        esc(e.descripcion) + '</li>';
    }).join('');
  }


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
      '<div><h3>Carrera multijugador</h3><p>Desde el menú, un jugador crea una sala y les dicta el código de 4 números a los demás: entran hasta ' + R.MAX_CORREDORES + ' corredores. Corren el mismo nivel al mismo tiempo, cada uno ve a los otros medio transparentes (cada uno con su color) y una barra muestra quién va adelante. ' + 'Las estrellas y los enemigos son de todos: el que llega primero se queda con la estrella y el que pisa un enemigo lo saca de la pista para todos. ' + 'La estrella vuelve a aparecer a los 3 segundos para que el que viene último también la pueda juntar (el enemigo pisado no vuelve más). ' + 'Gana el primero en tocar la bandera, pero la carrera sigue para repartir el 2º, 3º… puesto; morir no te elimina, solo te hace perder tiempo. Necesita internet en todos los dispositivos.</p></div>' +
      '<div><h3>Objetivo</h3><p>Llegá a la bandera 🏁 juntando la mayor cantidad de estrellas ⭐. Podés retroceder un poco, pero la pantalla no vuelve atrás.</p></div>' +
      '<div><h3>Puntos</h3><p>Estrella: 100 · Pisar un enemigo: 50 a 120 (según el bicho) · Llegar a la meta: 500<br>Bonus por terminar rápido y por juntar todas las estrellas.</p></div>' +
      '<div><h3>Peligros</h3><p>Los pinchos y los enemigos te quitan una vida. Tenés 3 para toda la partida: se comparten entre todos los niveles y, si se acaban, el juego empieza de nuevo. Saltá encima de los enemigos para vencerlos. Los checkpoints se activan al pasar la línea de la bandera y guardan tu avance.</p></div>' +
      '<div><h3>Los 5 enemigos</h3><p>Cada mundo tiene el suyo, cada vez más difícil:</p><ul class="lista-enemigos">' + listaEnemigos() + '</ul></div>' +
      '<div><h3>Versión</h3><p>Estás jugando la <b>' + esc(R.versionTexto()) + '</b>.<br>' +
      '<a href="' + esc(R.versionURL()) + '" target="_blank" rel="noopener" style="color:var(--acento2)">Ver este código en GitHub</a> · ' +
      '<a href="' + esc(R.VERSION.repo) + '" target="_blank" rel="noopener" style="color:var(--acento2)">Repositorio</a></p>' +
      '<p class="suave">El mismo número aparece abajo a la derecha en los menús: sirve para saber si estás probando la versión de tu computadora o la de la web.</p></div>' +
      '</div></div>');
  };

  /* ================= CARRERA ENTRE VARIOS DISPOSITIVOS ================= */
  function personajePorId(id) {
    return R.personajes.filter(function (p) { return p.id === id; })[0] || R.personajes[0];
  }

  UI.carrera = function () {
    var C = R.Carrera;
    UI.mostrar(
      '<div class="panel">' +
      '<div class="barra-superior"><h2>🏃 Carrera multijugador</h2>' + botonVolver('menu') + '</div>' +
      (C.soportada() ? '' : '<div class="mensaje">Este navegador no puede conectarse con otros dispositivos. Probá con Chrome, Edge o Firefox.</div>') +
      '<p class="suave">Hasta <b>' + R.MAX_CORREDORES + ' corredores</b> en dispositivos distintos corren el mismo nivel al mismo tiempo. Uno crea la sala y le pasa el código a los demás. Gana el primero que toca la bandera 🏁, y los que vienen atrás siguen corriendo por el 2º y el 3er puesto.</p>' +
      '<p class="suave">Las estrellas y los enemigos son de todos: el que llega primero se lleva la estrella ⭐ y el que pisa a un enemigo lo saca de la pista <b>para todos</b>. ' + 'La estrella <b>vuelve a aparecer a los 3 segundos</b>, así el que viene más atrás también la puede juntar; el enemigo pisado no vuelve.</p>' +
      '<p class="aviso">Ojo: la carrera es lo único del juego que necesita internet en todos los dispositivos, porque se conectan entre ellos. Todo lo demás sigue andando sin conexión.</p>' +
      (location.protocol === 'file:' ? '<p class="aviso">📄 Abriste el juego con doble clic. Si la sala no llega a abrirse, probá entrando desde la página web del juego (o desde un servidor local): algunos navegadores limitan las conexiones cuando el archivo se abre directo del disco.</p>' : '') +
      '<label class="campo"><span>Tu nombre</span><input type="text" maxlength="20" data-campo="nombre" placeholder="Escribí tu nombre" value="' + esc(datos().perfil.nombre) + '"></label>' +
      '<div class="botones">' +
      '<button class="btn principal" data-accion="carreraCrear">📡 &nbsp;Crear una sala</button>' +
      '<button class="btn" data-accion="carreraUnirse">🔢 &nbsp;Entrar con un código</button>' +
      '</div>' +
      '<p class="aviso" style="margin-top:16px">Jugás con <b>' + esc(personajeActual().nombre) + '</b> · <a href="#" data-accion="personalizar" style="color:var(--acento2)">cambiar</a></p>' +
      '</div>');
    UI.pantalla = 'carrera';
  };

  UI.carreraUnirse = function (error) {
    UI.mostrar(
      '<div class="panel angosto">' +
      '<div class="barra-superior"><h2>Entrar a una sala</h2>' + botonVolver('carrera', 'Carrera') + '</div>' +
      (error ? '<div class="mensaje">' + esc(error) + '</div>' : '') +
      '<label class="campo"><span>Código de la sala (4 números)</span>' +
      '<input type="text" id="carrera-codigo" class="codigo" inputmode="numeric" autocomplete="off" maxlength="4" placeholder="1234" autofocus></label>' +
      '<div id="carrera-error" class="aviso" style="color:var(--peligro)"></div>' +
      '<div class="pie"><span></span><button class="btn principal" data-accion="carreraConectar">Conectar</button></div>' +
      '</div>');
    UI.pantalla = 'carreraUnirse';
  };

  UI.carreraConectando = function () {
    var C = R.Carrera;
    UI.mostrar(
      '<div class="panel angosto centrado">' +
      '<h2>' + (C.esAnfitrion ? 'Abriendo la sala…' : 'Buscando la sala ' + esc(C.codigo) + '…') + '</h2>' +
      '<p class="suave">Conectando con los otros dispositivos.</p>' +
      '<div class="botones"><button class="btn" data-accion="carreraSalir">Cancelar</button></div>' +
      '</div>');
    UI.pantalla = 'carreraConectando';
  };

  /* Ficha de un corredor en la sala, con su color y su personaje. */
  function fichaCorredor(j, soyYo) {
    var per = personajePorId(j.personajeId);
    var color = R.colorCorredor(j.jid);
    var pie = !j.conectado ? '🔌 Se desconectó' : j.listo ? '✅ Listo' : '⏳ Sin confirmar';
    return '<div class="tarjeta centrado' + (j.listo && j.conectado ? ' sel' : '') + '"' +
      ' style="border-left:6px solid ' + color + '">' +
      '<canvas width="96" height="96" data-personaje="' + esc(per.id) + '"></canvas>' +
      '<h4 style="color:' + color + '">' + esc(j.nombre) + (soyYo ? ' (vos)' : '') + '</h4>' +
      '<div class="meta">' + pie + '</div></div>';
  }

  UI.carreraSala = function () {
    var C = R.Carrera;
    if (!C.activa()) return UI.carrera();
    if (C.estado === 'conectando') return UI.carreraConectando();

    var corredores = C.jugadores.slice().sort(function (a, b) { return a.jid - b.jid; });
    var fichas = corredores.map(function (j) { return fichaCorredor(j, j.jid === C.miId); }).join('');
    // Mientras haya lugar mostramos una ficha vacía invitando a que entren más
    var libres = C.lugaresLibres();
    if (libres > 0) {
      fichas += '<div class="tarjeta centrado"><div style="font-size:52px;line-height:96px">👤</div>' +
        '<h4>Lugar libre</h4><div class="meta">Quedan ' + libres + ' de ' + R.MAX_CORREDORES + '</div></div>';
    }

    var niveles = R.niveles.map(function (nv) {
      var sel = nv.id === C.nivelId;
      return '<span class="chip ' + (sel ? 'sel' : '') + '"' +
        (C.esAnfitrion ? ' data-accion="carreraNivel" data-arg="' + esc(nv.id) + '"' : '') + '>' +
        esc(etiqueta(nv)) + '</span>';
    }).join('');

    var cabezal = C.esAnfitrion
      ? '<p class="suave centrado" style="margin-bottom:4px">Código de la sala: decíselo a los demás</p>' +
        '<div class="codigo-grande">' + esc(C.codigo) + '</div>'
      : '<p class="suave centrado">Estás en la sala <b>' + esc(C.codigo) + '</b></p>';

    var conectados = C.conectados().length;
    var puedeEstarListo = C.conectada() && conectados >= 2;
    var latencia = (C.red && C.red.rtt) ? '<span class="aviso">📶 ' + C.red.rtt + ' ms</span>' : '<span></span>';
    // Al invitado, si se cortó, le ofrecemos volver a entrar con el mismo código
    var botonPrincipal = (!C.conectada() && !C.esAnfitrion)
      ? '<button class="btn principal" data-accion="carreraReintentar">🔄 &nbsp;Volver a entrar</button>'
      : '<button class="btn principal" data-accion="carreraListo"' + (puedeEstarListo ? '' : ' disabled') + '>' +
        (C.yo().listo ? '↩ No estoy listo' : '✅ Estoy listo') + '</button>';

    var faltan = C.conectados().filter(function (j) { return !j.listo; }).length;
    var pieTexto = !puedeEstarListo
      ? 'Esperando a que entre alguien más… (hacen falta al menos 2 corredores)'
      : faltan > 0
        ? 'Cuando estén todos listos arranca la cuenta regresiva. Falta' + (faltan === 1 ? '' : 'n') + ' ' + faltan + '.'
        : 'Largando…';

    UI.mostrar(
      '<div class="panel">' +
      '<div class="barra-superior"><h2>🏃 Carrera multijugador</h2>' +
      '<button class="btn volver" data-accion="carreraSalir">← Salir</button></div>' +
      (C.error ? '<div class="mensaje">' + esc(C.error) + ' <button class="btn chico" data-accion="carreraReintentar" style="margin-left:8px">Probar de nuevo</button></div>' : '') +
      (C.aviso ? '<div class="mensaje">' + esc(C.aviso) + '</div>' : '') +
      (C.yaLargaron ? '<div class="mensaje">La carrera ya empezó: quedate acá y corrés en la próxima.</div>' : '') +
      cabezal +
      '<div class="tarjetas" style="margin-top:16px">' + fichas + '</div>' +
      '<h3>Nivel' + (C.esAnfitrion ? '' : ' (lo elige quien creó la sala)') + '</h3>' +
      '<div class="opciones">' + niveles + '</div>' +
      '<div class="pie">' + latencia + botonPrincipal + '</div>' +
      '<p class="aviso">' + pieTexto + '</p>' +
      '</div>');
    UI.pantalla = 'carreraSala';
  };

  UI.pausaCarrera = function () {
    UI.mostrar(
      '<div class="panel angosto centrado">' +
      '<h2 style="font-size:30px">🏃 La carrera sigue</h2>' +
      '<p class="suave">En una carrera el reloj no se detiene: los demás siguen corriendo mientras leés esto.</p>' +
      '<div class="botones">' +
      '<button class="btn principal" data-accion="continuar" autofocus>▶ &nbsp;Seguir corriendo</button>' +
      '<button class="btn peligro" data-accion="abandonar">🏳 &nbsp;Abandonar la carrera</button>' +
      '</div></div>', { transparente: true });
    UI.pantalla = 'pausaCarrera';
  };

  function medalla(puesto) {
    return puesto === 1 ? '🥇' : puesto === 2 ? '🥈' : puesto === 3 ? '🥉' : puesto + 'º';
  }

  UI.resultadosCarrera = function (res) {
    var C = R.Carrera;
    UI._resCarrera = res = res || UI._resCarrera;
    if (!res) return UI.carreraSala();

    var faltan = C.faltanLlegar();
    var puesto = C.miPuesto();
    var total = C.jugadores.length;

    var titulo =
      faltan > 0 ? '⏳ ' + (faltan === 1 ? 'Falta llegar un corredor' : 'Faltan llegar ' + faltan + ' corredores') :
      !res.completado ? '🏳 No llegaste a la meta' :
      puesto === 1 ? '🏆 ¡Ganaste la carrera!' :
      puesto === 2 ? '🥈 ¡Segundo puesto!' :
      puesto === 3 ? '🥉 ¡Tercer puesto!' :
      '🏁 Puesto ' + puesto + ' de ' + total;

    var filas = C.ranking().map(function (j, i) {
      var r = j.res;
      var estado = !r ? '<span class="suave">corriendo…</span>'
        : r.abandono ? 'abandonó'
        : r.llego ? '🏁 llegó'
        : 'no llegó';
      return '<tr' + (j.jid === C.miId ? ' class="destacado"' : '') + '>' +
        '<td class="pos">' + (r && r.llego ? medalla(i + 1) : '–') + '</td>' +
        '<td style="color:' + R.colorCorredor(j.jid) + '">' + esc(j.nombre) + (j.jid === C.miId ? ' (vos)' : '') + '</td>' +
        '<td class="num">' + (r && r.llego ? R.formatearTiempo(r.tiempo) : '—') + '</td>' +
        '<td class="num">' + (r ? r.estrellas : '—') + '</td>' +
        '<td class="num">' + (r ? r.puntos : '—') + '</td>' +
        '<td>' + estado + '</td></tr>';
    }).join('');

    var tabla = '<table class="tabla"><thead><tr><th class="pos"></th><th>Corredor</th>' +
      '<th class="num">⏱</th><th class="num">⭐</th><th class="num">🏆</th><th></th></tr></thead>' +
      '<tbody>' + filas + '</tbody></table>';

    var revancha = C.conectada()
      ? (C.esAnfitrion
        ? '<button class="btn principal" data-accion="carreraRevancha">🔁 &nbsp;Revancha (todos a la sala)</button>'
        : '<button class="btn principal" data-accion="carreraRevancha">↩ &nbsp;Volver a la sala</button>')
      : '';

    UI.mostrar(
      '<div class="panel centrado">' +
      '<h2 style="font-size:32px">' + titulo + '</h2>' +
      (faltan > 0 ? '<p class="suave">La tabla se va completando sola a medida que van llegando.</p>' : '') +
      (!C.conectada() ? '<p class="suave">Se cortó la conexión con la sala: puede faltar algún resultado.</p>' : '') +
      '<div class="contenedor-tabla" style="margin-top:14px">' + tabla + '</div>' +
      '<div class="botones">' + revancha +
      '<button class="btn" data-accion="carreraSalir">← &nbsp;Salir de la carrera</button>' +
      '</div></div>');
    UI.pantalla = 'resultadosCarrera';
  };

  /* La red cambió algo (entró alguien, se puso listo, llegó un resultado): redibujamos. */
  UI.alCambiarCarrera = function () {
    var C = R.Carrera;
    if (C.estado === 'corriendo') return;                 // durante la carrera manda el lienzo
    var enCarrera = UI.pantalla === 'carreraConectando' || UI.pantalla === 'carreraSala' || UI.pantalla === 'resultadosCarrera';
    if (!enCarrera) return;
    // Si el código no existía o la red falló al entrar, volvemos a pedirlo
    if (C.error && !C.conectada() && !C.esAnfitrion) {
      var msg = C.error; C.error = '';
      return UI.carreraUnirse(msg);
    }
    if (C.estado === 'inactiva') return UI.carrera();
    if (UI.pantalla === 'resultadosCarrera' && C.estado === 'fin') return UI.resultadosCarrera(null);
    UI.carreraSala();
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
    reiniciar: function () { R.app.reiniciar(); },            // recorrido nuevo: vuelve a 3 vidas
    reintentar: function () { R.app.reiniciar(true); },       // mismo recorrido: conserva las vidas
    abandonar: function () { R.app.abandonar(); },
    pantallaCompleta: function () { R.Fullscreen.alternar().catch(function () {}); },

    iniciarNivel: function (id) {
      var def = nivel(id); if (!def) return;
      R.app.iniciarPartida(def, { tipo: 'libre', nombre: nombreJugador() });
    },

    // Desde los resultados: sigue el mismo recorrido, con las vidas que quedaron
    siguienteNivel: function (id) {
      var def = nivel(id); if (!def) return;
      R.app.iniciarPartida(def, { tipo: 'libre', nombre: nombreJugador() }, true);
    },

    elegirPersonaje: function (id) { datos().perfil.personaje = id; R.Storage.guardar(); repintarPersonalizar(); },
    elegirTema: function (id) { datos().perfil.tema = id; R.Storage.guardar(); repintarPersonalizar(); },
    opcion: function (arg) {
      var partes = arg.split(':'), campo = partes[0], valor = partes[1];
      if (valor === 'true') valor = true; else if (valor === 'false') valor = false;
      datos().perfil[campo] = valor;
      if (campo === 'sonido') R.app.audio.silencio = !valor;
      R.Storage.guardar(); repintarPersonalizar();
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
    carrera: function () {
      if (R.Carrera.activa()) return UI.carreraSala();
      UI.carrera();
    },
    carreraCrear: function () { R.Carrera.crearSala(); UI.carreraConectando(); },
    carreraUnirse: function () { UI.carreraUnirse(); },
    carreraConectar: function () {
      var campo = document.getElementById('carrera-codigo');
      var cod = R.normalizarCodigo(campo && campo.value);
      if (cod.length !== 4) {
        document.getElementById('carrera-error').textContent = 'El código son 4 números.';
        if (campo) campo.focus();
        return;
      }
      R.Carrera.unirse(cod);
      UI.carreraConectando();
    },
    carreraReintentar: function () {
      var C = R.Carrera, anfitrion = C.esAnfitrion, cod = C.codigo;
      C.salir();
      if (anfitrion) { C.crearSala(); UI.carreraConectando(); }
      else if (cod) { C.unirse(cod); UI.carreraConectando(); }
      else UI.carreraUnirse();
    },
    carreraSalir: function () { R.Carrera.salir(); UI.carrera(); },
    carreraListo: function () { R.Carrera.alternarListo(); },
    carreraNivel: function (id) { R.Carrera.elegirNivel(id); },
    carreraRevancha: function () { R.Carrera.pedirRevancha(); UI.carreraSala(); },

    jugarTurno: function (arg) {
      var t = JSON.parse(arg), def = nivel(t.nivel); if (!def) return;
      R.app.iniciarPartida(def, { tipo: 'competencia', id: t.id, jugador: t.jugador, nombre: t.jugador });
    }
  };

  /* ---------- salir de una pantalla ---------- */
  /* Un solo camino de salida para el botón ←, la tecla Esc y el botón Atrás. */
  UI.volver = function () {
    if (cont.classList.contains('oculto')) return false;
    var b = cont.querySelector('.btn.volver');
    if (!b || !acciones[b.dataset.accion]) return false;
    R.app.audio.clic();
    acciones[b.dataset.accion](b.dataset.arg, b);
    return true;
  };

  window.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || R.app.partida()) return;   // jugando, Esc es pausa
    if (UI.volver()) e.preventDefault();
  });

  window.addEventListener('popstate', function () {
    if (R.app.partida()) {                               // jugando, Atrás pausa
      try { history.pushState({ runner: 1 }, ''); } catch (e) { /* file:// */ }
      return R.app.pausar();
    }
    UI.volver();
  });

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
    if (e.key === 'Enter' && e.target.id === 'carrera-codigo') { e.preventDefault(); acciones.carreraConectar(); return; }
    if (e.key === 'Enter' && e.target.matches('input[type="text"]') && e.target.id === 'comp-nombre') {
      e.preventDefault(); document.getElementById('comp-jugadores').focus();
    }
  });

  R.UI = UI;
})(window.RUNNER);
