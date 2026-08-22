/* =========================================================
   laboratorio.js — Módulo de Laboratorio
   Tabs: Resumen · Pendientes · Muestras recibidas · Muestras rechazadas
   Estilo de pestañas unificado con epidemiología (pills)
   ========================================================= */

let _labUser = null;
let _labView = null;

async function renderLaboratorio(user, el) {
    if (typeof _hl_destroyCharts === 'function') _hl_destroyCharts();

    _labUser = user;

    const sb = typeof _client === 'function' ? _client() : null;
    if (sb) {
        try {
            const [
                rPerms, rInds, rIndEx, rRecs,
                rBaci, rCult, rXU, rXDR, rMfLed, rTbLam
            ] = await Promise.allSettled([
                sb.from('permisos_lab').select('*'),
                sb.from('indicaciones_examen').select('*'),
                sb.from('indicacion_examenes').select('*'),
                sb.from('recepciones_muestra').select('*'),
                sb.from('resultados_baciloscopia').select('*'),
                sb.from('resultados_cultivo').select('*'),
                sb.from('resultados_xpert_ultra').select('*'),
                sb.from('resultados_xpert_xdr').select('*'),
                sb.from('resultados_mf_led').select('*'),
                sb.from('resultados_tb_lam').select('*'),
            ]);
            const d = r => (r.status === 'fulfilled' && r.value.data) ? r.value.data : null;

            if (d(rPerms)) window._store.permisos_lab = d(rPerms);

            const inds  = d(rInds);
            const indEx = d(rIndEx) || [];
            if (inds) {
                window._store.indicaciones = inds.map(ind => ({
                    ...ind,
                    examenes_ids: (ind.examenes_ids && ind.examenes_ids.length)
                        ? ind.examenes_ids
                        : indEx
                            .filter(ie => ie.indicacion_id === ind.id)
                            .map(ie => ie.examen_id),
                }));
            }
            if (d(rRecs))    window._store.recepciones    = d(rRecs);
            if (d(rBaci))    window._store.res_baci        = d(rBaci);
            if (d(rCult))    window._store.res_cultivo     = d(rCult);
            if (d(rXU))      window._store.res_xpert_ultra = d(rXU);
            if (d(rXDR))     window._store.res_xpert_xdr   = d(rXDR);
            if (d(rMfLed))   window._store.res_mf_led      = d(rMfLed);
            if (d(rTbLam))   window._store.res_tb_lam      = d(rTbLam);
        } catch (e) {
            console.warn('renderLaboratorio: refresco Supabase falló —', e);
        }
    }

    const emitirIds        = _labsConPermiso(user.id, 'puede_emitir');
    const editarIds        = _labsConPermiso(user.id, 'puede_editar');
    const esLabStaff       = emitirIds.length > 0 || editarIds.length > 0
                           || _labsConPermiso(user.id, 'puede_eliminar').length > 0;
    const puedeRecibirAlgo = emitirIds.length > 0;

    const pendientes     = puedeRecibirAlgo ? _indicacionesPendientes(user.id) : [];
    const allRecepciones = esLabStaff ? _recepcionesDelLab(user.id) : [];
    const recepciones    = allRecepciones.filter(r => r.estado === 'recibida');
    const rechazadas     = allRecepciones.filter(r => r.estado === 'rechazada');

    const validViews = new Set();
    if (esLabStaff)        validViews.add('resumen');
    if (puedeRecibirAlgo)  validViews.add('pendientes');
    if (esLabStaff) {
        validViews.add('recibidas');
        validViews.add('rechazadas');
    }

    if (!_labView || !validViews.has(_labView)) {
        _labView = esLabStaff       ? 'resumen'
                 : puedeRecibirAlgo ? 'pendientes'
                 : null;
    }

    if (!_labView) {
        el.innerHTML = `
        <div class="modulo-header">
            <h2 class="modulo-title">Laboratorio</h2>
            <p class="modulo-sub">Módulo de gestión de muestras y resultados.</p>
        </div>
        <div class="modulo-placeholder">
            <i class="bi bi-eye"></i>
            <p>Acceso de observador — no tiene permisos de laboratorio asignados.<br>
            Contacte a un administrador para solicitar acceso activo.</p>
        </div>`;
        return;
    }

    /* ── Construir pestañas principales con el mismo estilo que epidemiología ── */
    const pills = [];

    if (esLabStaff) {
        pills.push(`
            <button class="lab-pill ${_labView === 'resumen' ? 'active' : ''}" data-view="resumen">
                <i class="bi bi-bar-chart-line"></i>
                <span>Resumen</span>
            </button>
        `);
    }

    if (puedeRecibirAlgo) {
        pills.push(`
            <button class="lab-pill ${_labView === 'pendientes' ? 'active' : ''}" data-view="pendientes">
                <i class="bi bi-inbox"></i>
                <span>Pendientes</span>
                ${pendientes.length ? `<span class="lab-pill-badge">${pendientes.length}</span>` : ''}
            </button>
        `);
    }

    if (esLabStaff) {
        pills.push(`
            <button class="lab-pill ${_labView === 'recibidas' ? 'active' : ''}" data-view="recibidas">
                <i class="bi bi-flask"></i>
                <span>Recibidas</span>
            </button>
        `);
        pills.push(`
            <button class="lab-pill ${_labView === 'rechazadas' ? 'active' : ''}" data-view="rechazadas">
                <i class="bi bi-x-circle"></i>
                <span>Rechazadas</span>
                ${rechazadas.length ? `<span class="lab-pill-badge">${rechazadas.length}</span>` : ''}
            </button>
        `);
    }

    /* Botón de refresco */
    const refreshButton = `
        <button class="lab-refresh-btn" id="tab-refresh" title="Actualizar datos desde el servidor">
            <i class="bi bi-arrow-clockwise"></i>
            <span>Actualizar</span>
        </button>
    `;

    el.innerHTML = `
    <div class="modulo-header">
        <h2 class="modulo-title">Laboratorio</h2>
        <p class="modulo-sub">Gestión de muestras y consulta de resultados.</p>
    </div>

    <div class="lab-pills-wrapper">
        <div class="lab-pills-container">
            ${pills.join('')}
        </div>
        ${refreshButton}
    </div>

    <div id="lab-tab-content"></div>`;

    /* ── Listeners de pestañas ── */
    el.querySelectorAll('.lab-pill[data-view]').forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            if (view === _labView) return;
            _labView = view;
            renderLaboratorio(user, el);
        });
    });

    document.getElementById('tab-refresh')?.addEventListener('click', async () => {
        const btn = document.getElementById('tab-refresh');
        if (btn) {
            btn.disabled = true;
            const icon = btn.querySelector('i');
            if (icon) icon.className = 'bi bi-hourglass-split';
        }
        await renderLaboratorio(user, el);
    });

    /* ── Routing de contenido ── */
    const content = document.getElementById('lab-tab-content');
    if      (_labView === 'resumen')     renderLabResumen(user, content);
    else if (_labView === 'pendientes')  _renderPendientes(pendientes, content, user, el, emitirIds);
    else if (_labView === 'rechazadas')  _renderRechazadas(rechazadas, content, user, el, emitirIds, editarIds);
    else                                 _renderRecibidas(recepciones, content, user, el, emitirIds, editarIds);
}
