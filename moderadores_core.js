/* =========================================================
   moderadores_core.js — Núcleo de funciones para moderadores
   Provee: _getModeradorNivel, _getModeradorScope,
           _filtrarIndicacionesPorNivel, _renderSelectorAreaSalud
   Requiere: utils.js, laboratorio_core.js (cargados antes)
   ========================================================= */

/* ── Usuario activo en sesión ────────────────────────────── */
function _getModeradorUser() {
    const uid = sessionStorage.getItem('sr_active_user') || window._store?.active_user;
    return (window._store?.usuarios || []).find(u => u.id === uid) || null;
}

/* ── Nivel del moderador ─────────────────────────────────── */
function _getModeradorNivel() {
    const u = _getModeradorUser();
    if (!u) return null;
    const map = {
        2: 'institucional',
        3: 'municipal',
        4: 'provincial',
        5: 'nacional',
        6: 'nacional',
    };
    return map[u.rol_sistema_id] || null;
}

/* ── Scope completo del moderador ────────────────────────── */
function _getModeradorScope() {
    const u = _getModeradorUser();
    if (!u) return null;
    const nivel = _getModeradorNivel();
    if (!nivel) return null;
    return {
        nivel,
        provincia_id:   u.provincia_id    ? Number(u.provincia_id)    : null,
        municipio_id:   u.municipio_id    ? Number(u.municipio_id)    : null,
        institucion_id: u.centro_salud_id ? Number(u.centro_salud_id) : null,
    };
}

/* ── Filtrado de indicaciones por nivel ──────────────────── */
function _filtrarIndicacionesPorNivel(indicaciones) {
    const scope = _getModeradorScope();
    if (!scope) return indicaciones;

    const { nivel, provincia_id, municipio_id, institucion_id } = scope;
    if (nivel === 'nacional') return indicaciones;

    const pacs  = window._store?.pacientes        || [];
    const users = window._store?.usuarios         || [];
    const muns  = window._store?.geo_municipios   || [];
    const labs  = window._store?.geo_labs         || [];

    return indicaciones.filter(ind => {
        const indicador = users.find(u => u.id === ind.indicado_por);
        const pac       = pacs.find(p => p.id === ind.paciente_id);
        const lab       = labs.find(l => l.id === Number(ind.laboratorio_id));

        if (nivel === 'provincial') {
            const indProv = indicador?.provincia_id ? Number(indicador.provincia_id) : null;
            const pacMun  = pac?.municipio_id ? muns.find(m => m.id === Number(pac.municipio_id)) : null;
            const pacProv = pacMun?.provincia_id ? Number(pacMun.provincia_id) : null;
            const labProv = lab?.provincia_id ? Number(lab.provincia_id) : null;
            return indProv === provincia_id || pacProv === provincia_id || labProv === provincia_id;
        }

        if (nivel === 'municipal') {
            const indMun = indicador?.municipio_id ? Number(indicador.municipio_id) : null;
            const pacMun = pac?.municipio_id ? Number(pac.municipio_id) : null;
            const labMun = lab?.municipio_id ? Number(lab.municipio_id) : null;
            return indMun === municipio_id || pacMun === municipio_id || labMun === municipio_id;
        }

        if (nivel === 'institucional') {
            return !!(indicador?.centro_salud_id &&
                      Number(indicador.centro_salud_id) === institucion_id);
        }

        return false;
    });
}

/* ── Selector de Área de salud (formulario de indicación) ── */
/**
 * Renderiza un campo de búsqueda inteligente para área de salud,
 * usado por moderadores en el formulario de indicación.
 * @param {HTMLElement} container - Elemento donde se inserta el selector.
 * @param {Function} onChange - Callback({id, nombre}|null) al seleccionar.
 */
function _renderSelectorAreaSalud(container, onChange) {
    if (!container) return;
    const scope = _getModeradorScope();

    container.innerHTML = `
    <div class="mod-area-salud-wrapper">
        <label class="form-label" style="font-size:.82rem;font-weight:600;color:var(--navy-mid)">
            Área de salud
            <span class="mod-opcional-badge">opcional</span>
        </label>
        <div class="mod-smart-wrap">
            <input type="text"
                   id="mod-area-salud-input"
                   class="form-control mod-smart-input"
                   placeholder="— Buscar área de salud —"
                   autocomplete="off">
            <ul id="mod-area-salud-dd" class="mod-smart-dropdown" hidden></ul>
        </div>
        <p class="mod-hint">
            <i class="bi bi-info-circle me-1"></i>
            Área de salud donde se realiza el seguimiento del paciente.
        </p>
    </div>`;

    const input    = container.querySelector('#mod-area-salud-input');
    const dropdown = container.querySelector('#mod-area-salud-dd');
    const centros  = getGeoCentros().filter(c => c.tipo === 'área de salud');

    function _getAreas(q) {
        let arr = centros;
        // Restringir por scope geográfico si aplica
        if (scope?.nivel === 'municipal' && scope.municipio_id) {
            arr = arr.filter(c => c.municipio_id === scope.municipio_id);
        } else if (scope?.nivel === 'institucional' && scope.institucion_id) {
            arr = arr.filter(c => c.id === scope.institucion_id);
        }
        if (q) arr = arr.filter(c => c.nombre.toLowerCase().includes(q.toLowerCase()));
        return arr;
    }

    function _show(items) {
        dropdown.innerHTML = items.length
            ? items.map(i => `<li data-id="${i.id}" data-nombre="${i.nombre}">${i.nombre}</li>`).join('')
            : `<li class="mod-dd-empty">Sin resultados</li>`;
        dropdown.hidden = false;
    }

    input.addEventListener('focus', () => _show(_getAreas(input.value)));
    input.addEventListener('input', () => {
        if (typeof onChange === 'function') onChange(null);
        _show(_getAreas(input.value));
    });
    dropdown.addEventListener('click', e => {
        const li = e.target.closest('li[data-id]');
        if (!li) return;
        input.value = li.dataset.nombre;
        dropdown.hidden = true;
        if (typeof onChange === 'function') onChange({ id: Number(li.dataset.id), nombre: li.dataset.nombre });
    });
    document.addEventListener('click', e => {
        if (e.target !== input && !dropdown.contains(e.target)) dropdown.hidden = true;
    }, { capture: true });
}

window._getModeradorUser            = _getModeradorUser;
window._getModeradorNivel           = _getModeradorNivel;
window._getModeradorScope           = _getModeradorScope;
window._filtrarIndicacionesPorNivel = _filtrarIndicacionesPorNivel;
window._renderSelectorAreaSalud     = _renderSelectorAreaSalud;
