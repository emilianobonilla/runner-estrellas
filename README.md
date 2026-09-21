# Runner de Estrellas

Juego de plataformas estilo *Mario Bros* / *Ika* (Plan Ceibal): el personaje corre,
salta y junta estrellas hasta llegar a la bandera, esquivando pinchos, pozos y
enemigos. Funciona **sin internet** y sin instalar nada (salvo el modo *Carrera*,
que conecta dos dispositivos entre sí).

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

**Puntos:** estrella 100 · pisar enemigo 50 · meta 500 · bonus por tiempo y por
juntar todas las estrellas. Tenés 3 vidas; los checkpoints guardan el avance.

## Estructura del proyecto

```
index.html            Página principal (lista de scripts: agregá aquí los archivos nuevos)
css/style.css         Estilos de menús y HUD
data/themes.js        Estéticas (colores del escenario, imágenes opcionales)
data/characters.js    Personajes (colores, accesorio, sprite opcional)
data/levels/*.js      Niveles (mapas de caracteres)
assets/img/           Íconos de la app e imágenes propias opcionales (fondos, sprites, tiles)
manifest.webmanifest  Datos para instalar como app (nombre, ícono, pantalla completa)
js/core/              Utilidades, teclado/táctil, sonido, guardado local, pantalla completa
js/game/              Nivel, entidades, jugador (física), render, partida
js/net/               Carrera entre dos dispositivos: red.js (conexión) y carrera.js (reglas)
js/vendor/            PeerJS, la única librería externa (guardada acá, no se baja de internet)
js/ui/screens.js      Pantallas: menú, niveles, personalizar, ranking, competencias, carrera
js/main.js            Arranque y bucle del juego
```

## Crear un nivel nuevo

El juego trae 10 niveles (`nivel-01` a `nivel-10`), de dificultad 1 a 5. Para agregar otro:

1. Copiá `data/levels/nivel-04-bosque.js` a `data/levels/nivel-11-loquesea.js`.
2. Cambiá `id`, `orden`, `nombre`, `descripcion`, `tema`, `dificultad` (1 a 5, se
   muestra en estrellitas en la lista de niveles) y `tiempoObjetivo`.
3. Dibujá el `mapa` (11 filas recomendadas; cada carácter es una celda de 48 px):

```
.  vacío        G  suelo         #  bloque        *  estrella
^  pincho       E  enemigo       C  checkpoint    P  inicio      F  meta
```

4. Agregá la línea `<script src="data/levels/nivel-11-loquesea.js"></script>` en
   `index.html`, debajo de los otros niveles. Listo: aparece en la lista de niveles,
   en el ranking y en las competencias.

Consejos de diseño (medidos con la física actual):

- Un toque corto salta ~2,4 celdas; manteniendo la tecla sube ~4,7 celdas. Poné los cubos
  a **3 celdas** por encima del piso (fila del cubo = fila del piso − 4, por ejemplo fila 7
  si el piso está en la fila 10 y el jugador camina en la 9). A 4 celdas se llega, pero es difícil.
- Las estrellas se alcanzan hasta **5 celdas** por encima del piso.
- Corriendo se cruza un pozo de hasta **5 celdas** (4 es cómodo).
- Cuidado con techos o bloques bajos encima de una plataforma: el jugador se golpea la cabeza.
- No pongas una plataforma baja (a 2 o 3 celdas) justo antes de un pincho o pozo:
  el jugador se golpea la cabeza y no llega.
- La fila de abajo sin `G` es un pozo (caer = perder una vida).
- Para chicos de 6 a 8 años conviene: pozos de 3 celdas, plataformas de aterrizaje de 3
  celdas o más, un solo desafío por vez (dejá 4 o 5 celdas de descanso entre uno y otro)
  y un checkpoint cada 30 o 40 celdas.

### Probar un nivel sin jugarlo

```
node herramientas/probar-niveles.js
```

Revisa todos los niveles contra esas reglas (pozos, techos, escalones, estrellas fuera de
alcance, enemigos mal puestos) y además los juega con un bot que usa la física real del
juego: si el bot no llega a la meta, el nivel es imposible o tiene un salto demasiado justo.
No es parte del juego (`index.html` no lo carga) y no necesita internet ni instalar nada.

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
bandera y enemigos son colores editables. Cada nivel elige su tema con el campo `tema`,
y desde *Personalizar* se puede forzar un tema para todos los niveles.

Un tema puede usar imágenes propias (`imagenes: { fondo, suelo, bloque, pincho, estrella }`);
si el archivo no existe se usa el dibujo por defecto.

Los menús se estilizan en `css/style.css`.

## Carrera 1 vs 1 (dos dispositivos)

Dos jugadores corren **el mismo nivel al mismo tiempo**, cada uno en su computadora,
tablet o celular. Gana el primero que toca la bandera.

1. Uno entra en **Carrera 1 vs 1 → Crear una sala**. Le aparece un **código de 4 números**.
2. El otro entra en **Carrera 1 vs 1 → Entrar con un código** y escribe esos 4 números.
3. Quien creó la sala elige el nivel. Cuando los dos tocan **Estoy listo** arranca una
   cuenta regresiva de 3 y largan juntos.

Durante la carrera se ve al rival **medio transparente** cuando está cerca, y arriba una
barra muestra quién va adelante. Morir **no te elimina**: reaparecés en el último
checkpoint y el único castigo es el tiempo perdido, así la carrera siempre termina con
alguien cruzando la meta. El reloj no se para: el botón ⏸ solo ofrece seguir o abandonar.
Al terminar se comparan tiempo, estrellas y puntos, y se puede pedir **Revancha** sin
volver a pasar el código.

**Esto es lo único del juego que necesita internet**, porque los dos dispositivos se
conectan entre ellos (WebRTC). No hay servidor propio ni cuentas: solo se usa un servidor
público que los presenta, y después los datos de la partida viajan directo de uno al otro.
Si la red del lugar bloquea ese tipo de conexión, la sala no se abre y el juego lo avisa;
todo el resto del juego sigue funcionando sin conexión.

Detalles técnicos: `js/net/red.js` abre la conexión (el código de sala es el identificador
en el servidor de PeerJS) y `js/net/carrera.js` define los mensajes (`hola`, `nivel`,
`listo`, `arrancar`, `pos`, `meta`, `revancha`). La posición viaja 15 veces por segundo y
se suaviza al dibujarla. Para cambiar de servidor de salas o usar uno propio, se toca solo
`red.js`.

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

## Desarrollo

No hay dependencias ni compilación. Para probar con un servidor local (opcional):

```bash
python3 -m http.server 8123
```

y abrir `http://localhost:8123`.
