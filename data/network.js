/* Configuración de la conexión multijugador.

   STUN alcanza cuando los dispositivos pueden abrir una conexión directa.
   Para las redes móviles o Wi-Fi que la bloquean, configurá
   `turnCredentialsUrl` con un endpoint HTTPS que devuelva credenciales TURN
   temporales. Formatos aceptados:

     { "iceServers": [{ "urls": "turn:turn.ejemplo.com:3478",
                         "username": "temporal", "credential": "temporal" }],
       "ttl": 3600 }

   o directamente un objeto { urls, username, credential }.

   No escribas una contraseña TURN permanente acá: este archivo es público. */
(function (R) {
  R.RED_CONFIG = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' }
    ],
    turnCredentialsUrl: ''
  };
})(window.RUNNER);
