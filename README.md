# Runner de Estrellas

Juego de plataformas estilo *Mario Bros* / *Ika* (Plan Ceibal): el personaje corre,
salta y junta estrellas hasta llegar a la bandera, esquivando pinchos, pozos y
enemigos. Funciona **sin internet** y sin instalar nada.

## Cómo jugar

1. Abrí `index.html` con doble clic (Chrome, Firefox, Edge o Safari).
2. Escribí tu nombre, elegí un nivel y ¡a correr!

| Acción     | Teclas                         |
|------------|--------------------------------|
| Moverse    | `←` `→` o `A` `D`              |
| Saltar     | `↑`, `W` o `Espacio` (mantené para saltar más alto) |
| Pausa      | `Esc` o `P`                    |

En tablets aparecen botones táctiles en pantalla (se puede forzar en *Personalizar*).

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
assets/img/           Imágenes propias opcionales (fondos, sprites, tiles)
js/core/              Utilidades, teclado/táctil, sonido, guardado local
js/game/              Nivel, entidades, jugador (física), render, partida
js/ui/screens.js      Pantallas: menú, niveles, personalizar, ranking, competencias
js/main.js            Arranque y bucle del juego
```

## Crear un nivel nuevo

1. Copiá `data/levels/nivel-03-nubes.js` a `data/levels/nivel-04-loquesea.js`.
2. Cambiá `id`, `orden`, `nombre`, `descripcion`, `tema` y `tiempoObjetivo`.
3. Dibujá el `mapa` (11 filas recomendadas; cada carácter es una celda de 48 px):

```
.  vacío        G  suelo         #  bloque        *  estrella
^  pincho       E  enemigo       C  checkpoint    P  inicio      F  meta
```

4. Agregá la línea `<script src="data/levels/nivel-04-loquesea.js"></script>` en
   `index.html`, debajo de los otros niveles. Listo: aparece en la lista de niveles,
   en el ranking y en las competencias.

Consejos de diseño (medidos con la física actual):

- El salto sube hasta **3 celdas** de plataforma y alcanza estrellas hasta **4 celdas**
  por encima del piso.
- Corriendo se cruza un pozo de hasta **4 celdas**.
- No pongas una plataforma baja (a 2 o 3 celdas) justo antes de un pincho o pozo:
  el jugador se golpea la cabeza y no llega.
- La fila de abajo sin `G` es un pozo (caer = perder una vida).

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
