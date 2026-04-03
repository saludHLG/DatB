/* =========================================================
   laboratorio.js — Módulo de Laboratorio
   Tabs: Resumen · Pendientes · Muestras recibidas · Muestras rechazadas
   ========================================================= */

let _labUser = null;
let _labView = null;

async function renderLaboratorio(user, el) {
    if (typeof _hl_destroyCharts === 'function') _hl_destroyCharts();

    _labUser = user;

    const sb = typeof _client === 'function' ? _client() : null;
    if (sb) {
        try {
            const [rPerms, rInds, rIndEx, rRecs, rBaci, rCult, rXU, rXDR] = await Promise.allSettled([
                sb.from('permisos_lab').select('*'),
                sb.from('indicaciones_examen').select('*'),
                sb.from('indicacion_examenes').select('*'),
                sb.from('recepciones_muestra').select('*'),
                sb.from('resultados_baciloscopia').select('*'),
                sb.from('resultados_cultivo').select('*'),
                sb.from('resultados_xpert_ultra').select('*'),
                sb.from('resultados_xpert_xdr').select('*'),
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
            if (d(rRecs)) window._store.recepciones    = d(rRecs);
            if (d(rBaci)) window._store.res_baci        = d(rBaci);
            if (d(rCult)) window._store.res_cultivo     = d(rCult);
            if (d(rXU))   window._store.res_xpert_ultra = d(rXU);
            if (d(rXDR))  window._store.res_xpert_xdr   = d(rXDR);
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

    /* ── Construir tabs: Resumen → Pendientes → Recibidas → Rechazadas ── */
    const tabs = [];

    if (esLabStaff)
        tabs.push(`<button class="lab-tab-btn${_labView === 'resumen' ? ' active' : ''}" id="tab-resumen">
            <i class="bi bi-bar-chart-line"></i><span class="tab-label"> Resumen</span>
        </button>`);

    if (puedeRecibirAlgo)
        tabs.push(`<button class="lab-tab-btn${_labView === 'pendientes' ? ' active' : ''}" id="tab-pend">
            <i class="bi bi-inbox"></i><span class="tab-label"> Pendientes</span>
            ${pendientes.length ? `<span class="lab-tab-badge">${pendientes.length}</span>` : ''}
        </button>`);

    if (esLabStaff) {
        tabs.push(`<button class="lab-tab-btn${_labView === 'recibidas' ? ' active' : ''}" id="tab-rec">
            <i class="bi bi-flask"></i><span class="tab-label"> Muestras recibidas</span>
        </button>`);
        tabs.push(`<button class="lab-tab-btn${_labView === 'rechazadas' ? ' active' : ''}" id="tab-rech">
            <i class="bi bi-x-circle"></i><span class="tab-label"> Muestras rechazadas</span>
            ${rechazadas.length ? `<span class="lab-tab-badge">${rechazadas.length}</span>` : ''}
        </button>`);
    }

    /* ── Botón de refresco separado del grupo de tabs ── */
    const btnRefresh = `<button class="lab-tab-btn" id="tab-refresh"
            title="Actualizar datos desde el servidor"
            style="opacity:.7;flex-shrink:0">
        <i class="bi bi-arrow-clockwise"></i><span class="tab-label"> Actualizar</span>
    </button>`;

    el.innerHTML = `
    <div class="modulo-header">
        <h2 class="modulo-title">Laboratorio</h2>
        <p class="modulo-sub">Gestión de muestras y consulta de resultados.</p>
    </div>
    <div style="display:flex;align-items:flex-start;gap:.5rem;margin-bottom:1.25rem;flex-wrap:wrap">
        <div class="lab-tabs" style="flex:1;min-width:0;margin-bottom:0">
            ${tabs.join('')}
        </div>
        ${btnRefresh}
    </div>
    <div id="lab-tab-content"></div>`;

    /* ── Listeners de tabs ── */
    if (esLabStaff)
        document.getElementById('tab-resumen')?.addEventListener('click',
            () => { _labView = 'resumen'; renderLaboratorio(user, el); });

    if (puedeRecibirAlgo)
        document.getElementById('tab-pend')?.addEventListener('click',
            () => { _labView = 'pendientes'; renderLaboratorio(user, el); });

    if (esLabStaff) {
        document.getElementById('tab-rec')?.addEventListener('click',
            () => { _labView = 'recibidas'; renderLaboratorio(user, el); });
        document.getElementById('tab-rech')?.addEventListener('click',
            () => { _labView = 'rechazadas'; renderLaboratorio(user, el); });
    }

    document.getElementById('tab-refresh')?.addEventListener('click', async () => {
        const btn = document.getElementById('tab-refresh');
        if (btn) { btn.disabled = true; btn.querySelector('i').className = 'bi bi-hourglass-split'; }
        await renderLaboratorio(user, el);
    });

    /* ── Routing de contenido ── */
    const content = document.getElementById('lab-tab-content');
    if      (_labView === 'resumen')     renderLabResumen(user, content);
    else if (_labView === 'pendientes')  _renderPendientes(pendientes, content, user, el, emitirIds);
    else if (_labView === 'rechazadas')  _renderRechazadas(rechazadas, content, user, el, emitirIds, editarIds);
    else                                 _renderRecibidas(recepciones, content, user, el, emitirIds, editarIds);
}
