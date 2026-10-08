/* ============================================================
   REFERENCIA — Super Mario Bros., pantalla 1-1, en nuestro formato
   ------------------------------------------------------------
   La primera pantalla del Super Mario Bros. de NES dibujada con la
   misma leyenda que usan nuestros niveles (ver nivel-01-prado.js).
   Las posiciones salen de los datos reales del nivel (rangos de tiles
   del 1-1 en el proyecto abierto meth-meth-method/super-mario) y se
   cotejaron con el recorrido de Super Mario Wiki: tres pozos, seis
   tuberías, dos pirámides de escaleras, la escalera final y el mástil.

   ESCALA
     1 tile original (16 px) = 1 celda nuestra (48 px). Son 212
     columnas, igual que el original. El original tiene 15 filas; acá
     van las filas 3 a 13 (arriba solo hay cielo) y su piso de 2 filas
     es 1 sola. Los números de la regla de arriba del mapa son las
     columnas (empiezan en 0).

   QUÉ ES CADA COSA
     piso, con sus 3 pozos ............ G
     bloques '?' (son 13) ............. #  con una estrella '*' justo
                                        arriba (lo que saldría del bloque)
     bloque oculto del 1-UP ........... *  flotando (col 64, fila 5)
     ladrillos ........................ L  (se rompen de un cabezazo)
     tuberías, escaleras y torre ...... #
     Goombas y Koopa .................. A  (caminante; en cualquier mundo)
     mástil con bandera ............... F  (col 198)
     inicio ........................... P
     checkpoints ...................... C  (los agregué yo, no son del
                                        original: cols 61, 93, 119, 145, 167)

   DÓNDE QUEDA CADA COSA (columnas)
     pozos ...... 69-70 · 86-88 · 153-154
     tuberías ... 28 (2 de alto) · 38 (3) · 46 (4) · 57 (4) · 163 (2) · 179 (2)
     escaleras .. 134-137 sube y 140-143 baja (con 2 de piso entre medio)
                  148-152 sube y queda arriba · pozo · 155-158 baja
                  181-189 sube hasta 8 de alto (la final)

   LO QUE NO SE PUDO REPRESENTAR
     - Qué hay dentro de cada bloque (hongo, flor, estrella, 10 monedas).
     - La zona subterránea de la tubería de la col 57: acá es una tubería
       común. Tampoco el castillo del final (cols 202-210).
     - Los Goombas de las cols 80 y 82 caminan sobre los ladrillos de la
       fila 2; nuestro caminante da media vuelta en el borde y no cae.

   PARA JUGARLO
     Este archivo está en data/referencias/ a propósito: index.html no lo
     carga y herramientas/probar-niveles.js no lo revisa. Para sumarlo al
     juego, moverlo a data/levels/ (por ejemplo nivel-26-mario.js) y
     agregar su <script> en index.html junto a los del prado.
     Ojo: el probador va a avisar de 7 cosas, porque el 1-1 original no
     está pensado para chicos de 7 años: dos tuberías de 4 celdas (cols
     46 y 57), la pared de 4 de la col 140 y 4 bloques sueltos a más de
     3 celdas de cualquier apoyo (cols 22, 94, 109 y 118). El bot de prueba
     lo termina igual (unos 30 s con la física real).
   ============================================================ */
RUNNER.registrarNivel({
  id: 'referencia-mario-1-1',
  orden: 26,
  nombre: 'Pradera Clásica',
  descripcion: 'Un paseo largo con tuberías, escaleras y muchos caminantes.',
  mundo: 'm1',
  dificultad: 2,
  tiempoObjetivo: 120,
  mapa: [
  // 0         10        20        30        40        50        60        70        80        90        100       110       120       130       140       150       160       170       180       190       200       21
  // 01234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901
    '....................................................................................................................................................................................................................',
    '......................*.........................................................A.A...........*..............*...................**.................................................................................',
    '......................#.........................................................LLLLLLLL...LLL#..............#...........LLL....L##L........................................................##......................',
    '...........................................................................................................................................................................................###......................',
    '..........................................................................................................................................................................................####......................',
    '................*....*.*........................................*.............*...........................*..*..*.........................................................*..............#####......................',
    '................#...L#L#L.....................##.........##..................L#L..............L.....LL....#..#..#.....L..........LL......#..#..........##..#............LL#L............######......................',
    '......................................##......##.........##.............................................................................##..##........###..##..........................#######......................',
    '............................##........##......##.........##............................................................................###..###......####..###.....##..............##.########......................',
    '..P...................A.....##........##A.....##...A.A...##..C...............................C...A.A.......A......A.A..C....A.A.A.A...####..####.C..#####..####....##..C......A.A..###########........F.............',
    'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG..GGGGGGGGGGGGGGG...GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG..GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG'
  ]
});
