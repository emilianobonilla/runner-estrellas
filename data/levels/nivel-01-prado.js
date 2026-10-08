/* ============================================================
   NIVEL 1-1 — El Prado  (Mundo 1: Prado Soleado)
   ------------------------------------------------------------
   El mapa se dibuja con caracteres. Cada carácter es una celda
   de 48x48 px. Las filas pueden tener distinto largo (se rellenan
   con '.'). Se recomienda 11 filas (alto de la pantalla).

   Leyenda:
     .  vacío              G  suelo (sólido)      #  bloque (sólido)
     *  estrella           ^  pincho (mata)       E  enemigo del mundo
     P  inicio del jugador C  checkpoint          F  meta (bandera)
     L  ladrillo: sólido, pero se rompe de un cabezazo desde abajo

   La 'E' pone el enemigo que le toca al mundo del nivel: caminante en
   el prado, saltarín en la cueva, volador en la playa, perseguidor en
   el volcán y blindado en el castillo (ver data/enemies.js). Si querés
   uno distinto, usá su letra: A caminante · S saltarín · V volador
   (va en el aire) · R perseguidor · B blindado.

   Reglas útiles para diseñar:
     - El salto sube hasta 3 celdas de plataforma y alcanza
       estrellas hasta 4 celdas por encima del piso.
     - Un pozo de hasta 4 celdas se puede saltar corriendo.

   El campo "mundo" dice a qué grupo de niveles pertenece: de ahí
   sale la estética (ver data/worlds.js). Varios niveles seguidos
   comparten mundo, como en Mario Bros.
   ============================================================ */
RUNNER.registrarNivel({
  id: 'nivel-01',
  orden: 1,
  nombre: 'El Prado',
  descripcion: 'Un paseo tranquilo para aprender a correr y saltar.',
  mundo: 'm1',          // estética del mundo (ver data/worlds.js)
  dificultad: 1,
  tiempoObjetivo: 60,   // segundos: si terminás antes, ganás bonus de tiempo
  mapa: [
  // 0         10        20        30        40        50        60        70        80        90        100       110       120       130       140       150       160       170       180       190       200       21
  // 01234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901
    '..............................................................................................................',
    '..............................................................................................................',
    '..............................................................................................................',
    '..................................................***.........................................................',
    '.................................................#####........................................................',
    '..........*......*...........*..........*.....*..............*.........*...*....................*.............',
    '..............................................................................................................',
    '.........LLL................###........###...###............###.......#LLLL#........*..........###............',
    '...................................................................................LLL........................',
    '...P..................^^....................E..........C..............E...................^^^...........F.....',
    'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG...GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG...GGGGGGGGGGGGGGGGGGGGGGGGGGGGG'
  ]
});
