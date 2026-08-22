/* =========================================================
   moderadores_core.js — Núcleo de funciones para moderadores

   Regla de visibilidad:
   La indicación es visible para un moderador si:
     • INSTITUCIONAL : el usuario que indicó pertenece al centro del mod.
     • MUNICIPAL     : el usuario que indicó O el paciente pertenecen
                       al municipio del mod.
     • PROVINCIAL    : ídem, a escala de provincia (derivada del mun.).
     • NACIONAL      : todo.

   NO se usa el laboratorio como criterio de ámbito geográfico.
   El laboratorio es donde se analiza la muestra, no donde se genera
   la notificación epidemiológica.

   Provee además:
     _getModeradorScope()             → objeto con nivel + ids fijos
     _getModeradorGeoContext(ind)     → { reqCentroId, reqMunId, reqProvId,
                                          pacMunId, pacProvId }
     _filtrarIndicacionesPorNivel()   → filtro principal
     _renderSelectorAreaSalud()       → widget para formulario de indicación

   Requiere: utils.js, laboratorio_core.js (cargados antes)
   ========================================================= */

/* ── Usuario activo ──────────────────────────────────────── */
function _getModeradorUser() {
    const uid = sessionStorage.getItem('sr_active_user') || window._store?.active_user;
    return (window._store?.usuarios || []).find(u => u.id === uid) || null;
}

/* ── Nivel del moderador ─────────────────────────────────── */
function _getModeradorNivel() {
    const u = _getModeradorUser();
    if (!u) return null;
    const map = { 2:'institucional', 3:'municipal', 4:'provincial', 5:'nacional', 6:'nacional' };
    return map[u.rol_sistema_id] || null;
}

/* ── Scope del moderador ─────────────────────────────────── */
function _getModeradorScope() {
    const u = _getModeradorUser();
    if (!u) return null;
    const nivel = _getModeradorNivel();
    if (!nivel) return null;

    // Derivar provincia_id desde municipio si no está explícita
    let provId = u.provincia_id ? Number(u.provincia_id) : null;
    if (!provId && u.municipio_id) {
        const mun = (window._store?.geo_municipios || []).find(m => m.id === Number(u.municipio_id));
        provId = mun?.provincia_id ? Number(mun.provincia_id) : null;
    }

    return {
        nivel,
        provincia_id:   provId,
        municipio_id:   u.municipio_id    ? Number(u.municipio_id)    : null,
        institucion_id: u.centro_salud_id ? Number(u.centro_salud_id) : null,
    };
}

/* ── Contexto geográfico de una indicación ───────────────── *
 * Devuelve los IDs de centro solicitante, municipio/provincia
 * del solicitante y municipio/provincia del paciente.
 * Estos son los dos ejes sobre los que se decide la visibilidad.
 */
function _getModeradorGeoContext(ind) {
    const users = window._store?.usuarios       || [];
    const pacs  = window._store?.pacientes      || [];
    const muns  = window._store?.geo_municipios || [];

    const indicador = users.find(u => u.id === ind.indicado_por) || null;
    const pac       = pacs.find(p => p.id === ind.paciente_id)   || null;

    // Centro que solicita (donde se genera la indicación)
    const reqCentroId = indicador?.centro_salud_id ? Number(indicador.centro_salud_id) : null;

    // Municipio y provincia del solicitante
    const reqMunId  = indicador?.municipio_id ? Number(indicador.municipio_id) : null;
    const reqMun    = reqMunId ? muns.find(m => m.id === reqMunId) : null;
    const reqProvId = reqMun?.provincia_id
        ? Number(reqMun.provincia_id)
        : (indicador?.provincia_id ? Number(indicador.provincia_id) : null);

    // Municipio y provincia del paciente
    const pacMunId  = pac?.municipio_id ? Number(pac.municipio_id) : null;
    const pacMun    = pacMunId ? muns.find(m => m.id === pacMunId) : null;
    const pacProvId = pacMun?.provincia_id ? Number(pacMun.provincia_id) : null;

    return { reqCentroId, reqMunId, reqProvId, pacMunId, pacProvId };
}

/* ── Filtrado de indicaciones por nivel ──────────────────── */
function _filtrarIndicacionesPorNivel(indicaciones) {
    const scope = _getModeradorScope();
    if (!scope) return indicaciones;
    if (scope.nivel === 'nacional') return indicaciones;

    return indicaciones.filter(ind => {
        const ctx = _getModeradorGeoContext(ind);

        if (scope.nivel === 'institucional') {
            // Solo las indicaciones cuyo solicitante pertenece a este centro
            return ctx.reqCentroId === scope.institucion_id;
        }

        if (scope.nivel === 'municipal') {
            // El solicitante O el paciente pertenecen al municipio
            return ctx.reqMunId === scope.municipio_id
                || ctx.pacMunId === scope.municipio_id;
        }

        if (scope.nivel === 'provincial') {
            // El solicitante O el paciente pertenecen a la provincia
            return ctx.reqProvId === scope.provincia_id
                || ctx.pacProvId === scope.provincia_id;
        }

        return false;
    });
}

/* ── Selector de Área de salud (formulario de indicación) ── */
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
        if (scope?.nivel === 'municipal' && scope.municipio_id)
            arr = arr.filter(c => c.municipio_id === scope.municipio_id);
        else if (scope?.nivel === 'institucional' && scope.institucion_id)
            arr = arr.filter(c => c.id === scope.institucion_id);
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
    input.addEventListener('input', () => { if (typeof onChange === 'function') onChange(null); _show(_getAreas(input.value)); });
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
window._getModeradorGeoContext      = _getModeradorGeoContext;
window._filtrarIndicacionesPorNivel = _filtrarIndicacionesPorNivel;
window._renderSelectorAreaSalud     = _renderSelectorAreaSalud;
