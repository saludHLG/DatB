/* Entrypoint de resultados de laboratorio.

   HISTORIA (importante para no repetir el fallo)
   1. Originalmente era un entrypoint delgado con document.write, que
      falla en scripts asincronos.
   2. Despues, una carga por promesa que terminaba antes de tener la
      implementacion: el modulo se dibujaba con _abrirModalResultados
      indefinida y el boton "Registrar" no hacia nada.
   3. Ahora la promesa SI se resuelve, pero se construia la ruta con una
      cadena relativa que el navegador resuelve contra el documento
      actual (por ejemplo /DatB/index.html), no contra la carpeta de la
      aplicacion. En algunos casos eso da una URL inexistente, el script
      no carga, onerror no llega a dispararse y la promesa queda
      pendiente para siempre: el boton nunca hace nada.

   SOLUCION
   - La URL se construye igual que en loadLegacyScripts: contra la base de
     la aplicacion (import.meta.env.BASE_URL), no contra el documento.
   - Hay un tiempo maximo de espera, de modo que la promesa SIEMPRE
     termina; si falla, se informa en consola y el boton muestra un aviso
     en lugar de quedarse mudo. */
(function () {
    var RELATIVA = 'assets/js/modules/laboratorio/legacy/lab_resultados_legacy.js';

    if (window.__datbLabResultados) return;

    /* Base de la aplicacion, con barra final. Igual criterio que
       loadLegacyScripts para no depender de la ruta del documento. */
    function urlDelScript() {
        try {
            var base = (window.__DATB_BASE_URL || '/DatB/');
            if (base.slice(-1) !== '/') base += '/';
            return new URL(RELATIVA, new URL(base, window.location.origin)).href;
        } catch (e) {
            return RELATIVA;
        }
    }

    window.__datbLabResultados = new Promise(function (resolve) {
        if (typeof window._abrirModalResultados === 'function') {
            resolve(true);
            return;
        }

        var terminado = false;
        function terminar(ok, motivo) {
            if (terminado) return;
            terminado = true;
            if (!ok) {
                console.error('Resultados de laboratorio no disponibles: ' + motivo);
            }
            resolve(ok);
        }

        /* Red de seguridad: nunca dejar la promesa pendiente. */
        setTimeout(function () {
            terminar(typeof window._abrirModalResultados === 'function',
                     'tiempo de espera agotado');
        }, 8000);

        var s = document.createElement('script');
        s.src = urlDelScript();
        s.async = false;
        s.onload = function () { terminar(true); };
        s.onerror = function () { terminar(false, 'no se pudo cargar ' + s.src); };
        document.head.appendChild(s);
    });
})();
