/* Render: dibuja el escenario, las entidades y el personaje en el lienzo.
   Todo es procedural (formas y colores del tema) salvo que el tema o el
   personaje indiquen imágenes propias. */
(function (R) {
  var T = R.TILE;

  /* --- carga perezosa de imágenes (devuelve null hasta que estén listas) --- */
  var cacheImg = {};
  R.imagen = function (src) {
    if (!src) return null;
    var im = cacheImg[src];
    if (!im) {
      // La versión en la URL evita ver imágenes viejas guardadas en caché tras actualizar
      var v = R.VERSION && !/^data:/.test(src) ? (src.indexOf('?') < 0 ? '?' : '&') + 'v=' + R.VERSION.numero : '';
      im = new Image(); im.src = src + v; cacheImg[src] = im;
    }
    return im.complete && im.naturalWidth > 0 ? im : null;
  };

  function hash(x, y) {
    var h = (x * 374761393 + y * 668265263) | 0;
    h = ((h ^ (h >>> 13)) * 1274126177) | 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  }

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function sombrear(hex, f) {
    // aclara (f>0) u oscurece (f<0) un color #rrggbb
    var m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return hex;
    var n = parseInt(m[1], 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    function aj(c) { return R.clamp(Math.round(f > 0 ? c + (255 - c) * f : c * (1 + f)), 0, 255); }
    return 'rgb(' + aj(r) + ',' + aj(g) + ',' + aj(b) + ')';
  }

  /* =============== Estrella =============== */
  R.dibujarEstrella = function (ctx, x, y, r, rot, color, borde) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var ang = rot + i * Math.PI / 5 - Math.PI / 2;
      var rad = i % 2 ? r * 0.46 : r;
      ctx.lineTo(x + Math.cos(ang) * rad, y + Math.sin(ang) * rad);
    }
    ctx.closePath();
    ctx.fillStyle = color; ctx.fill();
    if (borde) { ctx.lineWidth = 2; ctx.strokeStyle = borde; ctx.lineJoin = 'round'; ctx.stroke(); }
  };

  /* =============== Personaje =============== */
  /* e = { anim, enSuelo, mirando, vx, vy, t, parpadeo, muerto, esc }
     Campos de un personaje (ver data/characters.js): formaCabeza, peinado, accesorio
     (uno o varios), cola, capa, mochila, detalle, hocico, nariz, pico, parches, boca. */
  var CONTORNO = '#1d1b2e';

  function pintar(ctx, relleno, grosor) {
    ctx.fillStyle = relleno; ctx.fill();
    ctx.lineWidth = grosor || 2; ctx.lineJoin = 'round'; ctx.strokeStyle = CONTORNO; ctx.stroke();
  }
  function ovalo(ctx, x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); }
  function triangulo(ctx, x1, y1, x2, y2, x3, y3) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.closePath(); }

  R.dibujarPersonaje = function (ctx, per, cx, cyPies, e) {
    e = e || {};
    var esc = e.esc || 1;
    ctx.save();
    ctx.translate(cx, cyPies);
    ctx.scale((e.mirando || 1) * esc, esc);
    if (e.parpadeo) ctx.globalAlpha = 0.45;

    // Hoja de sprites propia
    var sp = per.sprite, img = sp && R.imagen(sp.src);
    if (img) {
      var nombre = e.muerto ? 'saltar' : !e.enSuelo ? 'saltar' : Math.abs(e.vx || 0) > 20 ? 'correr' : 'quieto';
      var cuadros = (sp.animaciones && (sp.animaciones[nombre] || sp.animaciones.quieto)) || [0];
      var idx = cuadros[Math.floor((e.t || 0) * (sp.fps || 10)) % cuadros.length];
      var porFila = Math.max(1, Math.floor(img.width / sp.ancho));
      var sx = (idx % porFila) * sp.ancho, sy = Math.floor(idx / porFila) * sp.alto;
      var k = sp.escala || 1;
      ctx.drawImage(img, sx, sy, sp.ancho, sp.alto, -sp.ancho * k / 2, -sp.alto * k, sp.ancho * k, sp.alto * k);
      ctx.restore();
      return;
    }

    var c = per.colores;
    var accs = per.accesorio ? [].concat(per.accesorio) : [];
    function tiene(a) { return accs.indexOf(a) >= 0; }
    var ac = c.accesorio || c.pelo;
    var corriendo = e.enSuelo && Math.abs(e.vx || 0) > 20;
    var saltando = !e.enSuelo && !e.muerto;
    var fase = Math.sin((e.anim || 0) * 16);
    var swing = corriendo ? fase * 0.9 : 0;
    var bob = corriendo ? Math.abs(fase) * 2 : 0;
    var respira = !corriendo && !saltando ? Math.sin((e.t || 0) * 3) * 0.8 : 0;
    var vuelo = saltando ? R.clamp(-(e.vy || 0) / 600, -0.5, 0.5) : corriendo ? 0.25 + Math.abs(fase) * 0.15 : 0.05 + respira * 0.03;

    if (e.muerto) { ctx.rotate(0.6); ctx.translate(0, 6); }

    // Sombra suave en el piso (solo parado o corriendo)
    if (e.enSuelo && !e.muerto) { ctx.fillStyle = 'rgba(0,0,0,0.18)'; ovalo(ctx, 0, 0, 13, 3); ctx.fill(); }

    // Cola
    var yc = -24 - bob;
    switch (per.cola) {
      case 'gato':
        ctx.strokeStyle = CONTORNO; ctx.lineWidth = 7; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-9, yc); ctx.bezierCurveTo(-24, yc + 2, -22, yc - 16 - fase * 3, -14, yc - 22 - fase * 3); ctx.stroke();
        ctx.strokeStyle = c.piel; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(-9, yc); ctx.bezierCurveTo(-24, yc + 2, -22, yc - 16 - fase * 3, -14, yc - 22 - fase * 3); ctx.stroke();
        break;
      case 'zorro':
        ctx.beginPath(); ctx.moveTo(-8, yc + 4); ctx.bezierCurveTo(-26, yc + 8, -34, yc - 8 - fase * 2, -26, yc - 18 - fase * 2);
        ctx.bezierCurveTo(-18, yc - 10, -14, yc - 6, -8, yc - 6); ctx.closePath(); pintar(ctx, c.piel);
        ctx.beginPath(); ctx.moveTo(-26, yc - 18 - fase * 2); ctx.bezierCurveTo(-31, yc - 11 - fase * 2, -30, yc - 5, -24, yc - 3);
        ctx.bezierCurveTo(-22, yc - 8, -19, yc - 13, -26, yc - 18 - fase * 2); ctx.fillStyle = '#fff'; ctx.fill();
        break;
      case 'dino':
        triangulo(ctx, -8, yc + 6, -8, yc - 8, -27, yc + 6 + fase * 2); pintar(ctx, c.piel);
        ctx.fillStyle = ac; triangulo(ctx, -12, yc - 2, -16, yc - 8, -17, yc - 1); ctx.fill();
        break;
    }

    // Capa (atrás, flamea con la carrera)
    if (per.capa) {
      var f = 8 + vuelo * 30;
      ctx.beginPath(); ctx.moveTo(-8, -40 - bob); ctx.quadraticCurveTo(-12 - f, -30, -14 - f * 1.2, -12 + fase * 3 * (corriendo ? 1 : 0)); ctx.lineTo(-4, -22 - bob); ctx.closePath();
      pintar(ctx, per.capa);
    }

    // Mochila
    if (per.mochila) {
      ctx.save(); ctx.translate(-12, -36 - bob);
      rr(ctx, -6, 0, 9, 18, 3); pintar(ctx, per.mochila, 1.6);
      if (corriendo || saltando) {   // llamita del cohete
        var l = 5 + Math.abs(Math.sin((e.t || 0) * 40)) * 4;
        triangulo(ctx, -5, 18, 1, 18, -2, 18 + l); ctx.fillStyle = '#ffb703'; ctx.fill();
      }
      ctx.restore();
    }

    // Piernas
    function pierna(x, ang) {
      ctx.save(); ctx.translate(x, -20); ctx.rotate(ang);
      rr(ctx, -4, 0, 8, 16, 2); pintar(ctx, c.pantalon, 1.6);
      rr(ctx, -5, 13, 13, 7, 3.5); pintar(ctx, c.zapatos, 1.6);
      ctx.restore();
    }
    pierna(-6, saltando ? 0.7 : swing);
    pierna(6, saltando ? -0.5 : -swing);

    // Brazos
    function brazo(x, ang) {
      ctx.save(); ctx.translate(x, -36 - bob); ctx.rotate(ang);
      rr(ctx, -3.5, 0, 8, 9, 3.5); pintar(ctx, c.manga || c.remera, 1.6);
      rr(ctx, -3.5, 7, 8, 9, 4); pintar(ctx, c.mano || c.piel, 1.6);
      ctx.restore();
    }
    brazo(-9, saltando ? -2.6 : -swing * 0.9);

    // Cuerpo
    rr(ctx, -11.5, -40 - bob, 23, 22.5, 7); pintar(ctx, c.remera);
    ctx.save(); rr(ctx, -11.5, -40 - bob, 23, 22.5, 7); ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(-10, -39 - bob, 5, 20);        // luz
    ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fillRect(-12, -23 - bob, 25, 6);               // sombra de abajo
    switch (per.detalle) {
      case 'rayas':
        ctx.fillStyle = sombrear(c.remera, -0.3);
        for (var yy = -36; yy < -20; yy += 7) ctx.fillRect(-12, yy - bob, 25, 3);
        break;
      case 'panza':
        ctx.fillStyle = c.panza || '#fff'; ovalo(ctx, 3, -29 - bob, 8, 11); ctx.fill();
        break;
      case 'estrella':
        R.dibujarEstrella(ctx, 2, -30 - bob, 5.5, 0, '#ffd23f', null);
        break;
      case 'panel':
        ctx.fillStyle = '#1b262c'; rr(ctx, -6, -36 - bob, 14, 10, 2); ctx.fill();
        ctx.fillStyle = '#ff4d4d'; ctx.fillRect(-4, -34 - bob, 3, 3);
        ctx.fillStyle = '#5bff8a'; ctx.fillRect(1, -34 - bob, 3, 3);
        ctx.fillStyle = '#ffd23f'; ctx.fillRect(-4, -30 - bob, 8, 2);
        break;
      case 'cinturon':
        ctx.fillStyle = ac; ctx.fillRect(-12, -26 - bob, 25, 4);
        ctx.fillStyle = '#ffd23f'; ctx.fillRect(0, -27 - bob, 6, 6);
        break;
      case 'botones':
        ctx.fillStyle = '#ffd23f';
        [-35, -29, -23].forEach(function (by) { ctx.beginPath(); ctx.arc(4, by - bob, 1.8, 0, Math.PI * 2); ctx.fill(); });
        break;
      case 'bufanda':
        ctx.fillStyle = ac; ctx.fillRect(-12, -41 - bob, 25, 6);
        ctx.fillStyle = sombrear(ac, -0.25); ctx.fillRect(-12, -36 - bob, 25, 1.5);
        break;
    }
    ctx.restore();

    // Brazo delantero
    brazo(9, saltando ? -2.6 : swing * 0.9);

    // Cabeza
    var cy = -52 - bob + respira * 0.5;
    function cabeza() {
      if (per.formaCabeza === 'cuadrada') rr(ctx, -12.5, cy - 12.5, 25, 25, 6);
      else { ctx.beginPath(); ctx.arc(0, cy, 13, 0, Math.PI * 2); }
    }

    // Cosas que van detrás de la cabeza (orejas, pelo largo, cresta)
    if (tiene('orejas')) {            // gato
      triangulo(ctx, -12, cy - 4, -11, cy - 21, -1, cy - 11); pintar(ctx, ac, 1.8);
      triangulo(ctx, 12, cy - 4, 11, cy - 21, 1, cy - 11); pintar(ctx, ac, 1.8);
      ctx.fillStyle = '#ffb3c6';
      triangulo(ctx, -9.5, cy - 8, -9.5, cy - 16, -4.5, cy - 11); ctx.fill();
      triangulo(ctx, 9.5, cy - 8, 9.5, cy - 16, 4.5, cy - 11); ctx.fill();
    }
    if (tiene('orejas-zorro')) {
      triangulo(ctx, -13, cy - 2, -12, cy - 26, 0, cy - 10); pintar(ctx, ac, 1.8);
      triangulo(ctx, 13, cy - 2, 12, cy - 26, 0, cy - 10); pintar(ctx, ac, 1.8);
      ctx.fillStyle = '#2b2118'; triangulo(ctx, -12, cy - 18, -12, cy - 26, -8, cy - 20); ctx.fill();
      triangulo(ctx, 12, cy - 18, 12, cy - 26, 8, cy - 20); ctx.fill();
    }
    if (tiene('orejas-oso')) {
      ctx.beginPath(); ctx.arc(-9, cy - 11, 5.5, 0, Math.PI * 2); pintar(ctx, ac, 1.8);
      ctx.beginPath(); ctx.arc(9, cy - 11, 5.5, 0, Math.PI * 2); pintar(ctx, ac, 1.8);
    }
    if (per.peinado === 'largo') {
      rr(ctx, -14, cy - 6, 14, 30 + vuelo * 6, 6); pintar(ctx, c.pelo, 1.8);
    }
    if (tiene('cresta')) {
      ctx.fillStyle = ac;
      [[-8, -10], [-1, -14], [6, -12]].forEach(function (p) { triangulo(ctx, p[0] - 3.5, cy + p[1] + 5, p[0], cy + p[1] - 5, p[0] + 3.5, cy + p[1] + 5); pintar(ctx, ac, 1.6); });
    }

    // Cara
    cabeza(); pintar(ctx, c.piel);
    ctx.save(); cabeza(); ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.beginPath(); ctx.arc(-5, cy - 5, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.10)'; ctx.fillRect(-14, cy + 8, 28, 6);
    ctx.restore();

    // Pelo
    if (per.peinado !== 'ninguno') {
      ctx.fillStyle = c.pelo;
      if (per.formaCabeza === 'cuadrada') { rr(ctx, -12.5, cy - 12.5, 25, 7, 4); ctx.fill(); }
      else {
        ctx.beginPath(); ctx.arc(0, cy - 1, 13, Math.PI * 1.05, Math.PI * 1.95); ctx.lineTo(9, cy - 9); ctx.closePath(); ctx.fill();
        if (per.peinado === 'puntas') {      // mechones para arriba
          [[-8, -12], [-2, -15], [5, -13]].forEach(function (p) { triangulo(ctx, p[0] - 3.5, cy + p[1] + 4, p[0] + 1, cy + p[1] - 6, p[0] + 4, cy + p[1] + 4); ctx.fill(); });
        }
      }
      if (per.peinado === 'flequillo') { ctx.beginPath(); ctx.moveTo(-12, cy - 6); ctx.quadraticCurveTo(0, cy + 2, 12, cy - 6); ctx.lineTo(12, cy - 12); ctx.lineTo(-12, cy - 12); ctx.closePath(); ctx.fill(); }
    }

    // Parches de los ojos (panda)
    if (per.parches) {
      ctx.fillStyle = per.parches;
      ctx.save(); ctx.translate(3, cy - 1); ctx.rotate(0.35); ovalo(ctx, 0, 0, 4.4, 5.6); ctx.fill(); ctx.restore();
      ctx.save(); ctx.translate(10, cy - 1); ctx.rotate(-0.35); ovalo(ctx, 0, 0, 4, 5.4); ctx.fill(); ctx.restore();
    }
    // Hocico y cara blanca
    if (c.hocico) {
      ctx.fillStyle = c.hocico; ovalo(ctx, 8, cy + 4, 7.5, 5.5); ctx.fill();
    }

    // Ojos y boca
    var mejilla = per.mejillas !== false && !per.pico && per.boca !== 'recta';
    if (e.muerto) {
      ctx.strokeStyle = CONTORNO; ctx.lineWidth = 2; ctx.lineCap = 'round';
      [3, 9.5].forEach(function (ex) {
        ctx.beginPath(); ctx.moveTo(ex - 2.5, cy - 4); ctx.lineTo(ex + 2.5, cy + 1); ctx.moveTo(ex + 2.5, cy - 4); ctx.lineTo(ex - 2.5, cy + 1); ctx.stroke();
      });
    } else {
      if (mejilla) { ctx.fillStyle = 'rgba(255,105,120,0.4)'; ovalo(ctx, 0, cy + 4.5, 3, 2); ctx.fill(); ovalo(ctx, 12, cy + 4.5, 2.4, 2); ctx.fill(); }
      var parpadeo = Math.sin((e.t || 0) * 1.7) > 0.985;
      [3, 9.5].forEach(function (ex, i) {
        if (per.parches && !parpadeo) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex + 0.4, cy - 1.5, 1.6, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(ex + 0.9, cy - 1.2, 0.9, 0, Math.PI * 2); ctx.fill(); return; }
        if (parpadeo) { ctx.fillStyle = CONTORNO; ctx.fillRect(ex - 3, cy - 1, 6, 1.5); return; }
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex, cy - 1.5, 3.8, 0, Math.PI * 2); pintar(ctx, '#fff', 1.2);
        ctx.fillStyle = per.ojos || '#1a1a1a'; ctx.beginPath(); ctx.arc(ex + 1.1, cy - 1.3, 2.3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex + 1.9, cy - 2.3, 0.9, 0, Math.PI * 2); ctx.fill();
      });
      // Boca
      ctx.strokeStyle = CONTORNO; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
      if (per.boca === 'recta') { ctx.beginPath(); ctx.moveTo(3, cy + 6); ctx.lineTo(11, cy + 6); ctx.stroke(); }
      else if (!per.pico) {
        if (saltando || e.victoria) { ctx.fillStyle = '#7a1f2b'; ctx.beginPath(); ctx.arc(7, cy + 5, 2.6, 0, Math.PI); ctx.closePath(); ctx.fill(); }
        else { ctx.beginPath(); ctx.arc(7, cy + 3.8, 3, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); }
      }
    }
    // Nariz, pico, bigotes
    if (per.nariz) { ctx.fillStyle = per.nariz; ovalo(ctx, 11.5, cy + 1.8, 2.3, 1.7); ctx.fill(); }
    if (per.pico) {
      triangulo(ctx, 8, cy + 1, 19, cy + 4, 8, cy + 8); pintar(ctx, per.pico, 1.4);
    }
    if (per.bigotes) {
      ctx.strokeStyle = 'rgba(30,30,40,0.7)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(11, cy + 4); ctx.lineTo(19, cy + 2); ctx.moveTo(11, cy + 5.5); ctx.lineTo(19, cy + 6.5); ctx.stroke();
    }
    if (per.tornillos) {
      ctx.fillStyle = '#7f8ea3'; ctx.beginPath(); ctx.arc(-12.5, cy + 1, 2.4, 0, Math.PI * 2); pintar(ctx, '#9aa8bd', 1.2);
      ctx.beginPath(); ctx.arc(12.5, cy + 1, 2.4, 0, Math.PI * 2); pintar(ctx, '#9aa8bd', 1.2);
    }

    // Accesorios de arriba
    if (tiene('gorra')) {
      ctx.beginPath(); ctx.arc(0, cy - 2, 13.5, Math.PI, Math.PI * 2); ctx.closePath(); pintar(ctx, ac);
      rr(ctx, 3, cy - 7, 17, 4.5, 2); pintar(ctx, sombrear(ac, -0.2), 1.6);
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-2, cy - 9, 2.4, 0, Math.PI * 2); ctx.fill();
    }
    if (tiene('mono')) {
      ctx.beginPath(); ctx.arc(-7, cy - 14, 6.5, 0, Math.PI * 2); pintar(ctx, c.pelo, 1.8);
      ctx.beginPath(); ctx.arc(-9, cy - 9, 3.2, 0, Math.PI * 2); pintar(ctx, ac, 1.4);
      ctx.beginPath(); ctx.arc(-4, cy - 9, 3.2, 0, Math.PI * 2); pintar(ctx, ac, 1.4);
    }
    if (tiene('antena')) {
      ctx.strokeStyle = CONTORNO; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, cy - 12); ctx.lineTo(0, cy - 21); ctx.stroke();
      ctx.strokeStyle = c.pelo; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, cy - 12); ctx.lineTo(0, cy - 21); ctx.stroke();
      var brillo = 0.6 + Math.sin((e.t || 0) * 6) * 0.4;
      ctx.beginPath(); ctx.arc(0, cy - 24, 4, 0, Math.PI * 2); pintar(ctx, ac, 1.6);
      ctx.fillStyle = 'rgba(255,255,255,' + brillo * 0.8 + ')'; ctx.beginPath(); ctx.arc(-1, cy - 25, 1.3, 0, Math.PI * 2); ctx.fill();
    }
    if (tiene('vincha')) {
      ctx.fillStyle = ac; ctx.fillRect(-12.5, cy - 9, 25, 4); ctx.strokeStyle = CONTORNO; ctx.lineWidth = 1.2; ctx.strokeRect(-12.5, cy - 9, 25, 4);
    }
    if (tiene('casco')) {
      rr(ctx, -12, cy + 9, 24, 5, 2.5); pintar(ctx, ac, 1.8);
      ctx.beginPath(); ctx.arc(0, cy, 16, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(170,225,255,0.22)'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(235,248,255,0.9)'; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, cy, 12, Math.PI * 1.15, Math.PI * 1.5); ctx.stroke();
    }
    if (tiene('sombrero')) {
      ctx.beginPath(); ctx.moveTo(-11, cy - 8); ctx.quadraticCurveTo(-3, cy - 26, 8 + vuelo * 6, cy - 38); ctx.quadraticCurveTo(10, cy - 24, 12, cy - 8); ctx.closePath(); pintar(ctx, ac);
      ovalo(ctx, 0, cy - 8, 18, 4.5); pintar(ctx, sombrear(ac, -0.15), 1.8);
      ctx.fillStyle = '#ffd23f'; ctx.fillRect(-10.5, cy - 14, 22, 3);
      R.dibujarEstrella(ctx, 2, cy - 22, 3.6, 0, '#ffd23f', null);
    }
    if (tiene('corona')) {
      ctx.beginPath(); ctx.moveTo(-9, cy - 11); ctx.lineTo(-10, cy - 22); ctx.lineTo(-4, cy - 16); ctx.lineTo(0, cy - 24); ctx.lineTo(4, cy - 16); ctx.lineTo(10, cy - 22); ctx.lineTo(9, cy - 11); ctx.closePath(); pintar(ctx, '#ffd23f', 1.8);
      ctx.fillStyle = ac;
      [[-10, -22], [0, -24], [10, -22]].forEach(function (p) { ctx.beginPath(); ctx.arc(p[0], cy + p[1], 2, 0, Math.PI * 2); ctx.fill(); });
    }
    if (tiene('banda')) {
      ctx.fillStyle = ac; ctx.fillRect(-13, cy - 9, 26, 5.5); ctx.strokeStyle = CONTORNO; ctx.lineWidth = 1.2; ctx.strokeRect(-13, cy - 9, 26, 5.5);
      var w = 9 + vuelo * 14;
      ctx.beginPath(); ctx.moveTo(-12, cy - 7); ctx.lineTo(-12 - w, cy - 11 + fase * 1.5); ctx.lineTo(-12 - w * 0.8, cy - 6); ctx.lineTo(-12 - w * 1.1, cy - 1 - fase * 1.5); ctx.lineTo(-11, cy - 4); ctx.closePath(); pintar(ctx, ac, 1.4);
      ctx.fillStyle = '#c9d1d9'; ctx.fillRect(-4, cy - 8, 8, 3.5);
    }
    if (tiene('pirata')) {
      ctx.beginPath(); ctx.arc(0, cy - 2, 13.5, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath(); pintar(ctx, ac, 1.8);
      ctx.fillStyle = '#fff'; [[-7, -10], [0, -13], [7, -9]].forEach(function (p) { ctx.beginPath(); ctx.arc(p[0], cy + p[1], 1.4, 0, Math.PI * 2); ctx.fill(); });
      triangulo(ctx, -11, cy - 8, -22, cy - 4 + fase, -20, cy - 10 - fase); pintar(ctx, ac, 1.4);
      ctx.strokeStyle = CONTORNO; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-12, cy - 8); ctx.lineTo(12, cy - 2); ctx.stroke();
      ctx.fillStyle = CONTORNO; ovalo(ctx, 9.5, cy - 1.5, 4, 3.6); ctx.fill();
    }
    if (tiene('lentes')) {
      ctx.strokeStyle = CONTORNO; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(3, cy - 1.5, 5, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(10.5, cy - 1.5, 5, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(8, cy - 1.5); ctx.lineTo(8.5, cy - 1.5); ctx.stroke();
    }
    if (tiene('gorro')) {   // gorro de lana con pompón
      ctx.beginPath(); ctx.arc(0, cy - 2, 13.5, Math.PI, Math.PI * 2); ctx.closePath(); pintar(ctx, ac);
      rr(ctx, -13.5, cy - 7, 27, 5, 2.5); pintar(ctx, sombrear(ac, 0.25), 1.6);
      ctx.beginPath(); ctx.arc(-1, cy - 18, 3.6, 0, Math.PI * 2); pintar(ctx, '#fff', 1.4);
    }

    ctx.restore();
  };

  /* =============== Renderer =============== */
  function Renderer(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.t = 0;
  }

  Renderer.prototype.dibujar = function (p, dt) {
    this.t += dt;
    var ctx = this.ctx, cam = Math.round(p.camara.x);
    this.fondo(p.tema, p.camara.x);
    ctx.save();
    ctx.translate(-cam, 0);
    if (p.tema.decoracion === 'playa') this.aguaDeHuecos(p.nivel, cam);
    this.tiles(p.nivel, p.tema, cam);
    this.checkpoints(p);
    this.meta(p);
    this.estrellas(p);
    this.enemigos(p);
    this.rivales(p);        // los fantasmas de los rivales van detrás del jugador
    this.jugador(p);
    this.particulas(p);
    ctx.restore();
    this.barraCarrera(p);
    this.cuentaRegresiva(p);
    this.mensaje(p);
  };

  Renderer.prototype.fondo = function (tema, cam) {
    var ctx = this.ctx;
    var g = ctx.createLinearGradient(0, 0, 0, R.ALTO);
    g.addColorStop(0, tema.cielo[0]); g.addColorStop(1, tema.cielo[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, R.ANCHO, R.ALTO);

    var imgFondo = R.imagen(tema.imagenes && tema.imagenes.fondo);
    if (imgFondo) {
      var off = -((cam * 0.3) % imgFondo.width);
      for (var x = off - imgFondo.width; x < R.ANCHO; x += imgFondo.width) ctx.drawImage(imgFondo, x, R.ALTO - imgFondo.height);
      return;
    }

    if (tema.sol) {
      var sx = R.ANCHO - 130, sy = 84;
      var halo = ctx.createRadialGradient(sx, sy, 20, sx, sy, 190);
      halo.addColorStop(0, 'rgba(255,248,200,0.75)'); halo.addColorStop(1, 'rgba(255,248,200,0)');
      ctx.fillStyle = halo; ctx.fillRect(sx - 190, sy - 190, 380, 380);
      ctx.fillStyle = tema.sol; ctx.beginPath(); ctx.arc(sx, sy, 42, 0, Math.PI * 2); ctx.fill();
    }
    if (tema.nubes) {
      var par = cam * 0.2, W = 1400;
      for (var i = 0; i < 9; i++) {
        var nx = ((i * 197 + 60 - par) % W + W) % W - 150;
        var ny = 36 + (i * 61) % 150;
        this.nube(nx, ny, 0.7 + (i % 3) * 0.3, tema.nubes);
      }
    }
    var self = this;
    if (tema.ambiente === 'cueva') this.fondoCueva(tema, cam);
    if (tema.decoracion === 'playa') this.mar(cam);
    (tema.colinas || []).forEach(function (color, i) {
      var par = cam * (0.35 + i * 0.25);
      var base = R.ALTO - T - (i === 0 ? 40 : 10);
      function altura(wx) {
        return base - Math.abs(Math.sin(wx * 0.0038 + i * 1.3)) * (110 - i * 40) - Math.sin(wx * 0.013 + i) * 12;
      }
      var g = ctx.createLinearGradient(0, base - 150, 0, R.ALTO);
      g.addColorStop(0, sombrear(color, 0.12)); g.addColorStop(1, color);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(0, R.ALTO);
      for (var x = 0; x <= R.ANCHO; x += 8) ctx.lineTo(x, altura(x + par));
      ctx.lineTo(R.ANCHO, R.ALTO); ctx.closePath(); ctx.fill();
      if (tema.decoracion === 'prado') self.arbolesLejanos(altura, par, i, color);
      if (tema.decoracion === 'playa' && i === 1) self.palmeras(par);
    });
    if (tema.ambiente === 'cueva') this.techoCueva(tema, cam);
    if (tema.decoracion === 'cueva') this.ambienteCueva(tema, cam);
  };

  /* Ambiente de cueva (temas con decoracion 'cueva'): cristales brillantes sobre las
     colinas lejanas y luciérnagas flotando (las estalactitas las dibuja techoCueva). */
  Renderer.prototype.ambienteCueva = function (tema, cam) {
    var ctx = this.ctx, t = this.t;
    var colores = ['#7a6cff', '#46d4ff', '#d77aff'];
    (tema.colinas || []).forEach(function (color, i) {
      var par = cam * (0.35 + i * 0.25), paso = i === 0 ? 170 : 120;
      var base = R.ALTO - T - (i === 0 ? 40 : 10);
      var primero = Math.floor(par / paso) - 1;
      for (var k = primero; k <= primero + R.ANCHO / paso + 2; k++) {
        var h = hash(k, 53 + i);
        if (h < 0.4) continue;
        var wx = k * paso + h * 70, x = wx - par;
        var y = base - Math.abs(Math.sin(wx * 0.0038 + i * 1.3)) * (110 - i * 40) - Math.sin(wx * 0.013 + i) * 12;
        var esc = (i === 0 ? 1 : 0.65) * (0.8 + h * 0.5), col = colores[Math.floor(h * 10) % 3];
        var halo = ctx.createRadialGradient(x, y - 14 * esc, 2, x, y - 14 * esc, 46 * esc);
        halo.addColorStop(0, 'rgba(140,200,255,0.30)'); halo.addColorStop(1, 'rgba(140,200,255,0)');
        ctx.fillStyle = halo; ctx.fillRect(x - 46 * esc, y - 60 * esc, 92 * esc, 92 * esc);
        ctx.globalAlpha = i === 0 ? 0.85 : 0.6;
        [[-9, 22, 6], [0, 34, 8], [10, 18, 5]].forEach(function (c) {
          ctx.fillStyle = col;
          ctx.beginPath(); ctx.moveTo(x + (c[0] - c[2]) * esc, y + 2); ctx.lineTo(x + c[0] * esc, y - c[1] * esc); ctx.lineTo(x + (c[0] + c[2]) * esc, y + 2); ctx.closePath(); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.35)';
          ctx.beginPath(); ctx.moveTo(x + c[0] * esc, y - c[1] * esc); ctx.lineTo(x + (c[0] + c[2]) * esc, y + 2); ctx.lineTo(x + c[0] * esc, y + 2); ctx.closePath(); ctx.fill();
        });
        ctx.globalAlpha = 1;
      }
    });
    for (var j = 0; j < 16; j++) {      // luciérnagas: titilan y se mueven despacio
      var fx = ((j * 211 + 40 - cam * 0.6 + 0) % (R.ANCHO + 60) + R.ANCHO + 60) % (R.ANCHO + 60) - 30;
      var fy = 90 + (j * 53) % 270;
      var br = 0.7;
      ctx.fillStyle = 'rgba(200,255,120,' + (0.18 * br) + ')'; ctx.beginPath(); ctx.arc(fx, fy, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(230,255,160,' + br + ')'; ctx.beginPath(); ctx.arc(fx, fy, 2, 0, Math.PI * 2); ctx.fill();
    }
  };

  Renderer.prototype.cristal = function (x, y, color) {
    var ctx = this.ctx, pulso = 0.3;
    ctx.fillStyle = 'rgba(160,220,255,' + pulso + ')'; ctx.beginPath(); ctx.arc(x, y - 8, 15, 0, Math.PI * 2); ctx.fill();
    [[-6, 12, 4], [0, 20, 5], [7, 10, 4]].forEach(function (c) {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.moveTo(x + c[0] - c[2], y + 1); ctx.lineTo(x + c[0], y - c[1]); ctx.lineTo(x + c[0] + c[2], y + 1); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath(); ctx.moveTo(x + c[0], y - c[1]); ctx.lineTo(x + c[0] + c[2], y + 1); ctx.lineTo(x + c[0], y + 1); ctx.closePath(); ctx.fill();
    });
  };

  Renderer.prototype.hongo = function (x, y) {
    var ctx = this.ctx;
    ctx.fillStyle = '#d9d4f2'; ctx.fillRect(x - 2, y - 8, 4, 9);
    ctx.fillStyle = 'rgba(120,255,220,0.25)'; ctx.beginPath(); ctx.arc(x, y - 10, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5ee6c8'; ctx.beginPath(); ctx.arc(x, y - 8, 9, Math.PI, 0); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.arc(x - 3, y - 12, 1.8, 0, Math.PI * 2); ctx.arc(x + 3, y - 11, 1.4, 0, Math.PI * 2); ctx.fill();
  };

  // Cueva: polvillo brillante al fondo (se dibuja antes de las colinas)
  Renderer.prototype.fondoCueva = function (tema, cam) {
    var ctx = this.ctx, W = 1100, par = cam * 0.12;
    for (var i = 0; i < 26; i++) {
      var x = ((i * 233 + 40 - par) % W + W) % W - 60;
      var y = 30 + hash(i, 5) * (R.ALTO - 120);
      var r = 1 + hash(i, 8) * 1.8;
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = tema.cristal || '#fff';
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  // Cueva: estalactitas colgando del techo y cristales luminosos entre las rocas
  Renderer.prototype.techoCueva = function (tema, cam) {
    var ctx = this.ctx;
    for (var capa = 0; capa < 2; capa++) {
      var par = cam * (0.5 + capa * 0.3), paso = 150 - capa * 30, W = paso * 12;
      ctx.fillStyle = capa === 0 ? sombrear(tema.colinas[0], -0.35) : sombrear(tema.colinas[0], -0.6);
      for (var i = 0; i < 12; i++) {
        var x = ((i * paso + capa * 61 - par) % W + W) % W - paso;
        var largo = 40 + hash(i, 3 + capa) * 80 - capa * 10, ancho = 26 + hash(i, 7) * 22;
        ctx.beginPath();
        ctx.moveTo(x - ancho / 2, -2); ctx.lineTo(x + ancho / 2, -2);
        ctx.quadraticCurveTo(x + 3, largo * 0.6, x, largo);
        ctx.quadraticCurveTo(x - 3, largo * 0.6, x - ancho / 2, -2);
        ctx.fill();
      }
    }
    // cristales que brillan sobre el piso del fondo
    var par2 = cam * 0.7, W2 = 900;
    for (var k = 0; k < 7; k++) {
      var cx = ((k * 211 + 90 - par2) % W2 + W2) % W2 - 40, cy = R.ALTO - T + 2;
      var brillo = 0.65;
      ctx.globalAlpha = 0.18 * brillo;
      ctx.fillStyle = tema.cristal; ctx.beginPath(); ctx.arc(cx, cy - 14, 34, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = brillo + 0.2;
      for (var j = -1; j <= 1; j++) {
        var h = 20 - Math.abs(j) * 7 + hash(k, j + 4) * 8, bx = cx + j * 8;
        ctx.fillStyle = j === 0 ? tema.cristal : sombrear(tema.cristal, -0.3);
        ctx.beginPath(); ctx.moveTo(bx - 5, cy); ctx.lineTo(bx + j * 2, cy - h); ctx.lineTo(bx + 5, cy); ctx.closePath(); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  };

  /* Arbolitos y arbustos redondos sobre las colinas (solo temas con "decoracion"). */
  Renderer.prototype.arbolesLejanos = function (altura, par, capa, color) {
    var ctx = this.ctx, paso = capa === 0 ? 150 : 110;
    var primero = Math.floor(par / paso) - 1;
    for (var k = primero; k <= primero + R.ANCHO / paso + 2; k++) {
      var h = hash(k, 31 + capa);
      if (h < 0.6) continue;
      var wx = k * paso + h * 60, x = wx - par, y = altura(wx);
      var esc = (capa === 0 ? 1 : 0.7) * (0.8 + h * 0.5);
      if (h > 0.7) {
        ctx.fillStyle = sombrear(color, -0.25); ctx.fillRect(x - 3 * esc, y - 18 * esc, 6 * esc, 20 * esc);
        ctx.fillStyle = sombrear(color, -0.12);
        ctx.beginPath(); ctx.arc(x, y - 30 * esc, 17 * esc, 0, Math.PI * 2); ctx.arc(x - 11 * esc, y - 20 * esc, 12 * esc, 0, Math.PI * 2); ctx.arc(x + 11 * esc, y - 20 * esc, 12 * esc, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = sombrear(color, 0.08);
        ctx.beginPath(); ctx.arc(x - 5 * esc, y - 34 * esc, 8 * esc, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = sombrear(color, -0.15);
        ctx.beginPath(); ctx.arc(x, y + 2, 14 * esc, Math.PI, 0); ctx.arc(x + 15 * esc, y + 2, 10 * esc, Math.PI, 0); ctx.fill();
      }
    }
  };

  /* Mar al horizonte con brillos y un velero lejano (temas con decoracion 'playa'). */
  Renderer.prototype.mar = function (cam) {
    var ctx = this.ctx, y0 = R.ALTO - 210;
    var g = ctx.createLinearGradient(0, y0, 0, R.ALTO - T);
    g.addColorStop(0, '#1fa9d6'); g.addColorStop(1, '#5fd3e6');
    ctx.fillStyle = g; ctx.fillRect(0, y0, R.ANCHO, R.ALTO - T - y0);
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(0, y0, R.ANCHO, 2);
    var par = cam * 0.12;
    for (var i = 0; i < 26; i++) {
      var x = ((i * 83 + hash(i, 5) * 40 - par) % (R.ANCHO + 80) + R.ANCHO + 80) % (R.ANCHO + 80) - 40;
      var y = y0 + 10 + (i * 37) % 140;
      var brillo = 0.4;
      ctx.fillStyle = 'rgba(255,255,255,' + brillo.toFixed(2) + ')';
      ctx.fillRect(x, y, 14 + hash(i, 8) * 14, 2);
    }
    // velero
    var vx = ((620 - cam * 0.06) % (R.ANCHO + 200) + R.ANCHO + 200) % (R.ANCHO + 200) - 100;
    var vy = y0 + 2;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.moveTo(vx, vy - 4); ctx.lineTo(vx, vy - 40); ctx.lineTo(vx + 24, vy - 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff7b54';
    ctx.beginPath(); ctx.moveTo(vx - 4, vy - 4); ctx.lineTo(vx - 4, vy - 28); ctx.lineTo(vx - 20, vy - 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#7a4a2a'; ctx.fillRect(vx - 22, vy - 4, 50, 5);
  };

  /* Palmeras sobre la duna del medio. */
  Renderer.prototype.palmeras = function (par) {
    var ctx = this.ctx, paso = 330;
    var primero = Math.floor(par / paso) - 1;
    for (var k = primero; k <= primero + R.ANCHO / paso + 2; k++) {
      var h = hash(k, 77);
      if (h < 0.25) continue;
      var x = k * paso + h * 90 - par;
      var base = R.ALTO - T - 6, alto = 120 + h * 50, esc = 0.85 + h * 0.3;
      var sw = 0;
      ctx.strokeStyle = '#8a5a2b'; ctx.lineWidth = 9 * esc; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, base); ctx.quadraticCurveTo(x + 22, base - alto * 0.55, x + 12 + sw, base - alto); ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 2;
      for (var a = 1; a < 6; a++) {
        var ty = base - alto * a / 6; ctx.beginPath(); ctx.moveTo(x + 4 + a, ty); ctx.lineTo(x + 14 + a, ty); ctx.stroke();
      }
      var cx = x + 12 + sw, cy = base - alto;
      ctx.fillStyle = '#2e9e57';
      for (var f = 0; f < 6; f++) {
        var ang = -Math.PI / 2 + (f - 2.5) * 0.62;
        var lx = cx + Math.cos(ang) * 58 * esc, ly = cy + Math.sin(ang) * 34 * esc + 22 * esc;
        ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.quadraticCurveTo(cx + Math.cos(ang) * 30 * esc, cy + Math.sin(ang) * 42 * esc - 8, lx, ly);
        ctx.quadraticCurveTo(cx + Math.cos(ang) * 30 * esc, cy + Math.sin(ang) * 42 * esc + 6, cx, cy);
        ctx.fill();
      }
      ctx.fillStyle = '#6b4220';
      ctx.beginPath(); ctx.arc(cx - 3, cy + 5, 4, 0, Math.PI * 2); ctx.arc(cx + 4, cy + 6, 4, 0, Math.PI * 2); ctx.fill();
    }
  };

  /* Agua con espuma en el fondo de los huecos (en coordenadas del mundo). */
  Renderer.prototype.aguaDeHuecos = function (nivel, cam) {
    var ctx = this.ctx, y = (nivel.filas - 1) * T + 14;
    var g = ctx.createLinearGradient(0, y, 0, y + T);
    g.addColorStop(0, '#2bb8de'); g.addColorStop(1, '#0f86b8');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(cam - 10, y + T);
    for (var x = cam - 10; x <= cam + R.ANCHO + 10; x += 8) ctx.lineTo(x, y + Math.sin(x * 0.05) * 3);
    ctx.lineTo(cam + R.ANCHO + 10, y + T); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath();
    for (var x2 = cam - 10; x2 <= cam + R.ANCHO + 10; x2 += 8) {
      var yy = y + Math.sin(x2 * 0.05) * 3;
      if (x2 === cam - 10) ctx.moveTo(x2, yy); else ctx.lineTo(x2, yy);
    }
    ctx.stroke();
  };

  Renderer.prototype.nube = function (x, y, e, color) {
    var ctx = this.ctx;
    function forma(dy) {
      ctx.beginPath();
      ctx.arc(x, y + dy, 22 * e, 0, Math.PI * 2);
      ctx.arc(x + 26 * e, y - 10 * e + dy, 28 * e, 0, Math.PI * 2);
      ctx.arc(x + 56 * e, y + dy, 22 * e, 0, Math.PI * 2);
      ctx.arc(x + 28 * e, y + 8 * e + dy, 20 * e, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(120,160,215,0.28)'; forma(5 * e);   // sombra de abajo
    ctx.fillStyle = color; forma(0);
  };

  Renderer.prototype.tiles = function (nivel, tema, cam) {
    var ctx = this.ctx;
    var cx0 = Math.max(0, Math.floor(cam / T) - 1);
    var cx1 = Math.min(nivel.cols - 1, Math.ceil((cam + R.ANCHO) / T) + 1);
    var im = tema.imagenes || {};
    var imgSuelo = R.imagen(im.suelo), imgBloque = R.imagen(im.bloque), imgPincho = R.imagen(im.pincho);
    for (var cy = 0; cy < nivel.filas; cy++) {
      for (var cx = cx0; cx <= cx1; cx++) {
        var c = nivel.celdas[cy][cx], x = cx * T, y = cy * T;
        if (c === 'G') {
          if (imgSuelo) { ctx.drawImage(imgSuelo, x, y, T, T); continue; }
          this.suelo(x, y, tema, !nivel.esSolido(cx, cy - 1), cx, cy);
        } else if (c === '#') {
          if (imgBloque) { ctx.drawImage(imgBloque, x, y, T, T); continue; }
          this.bloque(x, y, tema);
        } else if (c === '^') {
          if (imgPincho) { ctx.drawImage(imgPincho, x, y, T, T); continue; }
          this.pinchos(x, y, tema);
        }
      }
    }
  };

  Renderer.prototype.suelo = function (x, y, tema, arriba, cx, cy) {
    var ctx = this.ctx;
    ctx.fillStyle = tema.sueloRelleno; ctx.fillRect(x, y, T, T);
    ctx.fillStyle = 'rgba(0,0,0,0.10)'; ctx.fillRect(x, y + T - 10, T, 10);   // la tierra se oscurece abajo
    ctx.fillStyle = tema.sueloDetalle;
    for (var k = 0; k < 3; k++) {
      var rx = hash(cx * 3 + k, cy * 7 + 1), ry = hash(cy * 5 + k, cx * 11 + 3);
      ctx.fillRect(x + 4 + rx * 34, y + 16 + ry * 26, 6, 4);
    }
    if (tema.ambiente === 'cueva') {
      ctx.strokeStyle = sombrear(tema.sueloRelleno, 0.18); ctx.lineWidth = 2;
      var vx = x + 6 + hash(cx, cy) * 20;
      ctx.beginPath(); ctx.moveTo(vx, y + 14); ctx.lineTo(vx + 10, y + 26); ctx.lineTo(vx + 4, y + 40); ctx.stroke();
      if (hash(cx, cy + 9) > 0.8) { ctx.fillStyle = tema.cristal; ctx.globalAlpha = 0.8; ctx.fillRect(x + 30, y + 30, 4, 4); ctx.globalAlpha = 1; }
    }
    if (arriba) {
      ctx.fillStyle = tema.sueloTop; ctx.fillRect(x, y, T, 12);
      ctx.fillStyle = sombrear(tema.sueloTop, 0.28); ctx.fillRect(x, y, T, 3);
      ctx.fillStyle = sombrear(tema.sueloTop, -0.2); ctx.fillRect(x, y + 12, T, 2);
      // flequillo de pasto que cae sobre la tierra
      ctx.fillStyle = tema.sueloTop;
      for (var f = 0; f < 4; f++) {
        var fx = x + f * 12 + hash(cx + f, 5) * 4;
        ctx.beginPath(); ctx.moveTo(fx, y + 12); ctx.lineTo(fx + 10, y + 12); ctx.lineTo(fx + 5, y + 19 + hash(cx, f) * 5); ctx.closePath(); ctx.fill();
      }
      // pastitos y arbustos
      ctx.fillStyle = sombrear(tema.sueloTop, 0.25);
      ctx.fillRect(x + 6 + hash(cx, 9) * 20, y - 5, 4, 6);
      ctx.fillRect(x + 28 + hash(cx, 4) * 12, y - 4, 4, 5);
      if (tema.decoracion === 'prado') {
        if (hash(cx, 77) > 0.93) this.arbusto(x + 24, y);   // sin flores amarillas: se confunden con las estrellas
      }
      if (tema.decoracion === 'cueva') {
        var hc = hash(cx, 77);
        ctx.fillStyle = 'rgba(120,255,220,0.32)'; ctx.fillRect(x, y + 13, T, 2);      // musgo que brilla en el borde
        if (hc < 0.28) this.cristal(x + 10 + hash(cx, 78) * 26, y, hc < 0.1 ? '#d77aff' : hc < 0.2 ? '#46d4ff' : '#8f86ff');
        else if (hc > 0.9) this.hongo(x + 24, y);
      }
      if (tema.decoracion === 'playa') this.detallePlaya(x, y, cx);
    }
  };

  /* Conchitas, estrellas de mar y granitos sobre la arena. */
  Renderer.prototype.detallePlaya = function (x, y, cx) {
    var ctx = this.ctx, h = hash(cx, 21);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillRect(x + 8 + hash(cx, 2) * 30, y + 4, 3, 2);
    ctx.fillRect(x + 4 + hash(cx, 3) * 36, y + 8, 2, 2);
    if (h > 0.82) {          // estrella de mar
      R.dibujarEstrella(ctx, x + 12 + h * 20, y - 3, 6, 0.3, '#ff7b54', '#d9532e');
    } else if (h < 0.14) {   // caracol
      ctx.fillStyle = '#fff3e0'; ctx.strokeStyle = '#e0a98a'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x + 24, y - 1, 6, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + 24, y - 6); ctx.lineTo(x + 24, y - 1); ctx.stroke();
    }
  };

  Renderer.prototype.flor = function (x, y, color) {
    var ctx = this.ctx;
    ctx.strokeStyle = '#3f8f3a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y + 2); ctx.lineTo(x, y - 10); ctx.stroke();
    ctx.fillStyle = color;
    for (var i = 0; i < 5; i++) {
      var a = i * Math.PI * 2 / 5;
      ctx.beginPath(); ctx.arc(x + Math.cos(a) * 3.5, y - 12 + Math.sin(a) * 3.5, 2.6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#ff9f1c'; ctx.beginPath(); ctx.arc(x, y - 12, 2, 0, Math.PI * 2); ctx.fill();
  };

  Renderer.prototype.arbusto = function (x, y) {
    var ctx = this.ctx;
    ctx.fillStyle = '#3f9a45';
    ctx.beginPath(); ctx.arc(x - 9, y - 2, 10, Math.PI, 0); ctx.arc(x + 3, y - 2, 13, Math.PI, 0); ctx.arc(x + 15, y - 2, 9, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#5fc462';
    ctx.beginPath(); ctx.arc(x - 1, y - 11, 5, 0, Math.PI * 2); ctx.fill();
  };

  Renderer.prototype.bloque = function (x, y, tema) {
    var ctx = this.ctx;
    ctx.fillStyle = tema.bloqueSombra; ctx.fillRect(x, y, T, T);
    ctx.fillStyle = tema.bloque; rr(ctx, x + 2, y + 2, T - 4, T - 4, 6); ctx.fill();
    ctx.fillStyle = tema.bloqueLuz; ctx.fillRect(x + 6, y + 3, T - 12, 4); ctx.fillRect(x + 3, y + 6, 4, T - 14);
    ctx.fillStyle = tema.bloqueSombra; ctx.globalAlpha = 0.35;
    ctx.fillRect(x + 10, y + 14, T - 20, 2); ctx.fillRect(x + 10, y + 24, T - 20, 2); ctx.fillRect(x + 10, y + 34, T - 20, 2);   // vetas de madera
    ctx.globalAlpha = 1;
    ctx.fillStyle = tema.bloqueSombra;
    [[8, 8], [T - 10, 8], [8, T - 10], [T - 10, T - 10]].forEach(function (c) {   // clavitos
      ctx.beginPath(); ctx.arc(x + c[0], y + c[1], 1.8, 0, Math.PI * 2); ctx.fill();
    });
    if (tema.ambiente === 'cueva') {   // brillo de cristal en una esquina
      ctx.fillStyle = tema.cristal; ctx.globalAlpha = 0.65;
      ctx.beginPath(); ctx.moveTo(x + 24, y + 14); ctx.lineTo(x + 30, y + 24); ctx.lineTo(x + 24, y + 34); ctx.lineTo(x + 18, y + 24); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
    }
  };

  Renderer.prototype.pinchos = function (x, y, tema) {
    var ctx = this.ctx;
    ctx.fillStyle = tema.pincho; ctx.strokeStyle = tema.pinchoBorde; ctx.lineWidth = 2; ctx.lineJoin = 'round';
    for (var i = 0; i < 2; i++) {
      var bx = x + i * T / 2;
      ctx.beginPath();
      ctx.moveTo(bx + 2, y + T); ctx.lineTo(bx + T / 4, y + T * 0.35); ctx.lineTo(bx + T / 2 - 2, y + T);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  };

  Renderer.prototype.estrellas = function (p) {
    var ctx = this.ctx, tema = p.tema, img = R.imagen(tema.imagenes && tema.imagenes.estrella);
    var cam = p.camara.x;
    for (var i = 0; i < p.nivel.estrellas.length; i++) {
      var e = p.nivel.estrellas[i];
      if (e.recogida || e.x < cam - 40 || e.x > cam + R.ANCHO + 40) continue;
      var y = e.y + Math.sin(this.t * 3 + e.fase) * 4;
      if (img) { ctx.drawImage(img, e.x - 16, y - 16, 32, 32); continue; }
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.beginPath(); ctx.arc(e.x, y, 20, 0, Math.PI * 2); ctx.fill();
      R.dibujarEstrella(ctx, e.x, y, e.r, Math.sin(this.t * 2 + e.fase) * 0.25, tema.estrella, tema.estrellaBorde);
    }
  };

  Renderer.prototype.checkpoints = function (p) {
    var ctx = this.ctx, tema = p.tema;
    for (var i = 0; i < p.nivel.checkpoints.length; i++) {
      var c = p.nivel.checkpoints[i];
      ctx.fillStyle = tema.poste; ctx.fillRect(c.x - 3, c.y - 2 * T + 8, 6, 2 * T - 8);
      ctx.fillStyle = c.activo ? tema.checkpoint : 'rgba(255,255,255,0.45)';
      var ondula = c.activo ? Math.sin(this.t * 8) * 3 : 0;
      ctx.beginPath(); ctx.moveTo(c.x + 3, c.y - 2 * T + 8); ctx.lineTo(c.x + 30 + ondula, c.y - 2 * T + 20); ctx.lineTo(c.x + 3, c.y - 2 * T + 32); ctx.closePath(); ctx.fill();
      ctx.fillStyle = tema.bloqueSombra; rr(ctx, c.x - 10, c.y - 8, 20, 8, 3); ctx.fill();
    }
  };

  Renderer.prototype.meta = function (p) {
    var ctx = this.ctx, tema = p.tema, m = p.nivel.meta;
    var px = m.x + 12, top = m.y - 3 * T - 10;
    ctx.fillStyle = tema.bloqueSombra; rr(ctx, px - 12, m.y - 10, 24, 10, 3); ctx.fill();
    ctx.fillStyle = tema.poste; ctx.fillRect(px - 3, top, 6, 3 * T);
    ctx.fillStyle = tema.estrella; ctx.beginPath(); ctx.arc(px, top, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = tema.bandera;
    var w = Math.sin(this.t * 6) * 4;
    ctx.beginPath();
    ctx.moveTo(px + 3, top + 8);
    ctx.quadraticCurveTo(px + 24, top + 14 + w, px + 46, top + 10 + w);
    ctx.lineTo(px + 40 + w, top + 30);
    ctx.quadraticCurveTo(px + 22, top + 36 - w, px + 3, top + 42);
    ctx.closePath(); ctx.fill();
    R.dibujarEstrella(ctx, px + 24, top + 25, 8, 0, '#fff', null);
  };

  /* =============== Enemigos =============== */
  /* Cada tipo (data/enemies.js) tiene su "forma". Todos se dibujan con el
     origen en el piso del bicho (x al medio, y en las patas) y con el color
     de enemigo del tema, aclarado u oscurecido según el tinte del tipo. */

  function ojos(ctx, e, ancho, alturaOjos, color, pupila) {
    var dir = e.mirando || -1;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(dir * 5 - ancho, alturaOjos, 4.5, 0, Math.PI * 2);
    ctx.arc(dir * 5 + ancho, alturaOjos, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = pupila || '#111';
    ctx.beginPath();
    ctx.arc(dir * 6 - ancho, alturaOjos, 2, 0, Math.PI * 2);
    ctx.arc(dir * 6 + ancho, alturaOjos, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  function cejasEnojadas(ctx, x, y) {
    ctx.strokeStyle = '#111'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-x, y); ctx.lineTo(-2, y + 3);
    ctx.moveTo(x, y); ctx.lineTo(2, y + 3);
    ctx.stroke();
  }

  /* Caminante: el bicho de siempre, patitas y cuerpo redondeado. */
  function dibujarBaboso(ctx, e, tema, color) {
    var paso = Math.sin(e.t * 12) * 4;
    ctx.fillStyle = sombrear(color, -0.35);
    rr(ctx, -14 + paso, -6, 12, 6, 3); ctx.fill();
    rr(ctx, 2 - paso, -6, 12, 6, 3); ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-e.w / 2, -4);
    ctx.quadraticCurveTo(-e.w / 2, -e.h, 0, -e.h);
    ctx.quadraticCurveTo(e.w / 2, -e.h, e.w / 2, -4);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = sombrear(color, 0.18);
    ctx.beginPath(); ctx.arc(-4, -e.h + 10, 6, 0, Math.PI * 2); ctx.fill();
    ojos(ctx, e, 5.5, -e.h + 14, tema.enemigoOjos);
    cejasEnojadas(ctx, 11, -e.h + 6);
  }

  /* Saltarín: cuerpo de gelatina sobre un resorte. Se estira al subir
     y se aplasta justo antes de saltar. */
  function dibujarResorte(ctx, e, tema, color) {
    var estirar = R.clamp(-(e.vy || 0) / 1600, -0.18, 0.22);
    var porSaltar = e.enSuelo && e.espera < 0.35 ? 0.16 : 0;
    var alto = e.h * (1 + estirar - porSaltar), ancho = e.w * (1 - estirar * 0.7 + porSaltar * 0.6);

    // Resorte (un zigzag que se estira y se comprime con el cuerpo)
    var altoResorte = 11 + estirar * 10;
    ctx.strokeStyle = sombrear(color, -0.45); ctx.lineWidth = 3;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (var i = 1; i <= 4; i++) ctx.lineTo((i % 2 ? -1 : 1) * 7, -altoResorte * i / 4);
    ctx.stroke();
    ctx.fillStyle = sombrear(color, -0.3);
    rr(ctx, -10, -4, 20, 5, 2.5); ctx.fill();   // pie

    // Cuerpo
    ctx.fillStyle = color;
    rr(ctx, -ancho / 2, -alto - altoResorte, ancho, alto, ancho / 2.6); ctx.fill();
    ctx.fillStyle = sombrear(color, 0.22);
    ctx.beginPath(); ctx.arc(-ancho / 4, -alto - altoResorte + 8, 5, 0, Math.PI * 2); ctx.fill();
    ojos(ctx, e, 6, -alto - altoResorte + 13, tema.enemigoOjos);
    // Boca abierta: siempre parece que se va a impulsar
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.ellipse(0, -alto - altoResorte + 25, 5, 3.5, 0, 0, Math.PI * 2); ctx.fill();
  }

  /* Volador: sin patas, con dos alas que aletean. */
  function dibujarAlado(ctx, e, tema, color) {
    var aleteo = Math.sin(e.t * 14);
    var cy = -e.h / 2 - 2;
    // Alas: salen de arriba del cuerpo y aletean (se ven aunque el bicho sea chico)
    ctx.fillStyle = sombrear(color, 0.4);
    ctx.strokeStyle = sombrear(color, -0.2); ctx.lineWidth = 1.5; ctx.lineJoin = 'round';
    [-1, 1].forEach(function (lado) {
      ctx.save();
      ctx.translate(lado * (e.w / 2 - 8), cy - 9);
      ctx.rotate(lado * (aleteo * 0.6 - 0.45));
      ctx.beginPath();
      ctx.moveTo(0, 2);
      ctx.quadraticCurveTo(lado * 10, -24, lado * 26, -18);
      ctx.quadraticCurveTo(lado * 20, 0, lado * 5, 7);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    });
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.ellipse(0, cy, e.w / 2.4, e.h / 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = sombrear(color, -0.3);
    ctx.beginPath(); ctx.ellipse(0, cy + 6, e.w / 4, e.h / 5, 0, 0, Math.PI * 2); ctx.fill();
    ojos(ctx, e, 5.5, cy - 3, tema.enemigoOjos);
  }

  /* Perseguidor: flaco y puntiagudo. Cuando te ve se le ponen los ojos
     rojos, se le eriza la cresta y deja líneas de velocidad. */
  function dibujarVeloz(ctx, e, tema, color) {
    var dir = e.mirando || -1, alerta = e.alerta || 0;
    if (alerta > 0.3) {
      ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 2;
      for (var i = 0; i < 3; i++) {
        var y = -8 - i * 8, largo = 10 + i * 5 + Math.sin(e.t * 20 + i) * 4;
        ctx.beginPath(); ctx.moveTo(-dir * (e.w / 2 + 3), y); ctx.lineTo(-dir * (e.w / 2 + 3 + largo), y); ctx.stroke();
      }
    }
    var paso = Math.sin(e.t * 18) * 5;
    ctx.fillStyle = sombrear(color, -0.4);
    rr(ctx, -13 + paso, -7, 11, 7, 3); ctx.fill();
    rr(ctx, 2 - paso, -7, 11, 7, 3); ctx.fill();

    // Cresta
    ctx.fillStyle = sombrear(color, alerta > 0.3 ? 0.35 : 0.1);
    for (var k = -1; k <= 1; k++) {
      var bx = k * 8, alto = (alerta > 0.3 ? 12 : 7) + Math.abs(k) * -2;
      ctx.beginPath();
      ctx.moveTo(bx - 5, -e.h + 6); ctx.lineTo(bx - dir * 2, -e.h + 6 - alto); ctx.lineTo(bx + 5, -e.h + 6);
      ctx.closePath(); ctx.fill();
    }

    // Cuerpo inclinado hacia donde mira
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-dir * e.w / 2, -5);
    ctx.quadraticCurveTo(-dir * e.w / 2, -e.h + 4, dir * 4, -e.h + 2);
    ctx.quadraticCurveTo(dir * e.w / 2, -e.h + 6, dir * (e.w / 2 - 2), -5);
    ctx.closePath(); ctx.fill();

    ojos(ctx, e, 5, -e.h + 12, alerta > 0.3 ? '#ff5252' : tema.enemigoOjos, alerta > 0.3 ? '#3a0000' : '#111');
    cejasEnojadas(ctx, 12, -e.h + 4);
  }

  /* Blindado: caparazón con púas. Cuando las esconde titila y se lo puede
     aplastar; ese es el momento de saltarle encima. */
  function dibujarPuas(ctx, e, tema, color) {
    var puas = e.puas, cambio = e.cambioPuas || 0;
    var avisando = !puas && cambio < 0.6 && Math.floor(cambio * 10) % 2 === 0;   // titila antes de volver a sacarlas
    var paso = Math.sin(e.t * 8) * 3;
    ctx.fillStyle = sombrear(color, -0.4);
    rr(ctx, -15 + paso, -6, 12, 6, 3); ctx.fill();
    rr(ctx, 3 - paso, -6, 12, 6, 3); ctx.fill();

    // Púas: afuera son triángulos largos; escondidas, apenas bultitos
    ctx.fillStyle = puas ? '#d8dee9' : sombrear(color, -0.15);
    ctx.strokeStyle = '#4a5160'; ctx.lineWidth = 1.5; ctx.lineJoin = 'round';
    for (var i = -1; i <= 1; i++) {
      var bx = i * 11, alto = puas ? 13 : 4;
      ctx.beginPath();
      ctx.moveTo(bx - 6, -e.h + 6);
      ctx.lineTo(bx, -e.h + 6 - alto);
      ctx.lineTo(bx + 6, -e.h + 6);
      ctx.closePath(); ctx.fill();
      if (puas) ctx.stroke();
    }

    // Caparazón
    ctx.fillStyle = avisando ? sombrear(color, 0.35) : color;
    ctx.beginPath();
    ctx.moveTo(-e.w / 2, -4);
    ctx.quadraticCurveTo(-e.w / 2, -e.h + 4, 0, -e.h + 4);
    ctx.quadraticCurveTo(e.w / 2, -e.h + 4, e.w / 2, -4);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = sombrear(color, -0.25);
    ctx.fillRect(-e.w / 2 + 4, -14, e.w - 8, 3);
    ojos(ctx, e, 6, -e.h + 16, puas ? tema.enemigoOjos : '#b6f7c1');
    cejasEnojadas(ctx, 12, -e.h + 9);
  }

  var FORMAS = {
    baboso: dibujarBaboso,
    resorte: dibujarResorte,
    alado: dibujarAlado,
    veloz: dibujarVeloz,
    puas: dibujarPuas
  };

  Renderer.prototype.enemigos = function (p) {
    var ctx = this.ctx, tema = p.tema, cam = p.camara.x;
    for (var i = 0; i < p.nivel.enemigos.length; i++) {
      var e = p.nivel.enemigos[i];
      if (!e.vivo && e.tiempoAplastado > 0.6) continue;   // ya terminó de desinflarse
      if (e.x + e.w < cam - 60 || e.x > cam + R.ANCHO + 60) continue;
      var dibujo = FORMAS[e.tipo.forma] || dibujarBaboso;
      var color = sombrear(tema.enemigo, e.tipo.tinte || 0);
      ctx.save();
      ctx.translate(e.x + e.w / 2, e.y + e.h);
      if (!e.vivo) ctx.scale(1.3, 0.3);
      dibujo(ctx, e, tema, color);
      ctx.restore();
    }
  };

  Renderer.prototype.jugador = function (p) {
    var j = p.jugador;
    R.dibujarPersonaje(this.ctx, p.personaje, j.x + j.w / 2, j.y + j.h, {
      anim: j.anim, enSuelo: j.enSuelo || p.estado === 'ganado', mirando: j.mirando, vx: p.estado === 'ganado' ? 0 : j.vx, vy: j.vy, t: j.t,
      parpadeo: j.invulnerable > 0 && Math.floor(j.invulnerable * 12) % 2 === 0,
      muerto: p.estado === 'muriendo'
    });
  };

  /* =============== Carrera (varios corredores) =============== */

  /* Los rivales, medio transparentes y con su nombre (en su color) encima. */
  Renderer.prototype.rivales = function (p) {
    var ctx = this.ctx, cam = p.camara.x;
    for (var i = 0; i < p.rivales.length; i++) {
      var r = p.rivales[i];
      if (!r.activo) continue;
      if (r.x + 80 < cam || r.x - 80 > cam + R.ANCHO) continue;   // fuera de la pantalla: lo muestra la barra

      ctx.save();
      ctx.globalAlpha = 0.5;
      R.dibujarPersonaje(ctx, r.personaje, r.x + 15, r.y + 44, {
        anim: r.anim, enSuelo: r.enSuelo, mirando: r.mirando, vx: r.vx, t: r.t, muerto: r.muerto
      });
      ctx.globalAlpha = 0.9;
      ctx.font = '800 13px system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(0,0,0,0.65)';
      ctx.strokeText(r.nombre, r.x + 15, r.y - 6);
      ctx.fillStyle = r.color || '#9ad7ff'; ctx.fillText(r.nombre, r.x + 15, r.y - 6);
      ctx.restore();
    }
  };

  /* Una marca en la barra. fila: -1 y -2 son los dos renglones de arriba
     (los rivales se reparten para no taparse) y 1 es el de abajo (yo). */
  function marcaCarrera(ctx, x, y, w, prog, color, etiqueta, fila) {
    var mx = x + w * R.clamp(prog, 0, 1);
    ctx.beginPath(); ctx.arc(mx, y, 7, 0, Math.PI * 2);
    ctx.fillStyle = color; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.stroke();
    ctx.font = '800 12px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = fila < 0 ? 'bottom' : 'top';
    var ty = fila < 0 ? y - 10 + (fila + 1) * 15 : y + 10;
    ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(0,0,0,0.65)';
    ctx.strokeText(etiqueta, mx, ty);
    ctx.fillStyle = color; ctx.fillText(etiqueta, mx, ty);
  }

  /* Barra con el avance de todos los corredores hacia la meta. */
  Renderer.prototype.barraCarrera = function (p) {
    var vivos = p.rivales.filter(function (r) { return r.activo; });
    if (!vivos.length) return;
    var ctx = this.ctx;
    var dosFilas = vivos.length > 2;                  // con muchos, los nombres van en dos renglones
    var w = 400, h = 9, x = (R.ANCHO - w) / 2, y = dosFilas ? 88 : 80;
    var alto = dosFilas ? 59 : 44, arriba = dosFilas ? 39 : 24;

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    rr(ctx, x - 26, y - arriba, w + 62, h + alto, 14); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    rr(ctx, x, y - h / 2, w, h, 5); ctx.fill();
    ctx.font = '16px system-ui, sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('🏁', x + w + 8, y);
    for (var i = 0; i < vivos.length; i++) {
      var r = vivos[i];
      var fila = dosFilas && i % 2 ? -2 : -1;
      marcaCarrera(ctx, x, y, w, r.prog, r.color || '#9ad7ff', nombreCorto(r.nombre), fila);
    }
    marcaCarrera(ctx, x, y, w, p.progreso(), p.miColor, 'VOS', 1);
    ctx.restore();
  };

  /* En la barra no entran los nombres largos. */
  function nombreCorto(n) {
    n = String(n || '');
    return n.length > 9 ? n.slice(0, 8) + '…' : n;
  }

  /* 3 · 2 · 1 antes de largar, igual en todos los dispositivos. */
  Renderer.prototype.cuentaRegresiva = function (p) {
    if (p.estado !== 'preparando') return;
    var ctx = this.ctx;
    var num = Math.max(1, Math.ceil(p.cuenta));
    var frac = p.cuenta - Math.floor(p.cuenta);   // va de 1 a 0 dentro de cada segundo
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '800 26px system-ui, sans-serif';
    ctx.lineWidth = 7; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.strokeText('¡Preparados!', R.ANCHO / 2, R.ALTO * 0.3);
    ctx.fillStyle = '#fff'; ctx.fillText('¡Preparados!', R.ANCHO / 2, R.ALTO * 0.3);

    ctx.translate(R.ANCHO / 2, R.ALTO * 0.5);
    ctx.scale(0.8 + frac * 0.5, 0.8 + frac * 0.5);
    ctx.globalAlpha = Math.min(1, 0.35 + frac);
    ctx.font = '900 110px system-ui, sans-serif';
    ctx.lineWidth = 12; ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.strokeText(String(num), 0, 0);
    ctx.fillStyle = '#ffd23f'; ctx.fillText(String(num), 0, 0);
    ctx.restore();
  };

  Renderer.prototype.particulas = function (p) {
    var ctx = this.ctx;
    for (var i = 0; i < p.particulas.length; i++) {
      var q = p.particulas[i];
      ctx.globalAlpha = Math.max(0, q.vida / q.vidaMax);
      ctx.fillStyle = q.color;
      ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  Renderer.prototype.mensaje = function (p) {
    if (!p.mensaje) return;
    var ctx = this.ctx, m = p.mensaje;
    var a = Math.min(1, m.t / 0.4);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.font = '900 40px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineJoin = 'round';
    ctx.strokeText(m.texto, R.ANCHO / 2, R.ALTO * 0.35);
    ctx.fillStyle = '#fff'; ctx.fillText(m.texto, R.ANCHO / 2, R.ALTO * 0.35);
    ctx.restore();
  };

  /* Escena animada de fondo para el menú principal */
  Renderer.prototype.escenaMenu = function (tema, personaje, dt) {
    this.t += dt;
    var ctx = this.ctx, cam = this.t * 90;
    this.fondo(tema, cam);
    ctx.save();
    ctx.translate(-(cam % T), 0);
    var filaSuelo = 10;
    for (var cx = -1; cx <= R.ANCHO / T + 1; cx++) {
      this.suelo(cx * T, filaSuelo * T, tema, true, cx + Math.floor(cam / T), filaSuelo);
    }
    ctx.restore();
    // Estrellas flotando
    for (var i = 0; i < 6; i++) {
      var sx = ((i * 260 + 100 - cam * 1.0) % (R.ANCHO + 200) + (R.ANCHO + 200)) % (R.ANCHO + 200) - 100;
      var sy = 300 + Math.sin(this.t * 2 + i) * 20 - (i % 3) * 60;
      R.dibujarEstrella(ctx, sx, sy, 14, Math.sin(this.t + i) * 0.3, tema.estrella, tema.estrellaBorde);
    }
    if (personaje) {
      R.dibujarPersonaje(ctx, personaje, R.ANCHO * 0.5, filaSuelo * T, { anim: this.t, enSuelo: true, mirando: 1, vx: 300, t: this.t, esc: 1.4 });
    }
  };

  R.Renderer = Renderer;
  R.sombrear = sombrear;
})(window.RUNNER);
