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
