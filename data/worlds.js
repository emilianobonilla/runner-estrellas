/* ============================================================
   MUNDOS (grupos de niveles que comparten estética)
   ------------------------------------------------------------
   Como en Mario Bros: varios niveles seguidos comparten el mismo
   tema visual y forman un "mundo". Así no hay que inventar una
   estética nueva para cada nivel.

   Campos:
     id           identificador corto que usan los niveles (mundo: 'm1')
     orden        posición del mundo en el juego (1, 2, 3...)
     nombre       se muestra como título del grupo en "Elegí un nivel"
     tema         id de un tema de data/themes.js (la estética del mundo)
     enemigo      id de un tipo de data/enemies.js: el bicho que sale con
                  la letra 'E' en los mapas de este mundo
     dificultad   1 a 5; los niveles del mundo la heredan si no ponen la suya
     descripcion  frase corta que acompaña al título

   Para agregar un nivel a un mundo: creá el archivo en data/levels/
   con "mundo: 'm3'" y agregalo a index.html. Para un mundo nuevo:
   agregá acá el mundo (con su tema) y después sus niveles.
   ============================================================ */

RUNNER.registrarMundo({
  id: 'm1',
  orden: 1,
  nombre: 'Prado Soleado',
  tema: 'prado',
  enemigo: 'caminante',   // el más simple: va y viene
  dificultad: 1,
  descripcion: 'Campo abierto para aprender a correr y saltar.'
});

RUNNER.registrarMundo({
  id: 'm2',
  orden: 2,
  nombre: 'Cuevas Profundas',
  tema: 'cueva',
  enemigo: 'saltarin',   // camina y pega saltos
  dificultad: 2,
  descripcion: 'Túneles oscuros con pozos y pinchos.'
});

RUNNER.registrarMundo({
  id: 'm3',
  orden: 3,
  nombre: 'Costa Dorada',
  tema: 'playa',
  enemigo: 'volador',   // flota y cruza los pozos
  dificultad: 3,
  descripcion: 'Arena, olas y saltos más largos.'
});

RUNNER.registrarMundo({
  id: 'm4',
  orden: 4,
  nombre: 'Tierra del Volcán',
  tema: 'volcan',
  enemigo: 'perseguidor',   // si te ve, corre atrás tuyo
  dificultad: 4,
  descripcion: 'Roca caliente: casi no hay lugar para descansar.'
});

RUNNER.registrarMundo({
  id: 'm5',
  orden: 5,
  nombre: 'Castillo de las Estrellas',
  tema: 'castillo',
  enemigo: 'blindado',   // con púas: hay que esperar el momento
  dificultad: 5,
  descripcion: 'El desafío final para los mejores corredores.'
});
