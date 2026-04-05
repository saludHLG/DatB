/**
 * moderadores_core.js
 * Lógica centralizada para el rol de Moderador.
 * Niveles soportados: institucional | municipal | provincial | nacional
 *
 * INTEGRACIÓN REQUERIDA:
 * ─ Llamar _initModeradores() después de cargar el perfil del usuario
 *   moderador en window._store.moderador_actual.
 * ─ Todos los elementos del menú/dashboard del módulo de laboratorio
 *   deben llevar el atributo: data-modulo="laboratorio"
 * ─ En el formulario de nueva indicación, tras el selector de municipio
 *   del paciente, invocar:
 *     _renderSelectorAreaSalud(contenedor, municipio_id, callbackOnChange)
 *
 * ESTRUCTURA ESPERADA en window._store.moderador_actual:
 * {
 *   id:             string,
 *   nivel:          'institucional'|'municipal'|'provincial'|'nacional',
 *   institucion_id: string|null,
 *   municipio_id:   string|null,
 *   provincia_id:   string|null,
 *   lab_asignado_id: string|null   ← asignado desde administración
 * }
 */

'use strict';

// ─── Acceso al perfil del moderador actual ───────────────────────────────────

function _getModerador() {
  return window._store?.moderador_actual ?? null;
}

function _getModeradorNivel() {
  return _getModerador()?.nivel ?? null;
}

/**
 * Devuelve el ámbito geográfico/institucional del moderador.
 * Usado internamente para filtrar datos en todos los módulos.
 */
function _getModeradorScope() {
  const mod = _getModerador();
  if (!mod) return null;
  return {
    nivel:          mod.nivel,
    institucion_id: mod.institucion_id  ?? null,
    municipio_id:   mod.municipio_id    ?? null,
    provincia_id:   mod.provincia_id    ?? null,
  };
}

// ─── Control de acceso al módulo de laboratorio ──────────────────────────────

/**
 * Un moderador accede al módulo de laboratorio ÚNICAMENTE si la
 * administración le asignó un laboratorio de forma explícita.
 * Esta asignación es independiente del nivel del moderador y del rol
 * profesional en el sistema.
 */
function _moderadorTieneLabAsignado() {
  return !!(_getModerador()?.lab_asignado_id);
}

/**
 * Aplica visibilidad del módulo de laboratorio en el DOM.
 * Oculta cualquier elemento con [data-modulo="laboratorio"] si el
 * moderador no tiene laboratorio asignado desde administración.
 * Llamar tras cargar el perfil del moderador.
 */
function _aplicarAccesoLaboratorio() {
  const visible = _moderadorTieneLabAsignado();
  document.querySelectorAll('[data-modulo="laboratorio"]').forEach(el => {
    el.style.display = visible ? '' : 'none';
  });
}

// ─── Filtrado granular de datos según nivel ──────────────────────────────────

/**
 * Función interna de filtrado por scope.
 * @param {Array}  arr             - Array a filtrar
 * @param {string} campoInstit     - Nombre del campo de institución en cada elemento
 */
function _filtrarPorScope(arr = [], campoInstit = 'institucion_id') {
  const scope = _getModeradorScope();
  if (!scope) return [];
  switch (scope.nivel) {
    case 'nacional':
      return arr;
    case 'provincial':
      return arr.filter(x => x.provincia_id === scope.provincia_id);
    case 'municipal':
      return arr.filter(x => x.municipio_id === scope.municipio_id);
    case 'institucional':
      return arr.filter(x => x[campoInstit] === scope.institucion_id);
    default:
      return [];
  }
}

/**
 * Filtra indicaciones según el nivel del moderador.
 * @param {Array} indicaciones - window._store.indicaciones
 * @returns {Array}
 */
function _filtrarIndicacionesPorNivel(indicaciones = []) {
  return _filtrarPorScope(indicaciones, 'institucion_id');
}

/**
 * Filtra resultados de laboratorio según el nivel del moderador.
 * @param {Array} resultados
 * @returns {Array}
 */
function _filtrarResultadosPorNivel(resultados = []) {
  return _filtrarPorScope(resultados, 'institucion_id');
}

// ─── Catálogo: Áreas de salud por municipio ──────────────────────────────────

/**
 * Obtiene las áreas de salud registradas para un municipio dado.
 * Usa geo_labs con tipo === 'área de salud'.
 * @param {string|number} municipio_id
 * @returns {Array}
 */
function _getAreasDeSSaludPorMunicipio(municipio_id) {
  if (!municipio_id) return [];
  return (window._store?.geo_labs ?? []).filter(
    g => g.tipo === 'área de salud' && g.municipio_id === municipio_id
  );
}

/**
 * Renderiza un selector inteligente (smart search) de Área de Salud
 * dentro del contenedor recibido, filtrado por municipio del paciente.
 *
 * Campo OPCIONAL: el paciente puede no conocer su área de salud.
 * El valor seleccionado se escribe en el input hidden #mod_area_salud.
 *
 * INTEGRACIÓN en el formulario de nueva indicación:
 *   const wrap = document.getElementById('contenedor_area_salud');
 *   _renderSelectorAreaSalud(wrap, municipio_id_seleccionado, (area) => {
 *     miFormState.area_salud_id = area?.id ?? null;
 *   });
 *
 * @param {HTMLElement} contenedor  - Elemento donde insertar el campo
 * @param {string}      municipio_id
 * @param {Function}    [onChange]  - Callback({ id, nombre }) al seleccionar
 */
function _renderSelectorAreaSalud(contenedor, municipio_id, onChange) {
  if (!contenedor) return;
  const areas = _getAreasDeSSaludPorMunicipio(municipio_id);

  contenedor.innerHTML = `
    <div class="form-group mod-area-salud-wrapper">
      <label for="mod_area_salud_input" class="form-label">
        Área de salud
        <span class="mod-opcional-badge">opcional</span>
      </label>
      <div class="mod-smart-wrap">
        <input
          id="mod_area_salud_input"
          type="text"
          class="form-control mod-smart-input"
          placeholder="Buscar área de salud…"
          autocomplete="off"
          ${!areas.length ? 'disabled placeholder="Sin áreas registradas para este municipio"' : ''}
        />
        <input type="hidden" id="mod_area_salud" name="area_salud_id" value="" />
        <ul class="mod-smart-dropdown" id="mod_area_salud_dd" hidden></ul>
      </div>
      ${!areas.length
        ? '<p class="mod-hint">No se encontraron áreas de salud para el municipio seleccionado.</p>'
        : '<p class="mod-hint">Selecciona el área de salud donde se realiza el seguimiento del paciente.</p>'
      }
    </div>
  `;

  if (!areas.length) return;

  const input    = contenedor.querySelector('#mod_area_salud_input');
  const hidden   = contenedor.querySelector('#mod_area_salud');
  const dropdown = contenedor.querySelector('#mod_area_salud_dd');

  function renderDropdown(lista) {
    dropdown.innerHTML = lista.length
      ? lista.map(a => `<li data-id="${a.id}" data-nombre="${a.nombre}">${a.nombre}</li>`).join('')
      : `<li class="mod-dd-empty">Sin resultados</li>`;
    dropdown.hidden = false;
  }

  input.addEventListener('focus', () => renderDropdown(areas));
  input.addEventListener('input', () => {
    hidden.value = '';
    if (onChange) onChange(null);
    const q = input.value.toLowerCase().trim();
    renderDropdown(areas.filter(a => a.nombre.toLowerCase().includes(q)));
  });

  dropdown.addEventListener('click', e => {
    const li = e.target.closest('li[data-id]');
    if (!li) return;
    input.value  = li.dataset.nombre;
    hidden.value = li.dataset.id;
    dropdown.hidden = true;
    if (onChange) onChange({ id: li.dataset.id, nombre: li.dataset.nombre });
  });

  // Cerrar al hacer clic fuera
  document.addEventListener('click', e => {
    if (!contenedor.contains(e.target)) dropdown.hidden = true;
  }, { capture: true });
}

// ─── Inicialización pública ───────────────────────────────────────────────────

function _initModeradores() {
  _aplicarAccesoLaboratorio();
}

// Exponer al ámbito global
Object.assign(window, {
  _getModerador,
  _getModeradorNivel,
  _getModeradorScope,
  _moderadorTieneLabAsignado,
  _aplicarAccesoLaboratorio,
  _filtrarIndicacionesPorNivel,
  _filtrarResultadosPorNivel,
  _getAreasDeSSaludPorMunicipio,
  _renderSelectorAreaSalud,
  _initModeradores,
});
