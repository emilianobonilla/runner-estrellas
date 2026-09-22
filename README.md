# Runner de Estrellas

Juego de plataformas estilo *Mario Bros* / *Ika* (Plan Ceibal): el personaje corre,
salta y junta estrellas hasta llegar a la bandera, esquivando pinchos, pozos y
enemigos. Funciona **sin internet** y sin instalar nada (salvo el modo *Carrera*,
que conecta entre sí hasta 6 dispositivos).

**Jugar online:** https://emilianobonilla.github.io/runner-estrellas/

## Cómo jugar

1. Abrí `index.html` con doble clic (Chrome, Firefox, Edge o Safari), o entrá al enlace de arriba.
2. Escribí tu nombre, elegí un nivel y ¡a correr!

| Acción     | Teclas                         |
|------------|--------------------------------|
| Moverse    | `←` `→` o `A` `D`              |
| Saltar     | `↑`, `W` o `Espacio` (mantené para saltar más alto) |
| Pausa      | `Esc` o `P`                    |

En tablets aparecen botones táctiles en pantalla (se puede forzar en *Personalizar*).

**Pantalla completa:** al empezar un nivel el juego pasa solo a pantalla completa
(Chrome, Edge, Firefox, Silk en tablets Fire). Se puede desactivar en *Personalizar*
o alternar con el botón ⛶ del menú y del marcador; `Esc` sale y pausa.
En **iPhone/iPad** Safari no permite pantalla completa a las páginas: tocá
*Compartir → Agregar a pantalla de inicio* y abrí el juego desde ese ícono.

El personaje puede retroceder un poco, pero la pantalla nunca vuelve atrás.

**Puntos:** estrella 100 · pisar enemigo 50 a 120 (según el tipo) · meta 500 · bonus por
tiempo y por juntar todas las estrellas.

**Vidas:** son 3 para toda la partida, no por nivel: lo que sobra al terminar un nivel se
lleva al siguiente. Vuelven a 3 al empezar un recorrido nuevo (elegir un nivel en el menú,
"Jugar de nuevo" o después del fin del juego); "Reiniciar nivel" desde la pausa sigue el
mismo recorrido y conserva las que quedan.

**Checkpoints:** se activan al cruzar la línea de la bandera, a cualquier altura y sin
tener que tocarla. La bandera de meta, en cambio, sí hay que tocarla.

## Estructura del proyecto

```
index.html            Página principal (lista de scripts: agregá aquí los archivos nuevos)
css/style.css         Estilos de menús y HUD
data/themes.js        Estéticas (colores del escenario, imágenes opcionales)
data/worlds.js        Mundos: grupos de niveles que comparten estética, enemigo y dificultad
data/enemies.js       Tipos de enemigos (uno por mundo: cómo se mueven y cuánto valen)
data/characters.js    Personajes (colores, accesorio, sprite opcional)
data/levels/*.js      Niveles (mapas de caracteres), agrupados por mundo
assets/img/           Íconos de la app e imágenes propias opcionales (fondos, sprites, tiles)
manifest.webmanifest  Datos para instalar como app (nombre, ícono, pantalla completa)
js/core/              Utilidades, teclado/táctil, sonido, guardado local, pantalla completa
js/core/version.js    Número de versión del juego (lo muestra el cartelito del menú)
js/game/              Nivel, entidades, jugador (física), render, partida
js/net/               Carrera entre varios dispositivos: red.js (conexión) y carrera.js (árbitro)
js/vendor/            PeerJS, la única librería externa (guardada acá, no se baja de internet)
js/ui/screens.js      Pantallas: menú, niveles, personalizar, ranking, competencias, carrera
js/main.js            Arranque y bucle del juego
herramientas/         Scripts de apoyo (probar niveles, publicar una versión)
```

## Mundos (grupos de niveles)

Como en Mario Bros, los niveles se agrupan en **mundos** y todos los niveles de un
mundo comparten la misma estética. Los mundos se definen en `data/worlds.js` y hoy
hay 5, con 2 niveles cada uno:

| Mundo | Nombre | Tema | Enemigo | Dificultad | Niveles |
|-------|--------|------|---------|------------|---------|
| 1 | Prado Soleado | `prado` | Caminante | ★☆☆☆☆ | 1-1 El Prado · 1-2 Sendero del Prado |
| 2 | Cuevas Profundas | `cueva` | Saltarín | ★★☆☆☆ | 2-1 La Cueva · 2-2 Túnel Profundo |
| 3 | Costa Dorada | `playa` | Volador | ★★★☆☆ | 3-1 La Playa · 3-2 Marea Alta |
| 4 | Tierra del Volcán | `volcan` | Perseguidor | ★★★★☆ | 4-1 Salto de Rocas · 4-2 El Volcán |
| 5 | Castillo de las Estrellas | `castillo` | Blindado | ★★★★★ | 5-1 Las Torres · 5-2 El Castillo |

En la pantalla *Elegí un nivel* cada mundo aparece con su título, una muestra de su
estética y sus niveles numerados `1-1`, `1-2`, etc.

Un nivel hereda el tema, el enemigo y la dificultad de su mundo; si el nivel pone
`dificultad` o `enemigo` propios, esos mandan. Para **agregar un mundo**: registrá el mundo en `data/worlds.js`
(elegí uno de los temas libres de `data/themes.js`: `nubes`, `bosque`, `nieve`,
`ciudad`, `espacio`) y después creá sus niveles con ese `mundo`.

## Crear un nivel nuevo

El juego trae 10 niveles (`nivel-01` a `nivel-10`), de dificultad 1 a 5. Para agregar otro:

1. Copiá `data/levels/nivel-04-cueva.js` a `data/levels/nivel-11-loquesea.js`.
2. Cambiá `id`, `orden`, `nombre`, `descripcion`, `mundo` (el id de un mundo de
   `data/worlds.js`: de ahí sale la estética), `dificultad` (1 a 5, se muestra en
   estrellitas en la lista de niveles) y `tiempoObjetivo`.
3. Dibujá el `mapa` (11 filas recomendadas; cada carácter es una celda de 48 px):

```
.  vacío        G  suelo         #  bloque        *  estrella
^  pincho       E  enemigo       C  checkpoint    P  inicio      F  meta
```

La `E` pone **el enemigo del mundo** (ver la tabla de arriba), así el mismo mapa cambia de
bicho según dónde esté. Para forzar un tipo concreto usá su letra: `A` caminante ·
`S` saltarín · `V` volador (va en el aire, no apoyado) · `R` perseguidor · `B` blindado.

4. Agregá la línea `<script src="data/levels/nivel-11-loquesea.js"></script>` en
   `index.html`, junto a los otros niveles de su mundo. Listo: aparece dentro de su
   mundo en la lista de niveles, en el ranking y en las competencias.

Consejos de diseño (medidos con la física actual):

- Un toque corto salta ~2,4 celdas; manteniendo la tecla sube ~4,7 celdas. Poné los cubos
  a **3 celdas** por encima del piso (fila del cubo = fila del piso − 4, por ejemplo fila 7
  si el piso está en la fila 10 y el jugador camina en la 9). A 4 celdas se llega, pero es difícil.
- Las estrellas se alcanzan hasta **5 celdas** por encima del piso.
- Corriendo se cruza un pozo de hasta **5 celdas** (4 es cómodo).
- Cuidado con techos o bloques bajos encima de una plataforma: el jugador se golpea la cabeza.
- No pongas una plataforma baja (a 2 o 3 celdas) justo antes de un pincho o pozo:
  el jugador se golpea la cabeza y no llega.
- La fila de abajo sin `G` es un pozo (caer = perder una vida de la partida).
- Para chicos de 6 a 8 años conviene: pozos de 3 celdas, plataformas de aterrizaje de 3
  celdas o más, un solo desafío por vez (dejá 4 o 5 celdas de descanso entre uno y otro)
  y un checkpoint cada 30 o 40 celdas.

### Probar un nivel sin jugarlo

```
node herramientas/probar-niveles.js
```

Revisa todos los niveles contra esas reglas (pozos, techos, escalones, estrellas fuera de
alcance, enemigos mal puestos: sin lugar para caminar, saltarines bajo un techo bajo o
voladores encerrados) y además los juega con un bot que usa la física real del
juego: si el bot no llega a la meta, el nivel es imposible o tiene un salto demasiado justo.
No es parte del juego (`index.html` no lo carga) y no necesita internet ni instalar nada.

## Los 5 tipos de enemigos

Están en `data/enemies.js`, uno por mundo y cada vez más difíciles:

| # | Enemigo | Letra | Cómo se mueve | Puntos |
|---|---------|-------|---------------|--------|
| 1 | Caminante | `A` | Va y viene; da media vuelta en las paredes y en los bordes. | 50 |
| 2 | Saltarín | `S` | Camina despacio y cada tanto pega un salto de más de una celda. | 60 |
| 3 | Volador | `V` | Flota en el aire subiendo y bajando; cruza los pozos volando. | 70 |
| 4 | Perseguidor | `R` | Patrulla tranquilo y, si te ve venir de frente, sale a encararte (sin tirarse a los pozos). Si lo pasás de largo, te deja ir. | 80 |
| 5 | Blindado | `B` | Lento y con púas: aplastarlo duele. Cada 2,4 s las esconde 1,4 s y **ahí** se lo puede pisar. | 120 |

A todos (menos al blindado con las púas afuera) se los vence saltándoles encima. El
blindado avisa: cuando esconde las púas se aclara y se le ponen los ojos verdes.

Para **inventar un enemigo nuevo**: copiá un bloque de `data/enemies.js`, cambiale `id`,
`simbolo` y los números. Si querés que se mueva distinto, agregá su `comportamiento` en
`js/game/entities.js` y su `forma` (el dibujo) en `js/game/render.js`. Para que un mundo lo
use por defecto, poné su `id` en el campo `enemigo` del mundo en `data/worlds.js`.

## Crear un personaje nuevo

Agregá un bloque en `data/characters.js`:

```js
RUNNER.registrarPersonaje({
  id: 'sofi', nombre: 'Sofi', descripcion: 'Veloz como el viento.',
  formaCabeza: 'redonda',          // 'redonda' | 'cuadrada'
  accesorio: 'vincha',             // 'ninguno' | 'gorra' | 'mono' | 'antena' | 'orejas' | 'vincha'
  colores: { piel: '#f1c27d', pelo: '#5a3a1a', remera: '#4cc9f0', pantalon: '#264653', zapatos: '#222', accesorio: '#ffd23f' }
});
```

Para usar un dibujo propio, agregá una hoja de sprites PNG en `assets/img/` y el campo
`sprite` (ver el comentario al inicio de `data/characters.js`).

## Cambiar la estética

Los temas viven en `data/themes.js`: cielo, colinas, suelo, bloques, pinchos, estrellas,
bandera y enemigos son colores editables (cada tipo de enemigo aclara u oscurece el color
`enemigo` del tema con su campo `tinte`). El tema **no se elige nivel por nivel**: lo elige
el mundo (`data/worlds.js`), así los niveles de un mismo mundo se ven parecidos. Desde
*Personalizar* se puede forzar un tema para todos los niveles.

Un tema puede usar imágenes propias (`imagenes: { fondo, suelo, bloque, pincho, estrella }`);
si el archivo no existe se usa el dibujo por defecto.

Los menús se estilizan en `css/style.css`.

## Carrera multijugador (hasta 6 dispositivos)

Hasta **6 corredores** corren **el mismo nivel al mismo tiempo**, cada uno en su
computadora, tablet o celular. Gana el primero que toca la bandera.

1. Uno entra en **Carrera multijugador → Crear una sala**. Le aparece un **código de
   4 números**.
2. Los demás entran en **Carrera multijugador → Entrar con un código** y escriben esos
   4 números (hacen falta al menos 2 corredores para largar).
3. Quien creó la sala elige el nivel. Cuando **todos** tocan **Estoy listo** arranca una
   cuenta regresiva de 3 y largan juntos.

Durante la carrera se ve a los otros **medio transparentes** cuando están cerca, cada uno
con su color, y arriba una barra muestra quién va adelante. **Las estrellas y los enemigos
son de todos**: la estrella se la lleva el primero que la toca y desaparece para el resto,
y el enemigo que alguien pisa queda fuera de la pista para todos (los puntos son solo para
el que lo pisó). Morir **no te elimina**: reaparecés en el último checkpoint y el único
castigo es el tiempo perdido. Cuando alguien llega a la meta los demás **siguen corriendo**
por el 2º y el 3er puesto, y la tabla de resultados se va completando sola. El reloj no se
para: el botón ⏸ solo ofrece seguir o abandonar. Quien creó la sala puede tocar
**Revancha** y lleva a todos de vuelta a la sala, aunque alguno siga corriendo.

**Esto es lo único del juego que necesita internet**, porque los dispositivos se conectan
entre ellos (WebRTC). No hay servidor propio ni cuentas: solo se usa un servidor público
que los presenta, y después los datos de la partida viajan directo entre ellos. Si la red
del lugar bloquea ese tipo de conexión, la sala no se abre y el juego lo avisa; todo el
resto del juego sigue funcionando sin conexión.

Detalles técnicos: la sala tiene forma de **estrella**: todos se conectan al que la creó,
y ese dispositivo hace de **árbitro**. Es el que reparte la lista de corredores, reenvía
las posiciones (15 veces por segundo), manda dónde va cada enemigo (10 veces por segundo,
solo los que tienen a alguien cerca), decide de quién es cada estrella y cada enemigo
—si dos llegan casi juntos gana el que avisó primero— y arma la tabla de puestos.
`js/net/red.js` abre las conexiones (el código de sala es el identificador en el servidor
de PeerJS) y `js/net/carrera.js` define los mensajes y las reglas. El límite de 6 es la
constante `MAX` arriba de `carrera.js`: se puede subir, pero con muchos más la barra de
avance se amontona y el árbitro empieza a sufrir en máquinas lentas. Para cambiar de
servidor de salas o usar uno propio, se toca solo `red.js`.

## Competencias

Desde el menú **Competencias**:

1. *Nueva competencia*: nombre, niveles y lista de jugadores.
2. Cada jugador toca **Jugar** en su fila y juega su turno. Se guarda el mejor puntaje
   de cada uno por nivel; gana quien suma más puntos.
3. **Exportar** descarga un archivo `.json` con la competencia. En otra computadora,
   **Importar** lo carga o lo combina con la misma competencia (se conserva el mejor
   resultado de cada jugador). Así se puede competir entre varias máquinas sin internet,
   pasando el archivo por pendrive.

Todo el progreso (perfil, ranking, competencias) se guarda en el navegador de esa
computadora (`localStorage`). Borrar los datos del sitio reinicia el juego.

## Versiones

Abajo a la derecha de los menús aparece un cartelito con la versión que estás
jugando (por ejemplo **v1.0.0**). Sirve para no confundirse mientras se prueba:
si el cartelito no cambia después de tocar el código, estás mirando la copia
vieja (típico del navegador con la versión de la web guardada en caché).

Tocándolo se abre en GitHub la **etiqueta** (*tag*) con el código exacto de esa
versión: https://github.com/emilianobonilla/runner-estrellas/releases/tag/v1.0.0
Si GitHub muestra "404" quiere decir que esa versión todavía no se publicó, o
sea que estás jugando una versión de prueba de tu computadora.

El número vive en un solo lugar, `js/core/version.js`. Para publicar una versión
nueva (actualiza el archivo, hace el commit, crea la etiqueta y ofrece subirla):

```bash
herramientas/version.sh 1.1.0 "Nombre de la versión"
```

Sin argumentos muestra la versión actual. Se usan tres números,
`mayor.menor.arreglo`: el último para arreglitos, el del medio cuando se agregan
niveles o funciones, el primero para cambios grandes. La misma información
(versión, nombre, fecha y enlaces a GitHub) está también en *Cómo jugar*.

## Desarrollo

No hay dependencias ni compilación. Para probar con un servidor local (opcional):

```bash
python3 -m http.server 8123
```

y abrir `http://localhost:8123`.
