/* Entrypoint de resultados de laboratorio.

   Historia del problema: era un entrypoint delgado que cargaba
   legacy/lab_resultados_legacy.js. Primero con document.write, que falla
   en scripts asincronos, y despues con una promesa que terminaba antes de
   tener la implementacion. Como loadLegacyScripts solo esperaba al
   <script> de ESTE archivo, el modulo se dibujaba con
   _abrirModalResultados todavia indefinida: el boton "Registrar" no hacia
   nada, sin error visible.

   Ahora la espera es explicita. lab_recibidas.js y laboratorio_core.js
   esperan window.__datbLabResultados antes de usar los formularios. */
(function () {
    var ruta = 'assets/js/modules/laboratorio/legacy/lab_resultados_legacy.js';

    if (window.__datbLabResultados) return;

    window.__datbLabResultados = new Promise(function (resolve) {
        if (typeof window._abrirModalResultados === 'function') {
            resolve(true);
            return;
        }
        var s = document.createElement('script');
        s.src = ruta + '?v=20261116-2';
        s.async = false;
        s.onload = function () { resolve(true); };
        s.onerror = function () {
            console.error('No se pudo cargar ' + ruta);
            resolve(false);
        };
        document.head.appendChild(s);
    });
})();
