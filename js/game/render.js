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
    if (!im) { im = new Image(); im.src = src; cacheImg[src] = im; }
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
  /* e = { anim, enSuelo, mirando, vx, vy, t, parpadeo, muerto, esc } */
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
    var corriendo = e.enSuelo && Math.abs(e.vx || 0) > 20;
    var saltando = !e.enSuelo && !e.muerto;
    var fase = Math.sin((e.anim || 0) * 16);
    var swing = corriendo ? fase * 0.9 : 0;
    var bob = corriendo ? Math.abs(fase) * 2 : 0;

    if (e.muerto) { ctx.rotate(0.6); ctx.translate(0, 6); }

    // Piernas
    function pierna(x, ang) {
      ctx.save(); ctx.translate(x, -20); ctx.rotate(ang);
      ctx.fillStyle = c.pantalon; ctx.fillRect(-4, 0, 8, 16);
      ctx.fillStyle = c.zapatos; rr(ctx, -5, 13, 12, 7, 3); ctx.fill();
      ctx.restore();
    }
    pierna(-6, saltando ? 0.7 : swing);
    pierna(6, saltando ? -0.5 : -swing);

    // Brazo trasero
    function brazo(x, ang) {
      ctx.save(); ctx.translate(x, -36 - bob); ctx.rotate(ang);
      ctx.fillStyle = c.remera; rr(ctx, -3, 0, 7, 8, 3); ctx.fill();
      ctx.fillStyle = c.piel; rr(ctx, -3, 6, 7, 10, 3); ctx.fill();
      ctx.restore();
    }
    brazo(-9, saltando ? -2.6 : -swing * 0.9);

    // Cuerpo
    ctx.fillStyle = c.remera; rr(ctx, -11, -40 - bob, 22, 22, 6); ctx.fill();
    ctx.fillStyle = sombrear(c.remera, -0.25); ctx.fillRect(-11, -22 - bob, 22, 3);

    // Brazo delantero
    brazo(9, saltando ? -2.6 : swing * 0.9);

    // Cabeza
    var cy = -52 - bob;
    ctx.fillStyle = c.piel;
    if (per.formaCabeza === 'cuadrada') { rr(ctx, -12, cy - 12, 24, 24, 5); ctx.fill(); }
    else { ctx.beginPath(); ctx.arc(0, cy, 12.5, 0, Math.PI * 2); ctx.fill(); }

    // Pelo
    ctx.fillStyle = c.pelo;
    if (per.formaCabeza === 'cuadrada') { rr(ctx, -12, cy - 12, 24, 7, 4); ctx.fill(); }
    else { ctx.beginPath(); ctx.arc(0, cy - 1, 12.5, Math.PI * 1.05, Math.PI * 1.95); ctx.lineTo(9, cy - 9); ctx.closePath(); ctx.fill(); }

    // Ojos
    if (e.muerto) {
      ctx.strokeStyle = '#222'; ctx.lineWidth = 2;
      [3, 9].forEach(function (ex) {
        ctx.beginPath(); ctx.moveTo(ex - 2.5, cy - 4); ctx.lineTo(ex + 2.5, cy + 1); ctx.moveTo(ex + 2.5, cy - 4); ctx.lineTo(ex - 2.5, cy + 1); ctx.stroke();
      });
    } else {
      var parpadeo = Math.sin((e.t || 0) * 1.7) > 0.985;
      [3, 9].forEach(function (ex) {
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex, cy - 1, 3.6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1a1a1a';
        if (parpadeo) ctx.fillRect(ex - 3, cy - 1, 6, 1.5);
        else { ctx.beginPath(); ctx.arc(ex + 1.2, cy - 1, 1.9, 0, Math.PI * 2); ctx.fill(); }
      });
      // Boca
      ctx.strokeStyle = sombrear(c.piel, -0.45); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(7, cy + 4, 3, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    }

    // Accesorio
    var ac = c.accesorio || c.pelo;
    switch (per.accesorio) {
      case 'gorra':
        ctx.fillStyle = ac; rr(ctx, -13, cy - 15, 26, 9, 4); ctx.fill();
        ctx.fillRect(4, cy - 10, 16, 4);
        break;
      case 'mono':
        ctx.fillStyle = c.pelo; ctx.beginPath(); ctx.arc(-7, cy - 14, 6.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = ac; ctx.beginPath(); ctx.arc(-3, cy - 10, 2.5, 0, Math.PI * 2); ctx.fill();
        break;
      case 'antena':
        ctx.strokeStyle = c.pelo; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, cy - 12); ctx.lineTo(0, cy - 22); ctx.stroke();
        ctx.fillStyle = ac; ctx.beginPath(); ctx.arc(0, cy - 24, 4, 0, Math.PI * 2); ctx.fill();
        break;
      case 'orejas':
        ctx.fillStyle = ac;
        ctx.beginPath(); ctx.moveTo(-11, cy - 6); ctx.lineTo(-11, cy - 20); ctx.lineTo(-2, cy - 11); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(11, cy - 6); ctx.lineTo(11, cy - 20); ctx.lineTo(2, cy - 11); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffb3c6';
        ctx.beginPath(); ctx.moveTo(-9, cy - 9); ctx.lineTo(-9, cy - 16); ctx.lineTo(-4, cy - 11); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(9, cy - 9); ctx.lineTo(9, cy - 16); ctx.lineTo(4, cy - 11); ctx.closePath(); ctx.fill();
        break;
      case 'vincha':
        ctx.fillStyle = ac; ctx.fillRect(-12.5, cy - 9, 25, 4);
        break;
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
    this.tiles(p.nivel, p.tema, cam);
    this.checkpoints(p);
    this.meta(p);
    this.estrellas(p);
    this.enemigos(p);
    this.jugador(p);
    this.particulas(p);
    ctx.restore();
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
      ctx.fillStyle = tema.sol; ctx.beginPath(); ctx.arc(R.ANCHO - 130, 84, 42, 0, Math.PI * 2); ctx.fill();
    }
    if (tema.nubes) {
      ctx.fillStyle = tema.nubes;
      var par = cam * 0.2, W = 1400;
      for (var i = 0; i < 9; i++) {
        var nx = ((i * 197 + 60 - par) % W + W) % W - 150;
        var ny = 36 + (i * 61) % 150;
        this.nube(nx, ny, 0.7 + (i % 3) * 0.3);
      }
    }
    var self = this;
    (tema.colinas || []).forEach(function (color, i) {
      var par = cam * (0.35 + i * 0.25);
      var base = R.ALTO - T - (i === 0 ? 40 : 10);
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.moveTo(0, R.ALTO);
      for (var x = 0; x <= R.ANCHO; x += 8) {
        var wx = x + par;
        var y = base - Math.abs(Math.sin(wx * 0.0038 + i * 1.3)) * (110 - i * 40) - Math.sin(wx * 0.013 + i) * 12;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(R.ANCHO, R.ALTO); ctx.closePath(); ctx.fill();
    });
  };

  Renderer.prototype.nube = function (x, y, e) {
    var ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(x, y, 22 * e, 0, Math.PI * 2);
    ctx.arc(x + 26 * e, y - 10 * e, 28 * e, 0, Math.PI * 2);
    ctx.arc(x + 56 * e, y, 22 * e, 0, Math.PI * 2);
    ctx.arc(x + 28 * e, y + 8 * e, 20 * e, 0, Math.PI * 2);
    ctx.fill();
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
    ctx.fillStyle = tema.sueloDetalle;
    for (var k = 0; k < 3; k++) {
      var rx = hash(cx * 3 + k, cy * 7 + 1), ry = hash(cy * 5 + k, cx * 11 + 3);
      ctx.fillRect(x + 4 + rx * 34, y + 16 + ry * 26, 6, 4);
    }
    if (arriba) {
      ctx.fillStyle = tema.sueloTop; ctx.fillRect(x, y, T, 12);
      ctx.fillStyle = sombrear(tema.sueloTop, 0.25);
      ctx.fillRect(x + 6 + hash(cx, 9) * 20, y - 5, 4, 6);
      ctx.fillRect(x + 28 + hash(cx, 4) * 12, y - 4, 4, 5);
      ctx.fillStyle = sombrear(tema.sueloTop, -0.2); ctx.fillRect(x, y + 10, T, 3);
    }
  };

  Renderer.prototype.bloque = function (x, y, tema) {
    var ctx = this.ctx;
    ctx.fillStyle = tema.bloque; ctx.fillRect(x, y, T, T);
    ctx.fillStyle = tema.bloqueLuz; ctx.fillRect(x, y, T, 5); ctx.fillRect(x, y, 5, T);
    ctx.fillStyle = tema.bloqueSombra; ctx.fillRect(x, y + T - 5, T, 5); ctx.fillRect(x + T - 5, y, 5, T);
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(x + 12, y + 12, T - 24, T - 24);
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
      ctx.beginPath(); ctx.arc(e.x, y, 20 + Math.sin(this.t * 5 + e.fase) * 2, 0, Math.PI * 2); ctx.fill();
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

  Renderer.prototype.enemigos = function (p) {
    var ctx = this.ctx, tema = p.tema;
    for (var i = 0; i < p.nivel.enemigos.length; i++) {
      var e = p.nivel.enemigos[i];
      var cx = e.x + e.w / 2, base = e.y + e.h;
      ctx.save();
      ctx.translate(cx, base);
      if (!e.vivo) ctx.scale(1.3, 0.3);
      // Patas
      var paso = Math.sin(e.t * 12) * 4;
      ctx.fillStyle = sombrear(tema.enemigo, -0.35);
      rr(ctx, -14 + paso, -6, 12, 6, 3); ctx.fill();
      rr(ctx, 2 - paso, -6, 12, 6, 3); ctx.fill();
      // Cuerpo
      ctx.fillStyle = tema.enemigo;
      ctx.beginPath(); ctx.moveTo(-e.w / 2, -4); ctx.quadraticCurveTo(-e.w / 2, -e.h, 0, -e.h); ctx.quadraticCurveTo(e.w / 2, -e.h, e.w / 2, -4); ctx.closePath(); ctx.fill();
      ctx.fillStyle = sombrear(tema.enemigo, 0.18); ctx.beginPath(); ctx.arc(-4, -e.h + 10, 6, 0, Math.PI * 2); ctx.fill();
      // Ojos (enojados)
      var dir = e.vx < 0 ? -1 : 1;
      ctx.fillStyle = tema.enemigoOjos;
      ctx.beginPath(); ctx.arc(dir * 5 - 5, -e.h + 14, 4.5, 0, Math.PI * 2); ctx.arc(dir * 5 + 6, -e.h + 14, 4.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(dir * 6 - 5, -e.h + 14, 2, 0, Math.PI * 2); ctx.arc(dir * 6 + 6, -e.h + 14, 2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#111'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-11, -e.h + 6); ctx.lineTo(-2, -e.h + 9); ctx.moveTo(11, -e.h + 6); ctx.lineTo(2, -e.h + 9); ctx.stroke();
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
