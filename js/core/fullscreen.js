/* Pantalla completa.
   - Chrome, Edge, Firefox, Silk (Amazon Fire) y Safari de Mac usan la API
     Fullscreen del navegador: se activa sola al empezar un nivel (se puede
     desactivar en Personalizar) o con el botón ⛶.
   - En iPhone/iPad Safari no existe esa API para páginas: la forma de jugar
     sin barras es Compartir → "Agregar a pantalla de inicio". Cuando se abre
     desde ahí, la app ya corre a pantalla completa (ver <meta> en index.html). */
(function (R) {
  var doc = document, raiz = doc.documentElement;

  var FS = {
    soportado: function () {
      return !!(raiz.requestFullscreen || raiz.webkitRequestFullscreen ||
                raiz.mozRequestFullScreen || raiz.msRequestFullscreen);
    },

    activo: function () {
      return !!(doc.fullscreenElement || doc.webkitFullscreenElement ||
                doc.mozFullScreenElement || doc.msFullscreenElement);
    },

    /* true si ya corre como app instalada (iOS "Agregar a inicio" o PWA):
       en ese caso no hay barras que ocultar. */
    instalada: function () {
      if (navigator.standalone === true) return true;
      return !!(window.matchMedia &&
        window.matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches);
    },

    esIOS: function () {
      return /iPhone|iPad|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    },

    /* Hay que llamarla desde un clic o toque del usuario (el navegador lo exige). */
    entrar: function () {
      var f = raiz.requestFullscreen || raiz.webkitRequestFullscreen ||
              raiz.mozRequestFullScreen || raiz.msRequestFullscreen;
      if (!f) return Promise.reject(new Error('El navegador no permite pantalla completa'));
      var p;
      try { p = f.call(raiz, { navigationUI: 'hide' }); } catch (e) { return Promise.reject(e); }
      return Promise.resolve(p).then(function () {
        // En celulares y tablets intentamos fijar horizontal; si no se puede, no pasa nada.
        try {
          if (screen.orientation && screen.orientation.lock) {
            var l = screen.orientation.lock('landscape');
            if (l && l.catch) l.catch(function () {});
          }
        } catch (e) { /* sin soporte */ }
      });
    },

    salir: function () {
      var f = doc.exitFullscreen || doc.webkitExitFullscreen ||
              doc.mozCancelFullScreen || doc.msExitFullscreen;
      if (!f || !FS.activo()) return Promise.resolve();
      try { return Promise.resolve(f.call(doc)); } catch (e) { return Promise.reject(e); }
    },

    alternar: function () { return FS.activo() ? FS.salir() : FS.entrar(); },

    onCambio: function (cb) {
      ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange']
        .forEach(function (ev) { doc.addEventListener(ev, cb); });
    }
  };

  R.Fullscreen = FS;
})(window.RUNNER);
