/* DatB compatibility loader. Source moved under assets/js/. */
(function () {
  const map = {
    'config.js': 'assets/js/core/config.js',
    'supabase_client.js': 'assets/js/core/supabase_client.js',
    'utils.js': 'assets/js/core/utils.js',
    'data.js': 'assets/js/core/data.js',
    'auth.js': 'assets/js/core/auth.js',
    'app.js': 'assets/js/core/app.js',
    'indicacion.js': 'assets/js/modules/clinical/indicacion.js',
    'laboratorio_core.js': 'assets/js/modules/laboratorio/laboratorio_core.js',
    'lab_resultados.js': 'assets/js/modules/laboratorio/lab_resultados.js',
    'lab_pendientes.js': 'assets/js/modules/laboratorio/lab_pendientes.js',
    'lab_recibidas.js': 'assets/js/modules/laboratorio/lab_recibidas.js',
    'laboratorio.js': 'assets/js/modules/laboratorio/laboratorio.js',
    'home_lab.js': 'assets/js/modules/laboratorio/home_lab.js',
    'lab_resumen.js': 'assets/js/modules/laboratorio/lab_resumen.js',
    'home_usuario.js': 'assets/js/modules/usuarios/home_usuario.js',
    'moderadores_core.js': 'assets/js/modules/admin/moderadores_core.js',
    'epi_datos_generales.js': 'assets/js/modules/epidemiologia/epi_datos_generales.js',
    'epi_casos_positivos.js': 'assets/js/modules/epidemiologia/epi_casos_positivos.js',
    'epidemiologia.js': 'assets/js/modules/epidemiologia/epidemiologia.js'
  };
  const file = (document.currentScript?.src || '').split('/').pop().split('?')[0];
  if (map[file]) document.write('<script src="' + map[file] + '"><\\/script>');
})();