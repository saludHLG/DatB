/**
 * epidemiologia.js
 * Módulo principal de Datos Epidemiológicos.
 *
 * Pills disponibles:
 *   resumen          → Gráficos y estadísticas (en desarrollo)
 *   datos_generales  → Tabla filtrable de indicaciones y resultados
 *   casos_positivos  → Listado de casos positivos (en desarrollo)
 *
 * USO:
 *   _initEpidemiologia('id_del_contenedor');
 *   // o bien pasando el elemento directamente:
 *   _initEpidemiologia(document.getElementById('mi_contenedor'));
 *
 * Dependencias: moderadores_core.js, epi_datos_generales.js, epidemiologia.css
 */

'use strict';

// ─── Configuración de pills ───────────────────────────────────────────────────

const EPI_PILLS = [
  { id: 'resumen',         label: 'Resumen',         icono: '📊' },
  { id: 'datos_generales', label: 'Datos generales',  icono: '📋' },
  { id: 'casos_positivos', label: 'Casos positivos',  icono: '🔬' },
];

// ─── Estado interno del módulo ────────────────────────────────────────────────

const _epiState = {
  pillActual: 'datos_generales',
};

// ─── Render principal ─────────────────────────────────────────────────────────

function _renderEpidemiologia(contenedor) {
  const nivel = typeof _getModeradorNivel === 'function' ? _getModeradorNivel() : null;
  const badgeNivel = nivel
    ? `<span class="epi-nivel-badge epi-nivel-${nivel}">${_epiLabelNivel(nivel)}</span>`
    : '';

  contenedor.innerHTML = `
    <div class="epi-modulo">

      <div class="epi-header">
        <div class="epi-header-top">
          <h2 class="epi-title">Datos Epidemiológicos</h2>
          ${badgeNivel}
        </div>
        <nav class="epi-pills" role="tablist" aria-label="Secciones del módulo epidemiológico">
          ${EPI_PILLS.map(p => `
            <button
              class="epi-pill${p.id === _epiState.pillActual ? ' active' : ''}"
              data-pill="${p.id}"
              role="tab"
              aria-selected="${p.id === _epiState.pillActual}"
              aria-controls="epi_contenido"
            >
              <span class="epi-pill-icono" aria-hidden="true">${p.icono}</span>
              ${p.label}
            </button>
          `).join('')}
        </nav>
      </div>

      <div class="epi-content" id="epi_contenido" role="tabpanel"></div>

    </div>
  `;

  contenedor.querySelectorAll('.epi-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      const pill = btn.dataset.pill;
      if (pill === _epiState.pillActual) return;
      _epiState.pillActual = pill;

      contenedor.querySelectorAll('.epi-pill').forEach(b => {
        const activo = b.dataset.pill === pill;
        b.classList.toggle('active', activo);
        b.setAttribute('aria-selected', activo);
      });

      _renderPillContent(document.getElementById('epi_contenido'), pill);
    });
  });

  _renderPillContent(document.getElementById('epi_contenido'), _epiState.pillActual);
}

// ─── Despacho de pills ────────────────────────────────────────────────────────

function _renderPillContent(contenedor, pill) {
  if (!contenedor) return;
  contenedor.innerHTML = '';

  switch (pill) {
    case 'resumen':
      contenedor.innerHTML = `
        <div class="epi-placeholder">
          <div class="epi-placeholder-icono">📊</div>
          <p>El módulo <strong>Resumen</strong> con visualizaciones estadísticas
             estará disponible próximamente.</p>
        </div>`;
      break;

    case 'datos_generales':
      if (typeof _initEpiDatosGenerales === 'function') {
        _initEpiDatosGenerales(contenedor);
      } else {
        contenedor.innerHTML = `<p class="epi-error">epi_datos_generales.js no está cargado.</p>`;
        console.error('[Epi] _initEpiDatosGenerales no está disponible. Verificar que epi_datos_generales.js esté incluido antes de epidemiologia.js.');
      }
      break;

    case 'casos_positivos':
      contenedor.innerHTML = `
        <div class="epi-placeholder">
          <div class="epi-placeholder-icono">🔬</div>
          <p>El módulo <strong>Casos positivos</strong> estará disponible
             próximamente.</p>
        </div>`;
      break;

    default:
      contenedor.innerHTML = `<p class="epi-error">Sección no reconocida: ${pill}</p>`;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _epiLabelNivel(nivel) {
  const labels = {
    institucional: 'Moderador institucional',
    municipal:     'Moderador municipal',
    provincial:    'Moderador provincial',
    nacional:      'Moderador nacional',
  };
  return labels[nivel] ?? nivel;
}

// ─── Inicialización pública ───────────────────────────────────────────────────

/**
 * Punto de entrada del módulo epidemiológico.
 * @param {string|HTMLElement} contenedorId - ID del elemento o el elemento mismo.
 */
function _initEpidemiologia(contenedorId) {
  const contenedor = typeof contenedorId === 'string'
    ? document.getElementById(contenedorId)
    : contenedorId;

  if (!contenedor) {
    console.error('[Epi] Contenedor no encontrado:', contenedorId);
    return;
  }

  _renderEpidemiologia(contenedor);
}

window._initEpidemiologia = _initEpidemiologia;
