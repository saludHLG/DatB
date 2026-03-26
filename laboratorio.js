/* =========================================================
   laboratorio.js — Módulo de Laboratorio
   Tabs: Pendientes · Muestras recibidas · Muestras rechazadas
         · Resumen de laboratorio (nuevo)
   ========================================================= */

let _labUser = null;
let _labView = null;

function renderLaboratorio(user, el) {
    /* Destruir gráficos del módulo anterior (p.ej. Home) */
    if (typeof _hl_destroyCharts === 'function') _hl_destroyCharts();

    _labUser = user;

    const emitirIds        = _labsConPermiso(user.id, 'puede_emitir');
    const editarIds        = _labsConPermiso(user.id, 'puede_editar');
    const esLabStaff       = emitirIds.length > 0 || editarIds.length > 0
                           || _labsConPermiso(user.id, 'puede_eliminar').length > 0;
    const puedeRecibirAlgo = emitirIds.length > 0;

    const pendientes     = puedeRecibirAlgo ? _indicacionesPendientes(user.id) : [];
    const allRecepciones = esLabStaff ? _recepcionesDelLab(user.id) : [];
    const recepciones    = allRecepciones.filter(r => r.estado === 'recibida');
    const rechazadas     = allRecepciones.filter(r => r.estado === 'rechazada');

    /* Determinar vistas disponibles */
    const validViews = new Set();
    if (puedeRecibirAlgo) validViews.add('pendientes');
    if (esLabStaff) {
        validViews.add('recibidas');
        validViews.add('rechazadas');
        validViews.add('resumen');     /* ← nuevo */
    }

    if (!_labView || !validViews.has(_labView)) {
        _labView = puedeRecibirAlgo ? 'pendientes'
                 : esLabStaff       ? 'recibidas'
                 : null;
    }

    /* Usuarios observadores (moderadores/admins sin permisos de lab) */
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

    /* Construir tabs */
    const tabs = [];

    if (puedeRecibirAlgo)
        tabs.push(`<button class="lab-tab-btn${_labView === 'pendientes' ? ' active' : ''}"
                           id="tab-pend">
            <i class="bi bi-inbox"></i><span class="tab-label"> Pendientes</span>
            ${pendientes.length ? `<span class="lab-tab-badge">${pendientes.length}</span>` : ''}
        </button>`);

    if (esLabStaff) {
        tabs.push(`<button class="lab-tab-btn${_labView === 'recibidas' ? ' active' : ''}"
                           id="tab-rec">
            <i class="bi bi-flask"></i><span class="tab-label"> Muestras recibidas</span>
        </button>`);

        tabs.push(`<button class="lab-tab-btn${_labView === 'rechazadas' ? ' active' : ''}"
                           id="tab-rech">
            <i class="bi bi-x-circle"></i><span class="tab-label"> Muestras rechazadas</span>
            ${rechazadas.length ? `<span class="lab-tab-badge">${rechazadas.length}</span>` : ''}
        </button>`);

        tabs.push(`<button class="lab-tab-btn${_labView === 'resumen' ? ' active' : ''}"
                           id="tab-resumen">
            <i class="bi bi-bar-chart-line"></i><span class="tab-label"> Resumen</span>
        </button>`);
    }

    el.innerHTML = `
    <div class="modulo-header">
        <h2 class="modulo-title">Laboratorio</h2>
        <p class="modulo-sub">Gestión de muestras y consulta de resultados.</p>
    </div>
    <div class="lab-tabs">${tabs.join('')}</div>
    <div id="lab-tab-content"></div>`;

    /* Listeners de tabs */
    if (puedeRecibirAlgo)
        document.getElementById('tab-pend')?.addEventListener('click',
            () => { _labView = 'pendientes'; renderLaboratorio(user, el); });

    if (esLabStaff) {
        document.getElementById('tab-rec')?.addEventListener('click',
            () => { _labView = 'recibidas'; renderLaboratorio(user, el); });

        document.getElementById('tab-rech')?.addEventListener('click',
            () => { _labView = 'rechazadas'; renderLaboratorio(user, el); });

        document.getElementById('tab-resumen')?.addEventListener('click',
            () => { _labView = 'resumen'; renderLaboratorio(user, el); });
    }

    /* Routing de contenido */
    const content = document.getElementById('lab-tab-content');
    if      (_labView === 'pendientes')  _renderPendientes(pendientes, content, user, el, emitirIds);
    else if (_labView === 'rechazadas')  _renderRechazadas(rechazadas, content, user, el, emitirIds, editarIds);
    else if (_labView === 'resumen')     renderLabResumen(user, content);
    else                                 _renderRecibidas(recepciones, content, user, el, emitirIds, editarIds);
}
