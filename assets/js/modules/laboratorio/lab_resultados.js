/* Carga secuencial de dependencias sin document.write.
   document.write no es valido cuando este archivo se carga de forma
   asincrona. Se insertan los <script> en orden y se espera a cada uno. */
(function () {
    var pendientes = [
            "assets/js/modules/laboratorio/legacy/lab_resultados_legacy.js"
    ];

    function cargar(src) {
        return new Promise(function (resolve) {
            var s = document.createElement('script');
            s.src = src;
            s.async = false;
            s.onload = resolve;
            s.onerror = function () {
                console.error('No se pudo cargar ' + src);
                resolve();
            };
            document.head.appendChild(s);
        });
    }

    window.__datbCargaSerie = (window.__datbCargaSerie || Promise.resolve())
        .then(function () {
            return pendientes.reduce(function (p, ruta) {
                return p.then(function () { return cargar(ruta); });
            }, Promise.resolve());
        });
})();
