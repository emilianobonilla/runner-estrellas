/* ============================================================
   TIPOS DE ENEMIGOS
   ------------------------------------------------------------
   Hay 5 tipos, uno por mundo, cada vez más difíciles. El mundo
   dice cuál usa (campo "enemigo" en data/worlds.js), así que en
   el mapa alcanza con poner una 'E': sale el enemigo del mundo.

     Mundo 1  Prado      E → Caminante    va y viene, se aplasta fácil
     Mundo 2  Cueva      E → Saltarín     camina y pega saltos
     Mundo 3  Playa      E → Volador      flota en el aire, sube y baja
     Mundo 4  Volcán     E → Perseguidor  si te ve, corre hacia vos
     Mundo 5  Castillo   E → Blindado     con púas: solo se puede aplastar
                                          cuando las esconde

   Si en un nivel querés un tipo distinto al de su mundo, usá su
   letra propia ("simbolo") en el mapa. Por ejemplo, poner una 'V'
   en el nivel 1-1 agrega un volador aunque el mundo use caminantes.

   Campos de cada tipo:
     id            nombre interno (lo usan los mundos y los niveles)
     simbolo       letra para ponerlo a mano en un mapa
     nombre        cómo se llama en la ayuda del juego
     ancho, alto   tamaño en píxeles (la celda mide 48)
     velocidad     px por segundo caminando (o volando)
     comportamiento  'caminar' | 'saltar' | 'volar' | 'perseguir'
     aplastable    true si muere cuando le saltás encima
     puntos        puntos que da al vencerlo
     forma         dibujo que usa el render (js/game/render.js)
     tinte         aclara (+) u oscurece (-) el color de enemigo del tema

   Para inventar un enemigo nuevo: copiá un bloque de acá, cambiale
   el id, la letra y los números; si querés que se mueva distinto,
   agregá su comportamiento en js/game/entities.js y su dibujo en
   js/game/render.js.
   ============================================================ */

RUNNER.registrarEnemigo({
  id: 'caminante',
  simbolo: 'A',
  nombre: 'Caminante',
  descripcion: 'Va y viene sin apurarse. Da media vuelta en las paredes y en los bordes.',
  ancho: 36, alto: 30,
  velocidad: 55,
  comportamiento: 'caminar',
  aplastable: true,
  puntos: 50,
  forma: 'baboso',
  tinte: 0
});

RUNNER.registrarEnemigo({
  id: 'saltarin',
  simbolo: 'S',
  nombre: 'Saltarín',
  descripcion: 'Camina despacio y cada tanto pega un salto. Hay que calcular el momento.',
  ancho: 34, alto: 32,
  velocidad: 42,
  comportamiento: 'saltar',
  impulso: 620,          // fuerza del salto (px/s): sube algo más de una celda
  esperaSalto: 1.5,      // segundos en el piso entre salto y salto
  aplastable: true,
  puntos: 60,
  forma: 'resorte',
  tinte: 0.12
});

RUNNER.registrarEnemigo({
  id: 'volador',
  simbolo: 'V',
  nombre: 'Volador',
  descripcion: 'Flota en el aire subiendo y bajando. No le importan los pozos: los cruza volando.',
  ancho: 36, alto: 26,
  velocidad: 72,
  comportamiento: 'volar',
  amplitud: 20,          // px que sube y baja
  ritmo: 2.2,            // qué tan rápido sube y baja
  aplastable: true,
  puntos: 70,
  forma: 'alado',
  tinte: 0.18
});

RUNNER.registrarEnemigo({
  id: 'perseguidor',
  simbolo: 'R',
  nombre: 'Perseguidor',
  descripcion: 'Patrulla tranquilo, pero si te ve venir sale corriendo a encararte. Si lo pasás de largo, te deja ir.',
  ancho: 34, alto: 32,
  velocidad: 50,
  comportamiento: 'perseguir',
  velocidadCorriendo: 140,   // corriendo: apurado, pero bastante menos que el jugador (320)
  vista: 290,                // px de distancia a los que te descubre (solo mira hacia adelante)
  aplastable: true,
  puntos: 80,
  forma: 'veloz',
  tinte: -0.12
});

RUNNER.registrarEnemigo({
  id: 'blindado',
  simbolo: 'B',
  nombre: 'Blindado',
  descripcion: 'Camina lento con púas en la espalda: aplastarlo duele. Cada tanto las esconde y ahí sí se puede.',
  ancho: 38, alto: 32,
  velocidad: 40,
  comportamiento: 'caminar',
  aplastable: false,         // ...salvo en los segundos que esconde las púas
  puasFuera: 2.4,            // segundos con púas (no se puede aplastar)
  puasAdentro: 1.4,          // segundos sin púas (se puede aplastar)
  puntos: 120,
  forma: 'puas',
  tinte: -0.2
});
