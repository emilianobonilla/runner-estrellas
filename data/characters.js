/* ============================================================
   PERSONAJES
   ------------------------------------------------------------
   Cada personaje se dibuja con formas simples a partir de sus
   colores y accesorio. Accesorios disponibles:
     'ninguno' | 'gorra' | 'mono' | 'antena' | 'orejas' | 'vincha'
   formaCabeza: 'redonda' | 'cuadrada'

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
  accesorio: 'gorra',
  colores: { piel: '#f1c27d', pelo: '#3a2416', remera: '#e63946', pantalon: '#1d3557', zapatos: '#222831', accesorio: '#e63946' }
});

RUNNER.registrarPersonaje({
  id: 'luna',
  nombre: 'Luna',
  descripcion: 'Le encanta saltar alto.',
  formaCabeza: 'redonda',
  accesorio: 'mono',
  colores: { piel: '#c68642', pelo: '#1f1a17', remera: '#8e44ad', pantalon: '#2c3e50', zapatos: '#f4f4f4', accesorio: '#ff7ab6' }
});

RUNNER.registrarPersonaje({
  id: 'robi',
  nombre: 'Robi',
  descripcion: 'Un robot curioso.',
  formaCabeza: 'cuadrada',
  accesorio: 'antena',
  colores: { piel: '#b8c4d6', pelo: '#7f8ea3', remera: '#4cc9f0', pantalon: '#3a506b', zapatos: '#1b262c', accesorio: '#ff4d4d' }
});

RUNNER.registrarPersonaje({
  id: 'michi',
  nombre: 'Michi',
  descripcion: 'Gato con muchas vidas.',
  formaCabeza: 'redonda',
  accesorio: 'orejas',
  colores: { piel: '#f89319', pelo: '#f89319', remera: '#57cc99', pantalon: '#264653', zapatos: '#f89319', accesorio: '#f5a442' }
});
