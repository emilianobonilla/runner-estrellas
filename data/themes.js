/* ============================================================
   TEMAS VISUALES (estética del juego)
   ------------------------------------------------------------
   Cada tema define los colores del escenario. Para cambiar la
   estética alcanza con editar colores o agregar un tema nuevo.

   Opcional: "imagenes" permite reemplazar el dibujo procedural
   por imágenes propias (PNG) ubicadas en assets/img/:
     imagenes: { fondo: 'assets/img/fondo.png',   // se repite horizontalmente
                 suelo: 'assets/img/suelo.png',   // 48x48
                 bloque: 'assets/img/bloque.png', // 48x48
                 pincho: 'assets/img/pincho.png', // 48x48
                 estrella: 'assets/img/estrella.png' }
   Si una imagen no existe, se usa el dibujo por defecto.
   ============================================================ */

RUNNER.registrarTema({
  id: 'prado',
  nombre: 'Prado soleado',
  cielo: ['#63b8ff', '#d9f1ff'],
  sol: '#fff3a3',
  nubes: 'rgba(255,255,255,0.9)',
  colinas: ['#8fd18f', '#5aab5e'],
  sueloTop: '#5fb548',
  sueloRelleno: '#8b5a2b',
  sueloDetalle: '#6f4521',
  bloque: '#d59a4b',
  bloqueLuz: '#f0c27e',
  bloqueSombra: '#8a5a22',
  pincho: '#cfd4dc',
  pinchoBorde: '#5a6270',
  estrella: '#ffd23f',
  estrellaBorde: '#e0a400',
  bandera: '#e63946',
  poste: '#f4f4f4',
  checkpoint: '#4cc9f0',
  enemigo: '#8e5b3c',
  enemigoOjos: '#fff',
  imagenes: {}
});

RUNNER.registrarTema({
  id: 'cueva',
  nombre: 'Cueva misteriosa',
  cielo: ['#141a2b', '#2b2f52'],
  sol: null,
  nubes: null,
  colinas: ['#2f3450', '#22263d'],
  sueloTop: '#6e6a8a',
  sueloRelleno: '#3e3a55',
  sueloDetalle: '#2c2940',
  bloque: '#6a5b8a',
  bloqueLuz: '#9a88c2',
  bloqueSombra: '#3e3455',
  pincho: '#c8d2ff',
  pinchoBorde: '#5f6aa8',
  estrella: '#8cf5ff',
  estrellaBorde: '#3ab0c9',
  bandera: '#ff7ab6',
  poste: '#d8d8f0',
  checkpoint: '#c3ff7a',
  enemigo: '#5c4a9e',
  enemigoOjos: '#e8ff5a',
  imagenes: {}
});

RUNNER.registrarTema({
  id: 'nubes',
  nombre: 'Sobre las nubes',
  cielo: ['#ff9a8b', '#ffd6a5'],
  sol: '#fff7d6',
  nubes: 'rgba(255,255,255,0.95)',
  colinas: ['#ffc4b8', '#f7a6a0'],
  sueloTop: '#ffffff',
  sueloRelleno: '#dfe9ff',
  sueloDetalle: '#c2d3f5',
  bloque: '#9ad0ff',
  bloqueLuz: '#d5ecff',
  bloqueSombra: '#5c9ad6',
  pincho: '#ffe6b3',
  pinchoBorde: '#d19a3c',
  estrella: '#ffd23f',
  estrellaBorde: '#e0a400',
  bandera: '#7b5cff',
  poste: '#ffffff',
  checkpoint: '#57cc99',
  enemigo: '#b48cff',
  enemigoOjos: '#fff',
  imagenes: {}
});

RUNNER.registrarTema({
  id: 'bosque',
  nombre: 'Bosque de troncos',
  cielo: ['#7ec8a9', '#e9f7d9'],
  sol: '#fff6c2',
  nubes: 'rgba(255,255,255,0.85)',
  colinas: ['#3f8f5c', '#2b6b44'],
  sueloTop: '#4e9e3e',
  sueloRelleno: '#6b4a2a',
  sueloDetalle: '#53381f',
  bloque: '#a9743f',
  bloqueLuz: '#cf9a5f',
  bloqueSombra: '#6b4520',
  pincho: '#d9e3c7',
  pinchoBorde: '#5b6b45',
  estrella: '#ffd23f',
  estrellaBorde: '#e0a400',
  bandera: '#e63946',
  poste: '#f6f1e7',
  checkpoint: '#4cc9f0',
  enemigo: '#7a5230',
  enemigoOjos: '#fff',
  imagenes: {}
});

RUNNER.registrarTema({
  id: 'playa',
  nombre: 'Playa de verano',
  cielo: ['#2ec5e8', '#d8f6ff'],
  sol: '#fff3a3',
  nubes: 'rgba(255,255,255,0.95)',
  colinas: ['#69d6e3', '#37b3c9'],
  sueloTop: '#f2d99b',
  sueloRelleno: '#d9b877',
  sueloDetalle: '#bd9a5c',
  bloque: '#ffc98b',
  bloqueLuz: '#ffe6c4',
  bloqueSombra: '#c78f4e',
  pincho: '#ffffff',
  pinchoBorde: '#7fa8b8',
  estrella: '#ff9f1c',
  estrellaBorde: '#d97706',
  bandera: '#0077b6',
  poste: '#ffffff',
  checkpoint: '#00c2a8',
  enemigo: '#ef6f4b',
  enemigoOjos: '#fff',
  imagenes: {}
});

RUNNER.registrarTema({
  id: 'nieve',
  nombre: 'Montaña nevada',
  cielo: ['#8fb8de', '#eef6ff'],
  sol: '#fffbe8',
  nubes: 'rgba(255,255,255,0.98)',
  colinas: ['#c8dbef', '#9fbcd8'],
  sueloTop: '#ffffff',
  sueloRelleno: '#a9bed2',
  sueloDetalle: '#8ba4bb',
  bloque: '#dbe9f7',
  bloqueLuz: '#ffffff',
  bloqueSombra: '#93b0c9',
  pincho: '#bfe9ff',
  pinchoBorde: '#5f87a8',
  estrella: '#ffd23f',
  estrellaBorde: '#d99a00',
  bandera: '#e63946',
  poste: '#5f87a8',
  checkpoint: '#22a7f0',
  enemigo: '#6b8fae',
  enemigoOjos: '#fff',
  imagenes: {}
});

RUNNER.registrarTema({
  id: 'ciudad',
  nombre: 'Ciudad de noche',
  cielo: ['#1b1f3b', '#4a3b6b'],
  sol: '#ffe9a8',
  nubes: 'rgba(255,255,255,0.18)',
  colinas: ['#2a2f52', '#1d2140'],
  sueloTop: '#6f7aa3',
  sueloRelleno: '#3b4166',
  sueloDetalle: '#2a2f4d',
  bloque: '#5a6394',
  bloqueLuz: '#8d97cc',
  bloqueSombra: '#343a5e',
  pincho: '#d7dcff',
  pinchoBorde: '#5b63a0',
  estrella: '#ffe066',
  estrellaBorde: '#e0a400',
  bandera: '#ff5d8f',
  poste: '#e7e9ff',
  checkpoint: '#7bf1a8',
  enemigo: '#8c5bd6',
  enemigoOjos: '#ffe066',
  imagenes: {}
});

RUNNER.registrarTema({
  id: 'volcan',
  nombre: 'Volcán ardiente',
  cielo: ['#3a1220', '#c1440e'],
  sol: '#ffb703',
  nubes: 'rgba(60,30,30,0.5)',
  colinas: ['#5c2018', '#3a1410'],
  sueloTop: '#7a2f1c',
  sueloRelleno: '#4a201a',
  sueloDetalle: '#341512',
  bloque: '#8c3b22',
  bloqueLuz: '#d4693a',
  bloqueSombra: '#4f1d10',
  pincho: '#ffd166',
  pinchoBorde: '#b3400f',
  estrella: '#ffe066',
  estrellaBorde: '#e07b00',
  bandera: '#ffd166',
  poste: '#f1e3d3',
  checkpoint: '#4cc9f0',
  enemigo: '#e07a3f',
  enemigoOjos: '#fff',
  imagenes: {}
});

RUNNER.registrarTema({
  id: 'espacio',
  nombre: 'Espacio profundo',
  cielo: ['#050818', '#1b2a5e'],
  sol: null,
  nubes: null,
  colinas: ['#141b3d', '#0b0f26'],
  sueloTop: '#7ce0ff',
  sueloRelleno: '#28336b',
  sueloDetalle: '#1a2250',
  bloque: '#3c4a8f',
  bloqueLuz: '#7f93e0',
  bloqueSombra: '#222b5c',
  pincho: '#a8f0ff',
  pinchoBorde: '#3d7ea6',
  estrella: '#ffffff',
  estrellaBorde: '#7ce0ff',
  bandera: '#00f5d4',
  poste: '#cfe3ff',
  checkpoint: '#00f5d4',
  enemigo: '#6c4ad6',
  enemigoOjos: '#00f5d4',
  imagenes: {}
});

RUNNER.registrarTema({
  id: 'castillo',
  nombre: 'Castillo de las estrellas',
  cielo: ['#2b1b4d', '#8e5fb0'],
  sol: '#ffe9a8',
  nubes: 'rgba(255,255,255,0.35)',
  colinas: ['#453266', '#2e2148'],
  sueloTop: '#9b8bb4',
  sueloRelleno: '#55476e',
  sueloDetalle: '#3d3253',
  bloque: '#7d6b9c',
  bloqueLuz: '#b8a6d4',
  bloqueSombra: '#4a3c66',
  pincho: '#ffe9a8',
  pinchoBorde: '#8a6b3f',
  estrella: '#ffd23f',
  estrellaBorde: '#e0a400',
  bandera: '#ffd23f',
  poste: '#f2ecff',
  checkpoint: '#57cc99',
  enemigo: '#c05bd6',
  enemigoOjos: '#fff',
  imagenes: {}
});
