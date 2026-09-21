/* ============================================================
   PROBADOR DE NIVELES  —  node herramientas/probar-niveles.js
   ------------------------------------------------------------
   Revisa todos los niveles de data/levels/ de dos maneras:

   1) Reglas de diseño (pensadas para un chico de ~7 años):
        - pozos de hasta 4 celdas, con borde firme de los dos lados
        - nada de techos justo antes de un pozo o encima de un pincho
        - escalones de terreno de hasta 3 celdas
        - plataformas flotantes con apoyo a menos de 3 celdas de altura
        - estrellas a menos de 5 celdas sobre una superficie cercana
        - pinchos, enemigos, checkpoints y bandera apoyados en el piso
        - enemigos lejos de pinchos y de los bordes de los pozos

   2) Un bot que juega el nivel con la física real del juego:
      corre a la derecha y salta; si muere, reintenta cambiando la
      forma de saltar ESE obstáculo. Si ninguna combinación llega a
      la meta, el nivel es imposible (o hay un salto demasiado justo).

   No forma parte del juego: index.html no lo carga.
   ============================================================ */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const BASE = path.join(__dirname, '..');

/* ---------- cargar el juego como lo haría el navegador ---------- */
const sandbox = { console, Math, Date };
sandbox.window = sandbox;
vm.createContext(sandbox);
const cargar = (rel) => vm.runInContext(fs.readFileSync(path.join(BASE, rel), 'utf8'), sandbox, { filename: rel });
['js/core/util.js', 'js/game/entities.js', 'js/game/level.js', 'js/game/player.js'].forEach(cargar);
const archivos = fs.readdirSync(path.join(BASE, 'data/levels')).filter((f) => f.endsWith('.js')).sort();
archivos.forEach((f) => cargar('data/levels/' + f));
const R = sandbox.window.RUNNER, T = R.TILE;

/* ============================================================
   1) Reglas de diseño
   ============================================================ */
const MAX_POZO = 4, MAX_ESCALON = 3;

function revisar(def) {
  const filas = def.mapa, alto = filas.length;
  const ancho = filas.reduce((m, f) => Math.max(m, f.length), 0);
  const ch = (c, r) => (r < 0 || r >= alto || c < 0 || c >= ancho) ? '.' : (filas[r][c] || '.');
  const solido = (c, r) => (c < 0 || c >= ancho) ? true : ch(c, r) === 'G' || ch(c, r) === '#';
  const piso = alto - 1;
  const errores = [];

  // superficie más alta pisable de la columna
  function superficie(c) {
    for (let r = 0; r < alto; r++) if (solido(c, r)) return r;
    return null;
  }
  // piso continuo (ignora plataformas flotantes)
  function terreno(c) {
    for (let r = 0; r < alto; r++) {
      let macizo = true;
      for (let rr = r; rr <= piso; rr++) if (!solido(c, rr)) { macizo = false; break; }
      if (macizo) return r;
    }
    return null;
  }

  const cuenta = {};
  for (let r = 0; r < alto; r++) for (let c = 0; c < ancho; c++) cuenta[ch(c, r)] = (cuenta[ch(c, r)] || 0) + 1;
  ['P', 'F'].forEach((k) => { if (cuenta[k] !== 1) errores.push(`tiene que haber exactamente un '${k}' (hay ${cuenta[k] || 0})`); });

  for (let r = 0; r < alto; r++) for (let c = 0; c < ancho; c++) {
    const x = ch(c, r);
    if ('PCEF^'.indexOf(x) >= 0 && x !== '.' && !solido(c, r + 1)) errores.push(`'${x}' en el aire (col ${c}, fila ${r})`);
    if (x === '*' && solido(c, r)) errores.push(`estrella tapada por un macizo (col ${c}, fila ${r})`);
    if ((x === 'C' || x === 'F') && solido(c, r - 1)) errores.push(`'${x}' sin lugar para el poste (col ${c}, fila ${r})`);
  }

  // pozos
  for (let c = 0; c < ancho; c++) {
    if (superficie(c) !== null) continue;
    const c0 = c;
    while (c < ancho && superficie(c) === null) c++;
    const c1 = c - 1, anchoPozo = c1 - c0 + 1;
    if (anchoPozo > MAX_POZO) errores.push(`pozo de ${anchoPozo} celdas (col ${c0}-${c1}); el máximo es ${MAX_POZO}`);
    const izq = c0 > 0 ? superficie(c0 - 1) : null, der = c1 + 1 < ancho ? superficie(c1 + 1) : null;
    if (izq === null || der === null) errores.push(`pozo sin borde firme (col ${c0}-${c1})`);
    else if (der < izq - MAX_ESCALON) errores.push(`pozo col ${c0}-${c1}: hay que subir ${izq - der} celdas al otro lado`);
    for (let cc = Math.max(0, c0 - 2); cc < Math.min(ancho, c1 + 3); cc++) {
      if (cc >= c0 && cc <= c1) continue;
      const s = terreno(cc);
      if (s === null) continue;
      for (let rr = Math.max(0, s - 4); rr < s; rr++) if (solido(cc, rr)) errores.push(`techo sobre el borde del pozo (col ${cc}, fila ${rr})`);
    }
  }

  // pinchos: despeje arriba
  for (let r = 0; r < alto; r++) for (let c = 0; c < ancho; c++) {
    if (ch(c, r) !== '^') continue;
    for (let cc = Math.max(0, c - 2); cc < Math.min(ancho, c + 3); cc++)
      for (let rr = Math.max(0, r - 4); rr < r; rr++)
        if (solido(cc, rr)) errores.push(`techo cerca del pincho de col ${c} (macizo en col ${cc}, fila ${rr})`);
  }

  // escalones de terreno
  for (let c = 1; c < ancho; c++) {
    const a = terreno(c - 1), b = terreno(c);
    if (a === null || b === null) continue;
    if (a - b > MAX_ESCALON) errores.push(`escalón de ${a - b} celdas para arriba en col ${c}`);
  }

  // plataformas flotantes con apoyo
  for (let r = 0; r < alto; r++) for (let c = 0; c < ancho; c++) {
    if (ch(c, r) !== '#' || solido(c, r - 1)) continue;
    let apoyo = false;
    for (let cc = Math.max(0, c - 4); cc < Math.min(ancho, c + 5); cc++)
      for (let rr = r; rr < Math.min(alto, r + 4); rr++)
        if (solido(cc, rr) && !solido(cc, rr - 1) && !(cc === c && rr === r)) apoyo = true;
    if (!apoyo) errores.push(`plataforma inalcanzable en col ${c}, fila ${r}`);
  }

  // estrellas al alcance: tiene que haber piso a menos de 5 celdas por debajo
  for (let r = 0; r < alto; r++) for (let c = 0; c < ancho; c++) {
    if (ch(c, r) !== '*') continue;
    let ok = false;
    for (let cc = Math.max(0, c - 2); cc < Math.min(ancho, c + 3); cc++)
      for (let rr = r + 1; rr <= Math.min(alto - 1, r + 5); rr++)
        if (solido(cc, rr)) { ok = true; break; }
    if (!ok) errores.push(`estrella difícil de alcanzar en col ${c}, fila ${r}`);
  }

  // enemigos: no pegados a un pincho y con al menos 3 celdas para caminar
  for (let r = 0; r < alto; r++) for (let c = 0; c < ancho; c++) {
    if (ch(c, r) !== 'E') continue;
    if (ch(c - 1, r) === '^' || ch(c + 1, r) === '^') errores.push(`enemigo pegado a un pincho (col ${c})`);
    let paseo = 1;
    for (let cc = c - 1; cc >= 0 && solido(cc, r + 1) && ch(cc, r) !== '^'; cc--) paseo++;
    for (let cc = c + 1; cc < ancho && solido(cc, r + 1) && ch(cc, r) !== '^'; cc++) paseo++;
    if (paseo < 3) errores.push(`enemigo sin lugar para caminar (col ${c}, solo ${paseo} celdas)`);
  }
  return errores;
}

/* ============================================================
   2) Bot que juega el nivel
   ============================================================ */
const VARIANTES = [];
[34, 22, 46, 14, 58, 70, 8, 84].forEach((u) => [0.45, 0.16, 0.30, 0.60, 0.10].forEach((h) => VARIANTES.push({ u, h })));

function jugar(def, decisiones) {
  const nivel = new R.Nivel(def), j = new R.Jugador();
  j.reiniciar(nivel.inicio.x, nivel.inicio.y);
  const input = { izq: false, der: true, salto: false, saltoPulsado: false };
  const dt = 1 / 120;
  let sostener = 0, estrellas = 0, t = 0, maxX = 0, ultima = null;
  const recientes = [];

  function obstaculo() {
    const filaPies = Math.floor((j.y + j.h) / T), bordeDer = j.x + j.w;
    for (let d = 0; d <= 7; d++) {
      const c = Math.floor((bordeDer - 1) / T) + d;
      if (nivel.celda(c, filaPies - 1) === '^') return { clave: 'p' + c + '.' + filaPies, dist: c * T + 8 - bordeDer, largo: false };
      if (nivel.esSolido(c, filaPies - 1)) return { clave: 'm' + c + '.' + filaPies, dist: c * T - bordeDer, largo: true };
      if (!nivel.esSolido(c, filaPies)) {
        let escalon = false;
        for (let f = filaPies + 1; f <= filaPies + 3; f++) if (nivel.esSolido(c, f)) { escalon = true; break; }
        if (escalon) continue;                                   // solo baja: se camina
        let sube = false, lejos = false;
        for (let dd = 0; dd <= 7; dd++) {
          let f = null;
          for (let fila = filaPies - 3; fila <= filaPies + 3; fila++)
            if (nivel.esSolido(c + dd, fila) && !nivel.esSolido(c + dd, fila - 1)) { f = fila; break; }
          if (f !== null) { sube = f < filaPies; lejos = dd >= 3; break; }
        }
        return { clave: 'z' + c + '.' + filaPies, dist: c * T - bordeDer, largo: sube || lejos };
      }
    }
    return null;
  }

  for (let paso = 0; paso < 120 * 200; paso++) {
    t += dt;
    if (j.enSuelo || j.coyote > 0) {
      const o = obstaculo();
      if (o) {
        if (o.clave !== ultima) { recientes.push(o.clave); if (recientes.length > 6) recientes.shift(); ultima = o.clave; }
        const v = VARIANTES[decisiones[o.clave] || 0];
        if (o.dist <= (o.largo ? v.u + 22 : v.u)) {
          input.saltoPulsado = true;
          sostener = o.largo ? Math.max(v.h, 0.30) : v.h;
        }
      }
    }
    input.salto = sostener > 0;
    if (sostener > 0) sostener -= dt;
    j.actualizar(dt, nivel, input, 0, null);
    input.saltoPulsado = false;
    nivel.enemigos.forEach((e) => e.actualizar(dt, nivel));
    maxX = Math.max(maxX, j.x);

    for (const e of nivel.estrellas) {
      if (e.recogida) continue;
      if (Math.abs(j.x + j.w / 2 - e.x) < j.w / 2 + e.r - 4 && Math.abs(j.y + j.h / 2 - e.y) < j.h / 2 + e.r - 4) { e.recogida = true; estrellas++; }
    }
    const fallar = (motivo) => ({ ok: false, motivo, col: Math.floor(maxX / T), maxX, t, claves: recientes.slice().reverse() });
    if (j.y > nivel.alto + 40) return fallar('se cayó al vacío');
    if (nivel.peligroEnRect(j.x + 5, j.y + 6, j.w - 10, j.h - 6)) return fallar('lo mataron los pinchos');
    const m = nivel.meta;
    if (j.x + j.w > m.x + 12 && j.x < m.x + T - 12 && j.y + j.h > m.y - 3 * T)
      return { ok: true, t, estrellas, total: nivel.estrellas.length, maxX };
  }
  return { ok: false, motivo: 'se quedó trabado', col: Math.floor(maxX / T), maxX, t, claves: recientes.slice().reverse() };
}

/* Juega y, ante cada muerte, reintenta cambiando el salto del obstáculo culpable. */
function resolver(def) {
  let decisiones = {}, mejor = jugar(def, decisiones), corridas = 1;
  for (let iter = 0; iter < 600 && !mejor.ok; iter++) {
    let cand = null, candDec = null;
    for (const clave of mejor.claves.slice(0, 4)) {
      for (let v = 0; v < VARIANTES.length; v++) {
        if ((decisiones[clave] || 0) === v) continue;
        const d2 = Object.assign({}, decisiones); d2[clave] = v;
        const r = jugar(def, d2); corridas++;
        if (r.ok) return { mejor: r, corridas, ajustes: Object.keys(d2).length };
        if (!cand || r.maxX > cand.maxX) { cand = r; candDec = d2; }
      }
      if (cand && cand.maxX > mejor.maxX + 4) break;
    }
    if (!cand || cand.maxX <= mejor.maxX + 4) break;
    mejor = cand; decisiones = candDec;
  }
  return { mejor, corridas, ajustes: Object.keys(decisiones).length };
}

/* ============================================================
   Informe
   ============================================================ */
let problemas = 0;
R.niveles.sort((a, b) => (a.orden || 0) - (b.orden || 0)).forEach((def) => {
  const nombre = `${def.orden}. ${def.nombre}`.padEnd(16);
  const errores = revisar(def);
  const { mejor, corridas, ajustes } = resolver(def);
  const nivel = new R.Nivel(def);
  if (errores.length) {
    console.log(`⚠️  ${nombre} ${errores.length} aviso(s) de diseño (revisalos, no siempre son un error):`);
    errores.slice(0, 12).forEach((e) => console.log(`      - ${e}`));
  }
  if (mejor.ok) {
    console.log(`✅ ${nombre} el bot lo termina en ${mejor.t.toFixed(1)}s (objetivo ${def.tiempoObjetivo}s) · ` +
      `${nivel.estrellas.length} estrellas, ${nivel.enemigos.length} enemigos, ${nivel.checkpoints.length} checkpoints · ` +
      `${ajustes} salto(s) ajustado(s) en ${corridas} intento(s)`);
  } else {
    problemas++;
    console.log(`❌ ${nombre} el bot NO llega: ${mejor.motivo} en la col ${mejor.col} de ${nivel.cols} (${corridas} intentos)`);
  }
});
console.log(problemas ? `\n${problemas} nivel(es) para revisar.` : '\nTodos los niveles están bien. 🎉');
process.exit(problemas ? 1 : 0);
