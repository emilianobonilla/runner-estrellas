# Ejecutar Runner de Estrellas localmente

No hay dependencias, ni `npm install`, ni compilación. Solo necesitás un navegador moderno.

## 1. Obtener el código

```bash
git clone https://github.com/emilianobonilla/runner-estrellas.git
cd runner-estrellas
```

## 2. Abrir el juego

**Opción A: doble clic (sin internet, sin instalar nada).** Abrí `index.html` en Chrome,
Firefox, Edge o Safari. Funciona porque el juego usa scripts clásicos, sin módulos ES ni `fetch`.

**Opción B: servidor local (recomendado para desarrollar).** Hace falta Python 3, que ya
viene en macOS y Linux:

```bash
python3 herramientas/servir.py 8123
```

y abrí <http://localhost:8123>. Con un servidor se puede probar la instalación como app
(`manifest.webmanifest`) y abrir el juego desde un celular o tablet de la misma red Wi-Fi,
entrando a `http://<IP-de-tu-computadora>:8123`.

Este servidor evita la caché del navegador: si editás un archivo y no ves el cambio, no
usaste `servir.py` (con `python3 -m http.server` el navegador guarda los `.js` viejos).
En ese caso recargá con Ctrl+Shift+R (Cmd+Shift+R en Mac).

## 3. Probar los niveles (opcional)

Requiere [Node.js](https://nodejs.org), sin instalar paquetes:

```bash
node herramientas/probar-niveles.js
```

Revisa las reglas de diseño y juega cada nivel con un bot. Conviene correrlo después de
tocar cualquier nivel.

## Qué funciona sin internet

Todo, salvo el modo *Carrera multijugador*, que conecta dispositivos entre sí y necesita
conexión.

## Dónde se guarda el progreso

En el navegador (`localStorage`). Cambiar de navegador o de origen (`file://` vs
`localhost`, o un puerto distinto) empieza con datos vacíos. Para llevar competencias de
una máquina a otra, usá *Exportar* / *Importar* en el menú *Competencias*.

Más detalles del proyecto en el [README](README.md).
