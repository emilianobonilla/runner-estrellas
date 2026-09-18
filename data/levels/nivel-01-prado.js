/* ============================================================
   NIVEL 1 — El Prado
   ------------------------------------------------------------
   El mapa se dibuja con caracteres. Cada carácter es una celda
   de 48x48 px. Las filas pueden tener distinto largo (se rellenan
   con '.'). Se recomienda 11 filas (alto de la pantalla).

   Leyenda:
     .  vacío              G  suelo (sólido)      #  bloque (sólido)
     *  estrella           ^  pincho (mata)       E  enemigo caminante
     P  inicio del jugador C  checkpoint          F  meta (bandera)

   Reglas útiles para diseñar:
     - El salto sube hasta 3 celdas de plataforma y alcanza
       estrellas hasta 4 celdas por encima del piso.
     - Un pozo de hasta 4 celdas se puede saltar corriendo.
   ============================================================ */
RUNNER.registrarNivel({
  id: 'nivel-01',
  orden: 1,
  nombre: 'El Prado',
  descripcion: 'Un paseo tranquilo para aprender a correr y saltar.',
  tema: 'prado',
  tiempoObjetivo: 60,   // segundos: si terminás antes, ganás bonus de tiempo
  mapa: [
    '..............................................................................................................',
    '..............................................................................................................',
    '..............................................................................................................',
    '..................................................***.........................................................',
    '.................................................#####........................................................',
    '..........*......*...........*..........*.....*..............*.........*...*....................*.............',
    '.........###...........................###...###......................######..................................',
    '............................###.............................###................................###............',
    '..............................................................................................................',
    '...P..................^^....................E..........C..............E...................^^^...........F.....',
    'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG...GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG...GGGGGGGGGGGGGGGGGGGGGGGGGGGGG'
  ]
});
