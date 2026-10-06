/* ============================================================
   PERSONAJES
   ------------------------------------------------------------
   Cada personaje se dibuja con formas simples a partir de sus
   colores y detalles (ver R.dibujarPersonaje en js/game/render.js).
   formaCabeza: 'redonda' | 'cuadrada'
   peinado: 'corto' | 'puntas' | 'flequillo' | 'largo' | 'ninguno'
   accesorio (uno o una lista): 'gorra' | 'mono' | 'antena' | 'orejas' (gato) |
     'orejas-zorro' | 'orejas-oso' | 'vincha' | 'casco' | 'sombrero' | 'corona' |
     'banda' (ninja) | 'pirata' | 'lentes' | 'gorro' | 'cresta'
   cola: 'gato' | 'zorro' | 'dino'      capa / mochila: un color
   detalle (de la remera): 'rayas' | 'panza' | 'estrella' | 'panel' | 'cinturon' | 'botones' | 'bufanda'
   Extras: hocico (color), nariz (color), pico (color), parches (color de los ojos),
     bigotes, tornillos, boca: 'recta', ojos (color), colores.manga / mano / panza

   Opcional: usar una hoja de sprites propia (PNG) en assets/img/:
     sprite: {
       src: 'assets/img/mi-personaje.png',
       ancho: 32, alto: 48,             // tamaño de cada cuadro
       escala: 1.2,                     // agrandar/achicar al dibujar
       fps: 10,
       animaciones: { quieto: [0], correr: [1, 2, 3, 4], saltar: [5] }
     }
   Los cuadros se numeran de izquierda a derecha y de arriba a abajo.
   ============================================================ */

RUNNER.registrarPersonaje({
  id: 'nico',
  nombre: 'Nico',
  descripcion: 'Rápido y con gorra.',
  formaCabeza: 'redonda',
  peinado: 'corto',
  accesorio: 'gorra',
  detalle: 'estrella',
  colores: { piel: '#f1c27d', pelo: '#3a2416', remera: '#e63946', pantalon: '#1d3557', zapatos: '#f4f4f4', accesorio: '#e63946' }
});

RUNNER.registrarPersonaje({
  id: 'luna',
  nombre: 'Luna',
  descripcion: 'Le encanta saltar alto.',
  formaCabeza: 'redonda',
  peinado: 'largo',
  accesorio: 'mono',
  detalle: 'rayas',
  colores: { piel: '#c68642', pelo: '#1f1a17', remera: '#8e44ad', pantalon: '#2c3e50', zapatos: '#f4f4f4', accesorio: '#ff7ab6' }
});

RUNNER.registrarPersonaje({
  id: 'robi',
  nombre: 'Robi',
  descripcion: 'Un robot curioso.',
  formaCabeza: 'cuadrada',
  peinado: 'ninguno',
  accesorio: 'antena',
  detalle: 'panel',
  tornillos: true,
  boca: 'recta',
  mejillas: false,
  colores: { piel: '#b8c4d6', pelo: '#7f8ea3', remera: '#4cc9f0', pantalon: '#3a506b', zapatos: '#1b262c', accesorio: '#ff4d4d', mano: '#b8c4d6' }
});

RUNNER.registrarPersonaje({
  id: 'michi',
  nombre: 'Michi',
  descripcion: 'Gato con muchas vidas.',
  formaCabeza: 'redonda',
  peinado: 'ninguno',
  accesorio: 'orejas',
  cola: 'gato',
  detalle: 'panza',
  nariz: '#ff8fa3',
  bigotes: true,
  colores: { piel: '#f89319', pelo: '#f89319', remera: '#f89319', pantalon: '#f89319', zapatos: '#d9730d', accesorio: '#f89319', panza: '#fff1d6', hocico: '#fff1d6' }
});

RUNNER.registrarPersonaje({
  id: 'astro',
  nombre: 'Astro',
  descripcion: 'Viaja por las estrellas.',
  formaCabeza: 'redonda',
  peinado: 'corto',
  accesorio: 'casco',
  mochila: '#ced4da',
  detalle: 'panel',
  colores: { piel: '#f1c27d', pelo: '#5a3b1f', remera: '#f8f9fa', pantalon: '#e9ecef', zapatos: '#4361ee', accesorio: '#4361ee', mano: '#4361ee' }
});

RUNNER.registrarPersonaje({
  id: 'panda',
  nombre: 'Panda',
  descripcion: 'Tranquilo y abrazable.',
  formaCabeza: 'redonda',
  peinado: 'ninguno',
  accesorio: 'orejas-oso',
  detalle: 'panza',
  parches: '#23232b',
  nariz: '#23232b',
  colores: { piel: '#fbfbfb', pelo: '#23232b', remera: '#fbfbfb', pantalon: '#2b2b33', zapatos: '#23232b', accesorio: '#23232b', manga: '#2b2b33', mano: '#2b2b33', panza: '#fbfbfb' }
});

RUNNER.registrarPersonaje({
  id: 'zorrito',
  nombre: 'Zorrito',
  descripcion: 'Astuto y veloz.',
  formaCabeza: 'redonda',
  peinado: 'ninguno',
  accesorio: 'orejas-zorro',
  cola: 'zorro',
  detalle: 'panza',
  nariz: '#2b2118',
  colores: { piel: '#e8702a', pelo: '#e8702a', remera: '#e8702a', pantalon: '#6b3a1d', zapatos: '#2b2118', accesorio: '#e8702a', panza: '#fff4e6', hocico: '#fff4e6', mano: '#2b2118' }
});

RUNNER.registrarPersonaje({
  id: 'dino',
  nombre: 'Dino',
  descripcion: 'Pequeño pero feroz.',
  formaCabeza: 'redonda',
  peinado: 'ninguno',
  accesorio: 'cresta',
  cola: 'dino',
  detalle: 'panza',
  nariz: '#2f6b3f',
  colores: { piel: '#5cc66b', pelo: '#5cc66b', remera: '#5cc66b', pantalon: '#4aa958', zapatos: '#2f6b3f', accesorio: '#ff9f1c', panza: '#e8f7c8', hocico: '#c8efb0' }
});

RUNNER.registrarPersonaje({
  id: 'merlina',
  nombre: 'Merlina',
  descripcion: 'Hace magia con las estrellas.',
  formaCabeza: 'redonda',
  peinado: 'largo',
  accesorio: 'sombrero',
  capa: '#5e3a9e',
  detalle: 'estrella',
  colores: { piel: '#f6d1b0', pelo: '#d9d9e8', remera: '#7b4fc9', pantalon: '#3d2a6b', zapatos: '#ffd23f', accesorio: '#5e3a9e' }
});

RUNNER.registrarPersonaje({
  id: 'ninja',
  nombre: 'Ninja',
  descripcion: 'Silencioso y ágil.',
  formaCabeza: 'redonda',
  peinado: 'ninguno',
  accesorio: 'banda',
  detalle: 'cinturon',
  colores: { piel: '#f1c27d', pelo: '#1b1b1b', remera: '#2b2d42', pantalon: '#2b2d42', zapatos: '#1b1b1b', accesorio: '#e63946', mano: '#f1c27d' }
});

RUNNER.registrarPersonaje({
  id: 'princesa',
  nombre: 'Coro',
  descripcion: 'Reina de las nubes.',
  formaCabeza: 'redonda',
  peinado: 'largo',
  accesorio: 'corona',
  detalle: 'botones',
  colores: { piel: '#8d5524', pelo: '#2a1a10', remera: '#ff6fa5', pantalon: '#ff9ec4', zapatos: '#ffd23f', accesorio: '#4cc9f0' }
});

RUNNER.registrarPersonaje({
  id: 'pipa',
  nombre: 'Pipa',
  descripcion: 'Capitana de los siete mares.',
  formaCabeza: 'redonda',
  peinado: 'ninguno',
  accesorio: 'pirata',
  detalle: 'rayas',
  colores: { piel: '#e8b88a', pelo: '#7a3b12', remera: '#f8f9fa', pantalon: '#5a3b1f', zapatos: '#2b2118', accesorio: '#d62839' }
});

RUNNER.registrarPersonaje({
  id: 'pingo',
  nombre: 'Pingo',
  descripcion: 'Le gusta deslizarse.',
  formaCabeza: 'redonda',
  peinado: 'ninguno',
  accesorio: 'gorro',
  detalle: 'panza',
  pico: '#ff9f1c',
  colores: { piel: '#2e3a59', pelo: '#2e3a59', remera: '#2e3a59', pantalon: '#ff9f1c', zapatos: '#ff9f1c', accesorio: '#e63946', panza: '#ffffff', hocico: '#ffffff', mano: '#2e3a59' }
});
